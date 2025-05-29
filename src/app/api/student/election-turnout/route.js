import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { College, ElectionStatus, AuditActorType, AuditLogStatus, } from "@prisma/client";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: "Forbidden: Student access only." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get('electionId');
  const studentCollege = session.user.college; // Student's own college for specific CSC turnout

  if (!electionId) {
    return NextResponse.json({ error: "Election ID is required." }, { status: 400 });
  }

  try {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) {
      return NextResponse.json({ error: "Election not found." }, { status: 404 });
    }

    // consider elections that are ONGOING or recently ENDED.
    // If it's UPCOMING, turnout will be 0.
    if (election.status === ElectionStatus.ARCHIVED || election.status === ElectionStatus.PAUSED) {
        return NextResponse.json({ message: `Turnout data is not available for elections with status: ${election.status}.` }, { status: 200 });
    }

    // 1. Get total number of students (overall and per college)
    const allColleges = Object.values(College); // Get all college enum values
    
    const totalStudentsOverall = await prisma.student.count();
    const studentCountsByCollegePromises = allColleges.map(college =>
      prisma.student.count({ where: { college: college } })
    );
    const studentCountsByCollegeResults = await Promise.all(studentCountsByCollegePromises);
    
    const totalStudentsByCollege = {};
    allColleges.forEach((college, index) => {
      totalStudentsByCollege[college] = studentCountsByCollegeResults[index];
    });

    // 2. Get counts of students who voted in this election (overall and per college)
    // This counts distinct students who have a record in StudentElectionVote for this election
    const totalVotedOverall = await prisma.studentElectionVote.count({
      where: { electionId: electionId },
    });

    const votedCountsByCollegePromises = allColleges.map(college =>
      prisma.studentElectionVote.count({
        where: {
          electionId: electionId,
          student: { // Filter by the student's college
            college: college,
          },
        },
      })
    );
    const votedCountsByCollegeResults = await Promise.all(votedCountsByCollegePromises);
    const votedStudentsByCollege = {};
    allColleges.forEach((college, index) => {
      votedStudentsByCollege[college] = votedCountsByCollegeResults[index];
    });

    // 3. Calculate Turnout Data
    const overallUscTurnout = {
      voted: totalVotedOverall,
      total: totalStudentsOverall,
      percentage: totalStudentsOverall > 0 ? parseFloat(((totalVotedOverall / totalStudentsOverall) * 100).toFixed(1)) : 0,
    };

    const uscTurnoutByCollege = allColleges.map(college => ({
      college: college,
      voted: votedStudentsByCollege[college] || 0,
      total: totalStudentsByCollege[college] || 0,
      percentage: (totalStudentsByCollege[college] || 0) > 0 
                    ? parseFloat(((votedStudentsByCollege[college] || 0) / (totalStudentsByCollege[college] || 1) * 100).toFixed(1)) 
                    : 0,
    }));

    let specificCscTurnout = null;
    if (studentCollege && totalStudentsByCollege[studentCollege] !== undefined) {
      specificCscTurnout = {
        college: studentCollege,
        voted: votedStudentsByCollege[studentCollege] || 0,
        total: totalStudentsByCollege[studentCollege] || 0,
        percentage: (totalStudentsByCollege[studentCollege] || 0) > 0
                      ? parseFloat(((votedStudentsByCollege[studentCollege] || 0) / (totalStudentsByCollege[studentCollege] || 1) * 100).toFixed(1))
                      : 0,
      };
    }

    return NextResponse.json({
      electionId: election.id,
      electionName: election.name,
      overallUscTurnout,
      uscTurnoutByCollege,
      specificCscTurnout,
      lastUpdated: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching election turnout:", error);
    return NextResponse.json({ error: "Failed to retrieve election turnout data." }, { status: 500 });
  }
}