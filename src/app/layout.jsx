import { Geist, Geist_Mono } from "next/font/google";
import 'bootstrap/dist/css/bootstrap.css';
import "./global.css";
import BootstrapClient from '@/components/BootstrapClient.js';
import { Analytics } from '@vercel/analytics/next';

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
  themeColor: "#ffffff",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "sELECT"
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          href="/icon?<generated>"
          type="image/<generated>"
          sizes="<generated>"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-icon?<generated>"
          type="image/<generated>"
          sizes="<generated>"
        />
        <style>
          {`
            @media (display-mode: standalone) {
              body {
                background-color: #ffffff;
              }
              /* Prevent flash of unstyled content */
              body:not(:defined) {
                display: none;
              }
            }
          `}
        </style>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} logo-font`}>
        {children}
        <BootstrapClient />
        <Analytics />
      </body>
    </html>
  );
}
