// src/app/api/auth/[...nextauth]/route.js
      
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      // Provider for Students
      id: "student-credentials",
      name: "Student Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "juan.delacruz@wvsu.edu.ph" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing student credentials");
          return null;
        }

        // 1. Normalize the input email to lowercase
        const normalizedEmail = credentials.email.toLowerCase();

        const student = await prisma.student.findUnique({
          // 2. Query using the normalized email
          where: { email: normalizedEmail },
        });

        if (!student) {
          console.log("Student not found with normalized email:", normalizedEmail);
          return null; // User not found
        }

        if (!student.password) {
          console.log("Student login attempt for unactivated account (no password):", normalizedEmail);
          throw new Error("Account not fully set up. Please complete the sign-up process or check your email for verification.");
        }
        if (!student.emailVerified) {
          console.log("Student login attempt for unverified email:", normalizedEmail);
          throw new Error("Email not verified. Please check your email for a verification link/code or restart sign-up.");
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          student.password
        );

        if (!passwordMatch) {
          console.log("Student password mismatch for:", normalizedEmail);
          return null; // Incorrect password
        }

        console.log("Student authorized:", student.email);
        return {
          id: student.id,
          email: student.email, // Return the stored (ideally already lowercase) email
          firstName: student.firstName,
          lastName: student.lastName,
          college: student.college,
          role: "STUDENT",
        };
      },
    }),
    CredentialsProvider({
      // Provider for Admins
      id: "admin-credentials",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "admin@select.wvsu.edu.ph" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing admin credentials");
          return null;
        }

        // 1. Normalize the input email/credential to lowercase
        const normalizedCredential = credentials.email.toLowerCase(); // Assuming admin credential is email

        const admin = await prisma.admin.findUnique({
          // 2. Query using the normalized credential
          where: { email: normalizedCredential },
        });

        if (!admin) {
          console.log("Admin not found with normalized credential:", normalizedCredential);
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          admin.password
        );

        if (!passwordMatch) {
          console.log("Admin password mismatch for:", normalizedCredential);
          return null;
        }

        console.log("Admin authorized:", admin.email, "Role:", admin.role);
        return {
          id: admin.id,
          email: admin.email, // Return the stored (ideally already lowercase) email
          role: admin.role,
          college: admin.college,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.college = user.college;
        token.firstName = user.firstName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.college = token.college;
        session.user.firstName = token.firstName;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };