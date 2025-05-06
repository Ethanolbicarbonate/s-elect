"use client"; // This component needs to be a Client Component

import { SessionProvider } from "next-auth/react";

export default function AuthProvider({ children }) {
  // You could fetch the session here initially if needed, but SessionProvider handles it
  return <SessionProvider>{children}</SessionProvider>;
}