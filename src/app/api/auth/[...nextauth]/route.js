      
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient, AdminRole } from "@prisma/client";
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

                const normalizedEmail = credentials.email.toLowerCase();

        const student = await prisma.student.findUnique({
          where: { email: normalizedEmail },
        });

        if (!student) {
          console.log("Student not found:", normalizedEmail);
          return null; // User not found
        }

         // **NEW CHECKS FOR LOGIN AFTER SIGN-UP**
        if (!student.password) {
          console.log("Student login attempt for unactivated account (no password):", normalizedEmail);
          // You might want to throw a specific error message here if `signIn` `redirect:false` can catch it.
          // For now, just failing to authorize will show the generic login error.
          // A better UX would guide them to complete sign-up.
          throw new Error("Account not fully set up. Please complete the sign-up process or check your email for verification.");
          // return null;
        }
        if (!student.emailVerified) {
          console.log("Student login attempt for unverified email:", normalizedEmail);
          throw new Error("Email not verified. Please check your email for a verification link/code or restart sign-up.");
          // return null;
        }
        // **END NEW CHECKS**

        // Check if password matches
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          student.password // The hashed password from DB
        );

        if (!passwordMatch) {
          console.log("Student password mismatch for:", normalizedEmail);
          return null; // Incorrect password
        }

        console.log("Student authorized:", student.email);
        // Return user object (must include at least 'id', 'email')
        return {
          id: student.id,
          email: student.email,
          firstName: student.firstName, // Add custom fields needed in session/token
          lastName: student.lastName,
          college: student.college,
          role: "STUDENT", // Add a role identifier for students
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

        const normalizedCredential = credentials.email.toLowerCase();

        const admin = await prisma.admin.findUnique({
          where: { email: normalizedCredential },
        });

        if (!admin) {
          console.log("Admin not found:", normalizedCredential);
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
        // Return user object
        return {
          id: admin.id,
          email: admin.email,
          role: admin.role, // e.g., SUPER_ADMIN, MODERATOR, AUDITOR
          college: admin.college, // Include college for moderators
        };
      },
    }),
  ],
  session: {
    strategy: "jwt", // Use JSON Web Tokens for sessions (good for serverless)
  },
  callbacks: {
    // Include user data in the JWT
    async jwt({ token, user, account, profile, isNewUser }) {
       // The 'user' object comes from the authorize function on initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role; // Role from authorize (STUDENT, SUPER_ADMIN, etc.)
        token.college = user.college; // College from authorize (for students and moderators)
        token.firstName = user.firstName; // Include student first name
      }
      return token;
    },
    // Make user data available client-side via useSession()
    async session({ session, token, user }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.college = token.college;
        session.user.firstName = token.firstName; // Add first name to session
      }
      return session;
    },
  },
  pages: {
    signIn: '/', // Redirect users to role selection page if sign in is required
    // error: '/auth/error', // Optional: Custom error page
  },
  secret: process.env.AUTH_SECRET, // Use the secret from .env
  debug: process.env.NODE_ENV === "development", // Enable debug logs in development
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; // Export handlers for GET and POST requests