import { Geist, Geist_Mono } from "next/font/google";
import 'bootstrap/dist/css/bootstrap.css';
import "./global.css";
import BootstrapClient from '@/components/BootstrapClient.js';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "sELECT",
  description: "Software for Evaluation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="apple-mobile-web-app-title" content="sELECT" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} logo-font`}>
        {children}
        <BootstrapClient />
      </body>
    </html>
  );
}
