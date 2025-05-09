import { PrismaClient, AdminRole, College } from "@prisma/client";
import bcrypt from "bcrypt";
import fs from "fs"; // Node.js File System module
import path from "path"; // Node.js Path module
import { parse } from "csv-parse/sync"; // Use synchronous parsing for simplicity in

const prisma = new PrismaClient();
const roundsOfHashing = 10;

// Helper to map string college names from CSV to Prisma College enum
// Ensure the strings in your CSV exactly match the keys here.
function mapCollegeStringToEnum(collegeString: string): College | undefined {
  const upperCaseCollegeString = collegeString.toUpperCase();
  if (Object.values(College).includes(upperCaseCollegeString as College)) {
    return upperCaseCollegeString as College;
  }
  console.warn(
    `Warning: Unknown college string '${collegeString}' found in CSV. Skipping this student or assign a default.`
  );
  return undefined; // Or handle as an error, or assign a default
}

async function main() {
  console.log(`Start seeding ...`);

  // === Seed Admins ===
  const passwordSuperAdmin = await bcrypt.hash(
    "sa.select2025",
    roundsOfHashing
  );
  const superAdmin = await prisma.admin.upsert({
    where: { email: "superadmin.select@s-elect.app" },
    update: {},
    create: {
      email: "superadmin.select@s-elect.app",
      password: passwordSuperAdmin,
      role: AdminRole.SUPER_ADMIN,
    },
  });
  console.log(`Created/updated super admin with email: ${superAdmin.email}`);

  const passwordAuditor = await bcrypt.hash(
    "audit.select2025",
    roundsOfHashing
  );
  const auditor = await prisma.admin.upsert({
    where: { email: "audit.select@s-elect.app" },
    update: {},
    create: {
      email: "audit.select@s-elect.app",
      password: passwordAuditor,
      role: AdminRole.AUDITOR,
    },
  });
  console.log(`Created/updated auditor with email: ${auditor.email}`);

  const passwordCictMod = await bcrypt.hash(
    "cictmod.select2025",
    roundsOfHashing
  );
  const CictMod = await prisma.admin.upsert({
    where: { email: "cict.mod@s-elect.app" },
    update: {},
    create: {
      email: "cict.mod@s-elect.app",
      password: passwordCictMod,
      role: AdminRole.MODERATOR,
      college: College.CICT,
    },
  });
  console.log(`Created/updated cict moderator with email: ${CictMod.email}`);

  // Seed Moderators (one per college)
  const colleges = Object.values(College);
  for (const college of colleges) {
    const moderatorEmail = `${college.toLowerCase()}.mod.select25@gmail.com`;
    const passwordModerator = await bcrypt.hash(
      `${college.toLowerCase()}.modselect2025`,
      roundsOfHashing
    ); // Simple predictable password for seeding
    const moderator = await prisma.admin.upsert({
      where: { email: moderatorEmail },
      update: {},
      create: {
        email: moderatorEmail,
        password: passwordModerator,
        role: AdminRole.MODERATOR,
        college: college, // Assign college to moderator
      },
    });
    console.log(
      `Created/updated ${college} moderator with email: ${moderator.email}`
    );
  }

  // === Seed Pre-approved Students from CSV ===
  console.log(`Starting to seed pre-approved students from CSV...`);
  const csvFilePath = path.join(__dirname, "preapproved_students.csv"); // Path to your CSV file

  try {
    if (!fs.existsSync(csvFilePath)) {
      console.error(`Error: CSV file not found at ${csvFilePath}`);
      console.log(
        `Please create 'prisma/preapproved_students.csv' with student data.`
      );
      return; // Exit student seeding if file not found
    }

    const fileContent = fs.readFileSync(csvFilePath, { encoding: "utf-8" });
    const records = parse(fileContent, {
      columns: true, // Use the first row as column headers
      skip_empty_lines: true,
      trim: true,
    });

    let seededCount = 0;
    let skippedCount = 0;

    for (const record of records) {
      // Validate essential fields (e.g., email, college)
      if (
        !record.email ||
        !record.firstName ||
        !record.lastName ||
        !record.college
      ) {
        console.warn(
          `Skipping record due to missing essential data: ${JSON.stringify(
            record
          )}`
        );
        skippedCount++;
        continue;
      }

      const collegeEnum = mapCollegeStringToEnum(record.college);
      if (!collegeEnum) {
        // mapCollegeStringToEnum already logged a warning
        skippedCount++;
        continue;
      }

      try {
        await prisma.student.upsert({
          where: { email: record.email.toLowerCase().trim() }, // Normalize email
          update: {
            // If student exists, update these fields
            firstName: record.firstName.trim(),
            lastName: record.lastName.trim(),
            middleName: record.middleName ? record.middleName.trim() : null,
            college: collegeEnum,
            isPreApproved: true,
            // enrollmentDate: new Date(), // Or parse from CSV if you have it
            // Reset password and verification if re-seeding an existing entry
            // to allow them to go through signup again if needed.
            // Or, only update if !student.password (i.e., they haven't signed up yet)
            // For simplicity, this upsert will overwrite existing non-password data.
          },
          create: {
            firstName: record.firstName.trim(),
            lastName: record.lastName.trim(),
            middleName: record.middleName ? record.middleName.trim() : null,
            email: record.email.toLowerCase().trim(), // Normalize email
            college: collegeEnum,
            isPreApproved: true,
            // password will be null by default as per schema
            // enrollmentDate: new Date(), // Or parse from CSV
          },
        });
        seededCount++;
      } catch (e) {
        console.error(`Error seeding student ${record.email}:`, e);
        skippedCount++;
      }
    }
    console.log(
      `Finished seeding students. Seeded: ${seededCount}, Skipped: ${skippedCount}.`
    );
  } catch (error) {
    console.error(
      "Failed to read or parse CSV file for student seeding:",
      error
    );
  }

  console.log(`Seeding finished.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
