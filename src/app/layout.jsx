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
  manifest: "/manifest.json",
  themeColor: "#ffffff",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "sELECT",
    startupImage: [
      {
        url: "/apple-icon.png"
      }
    ]
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="sELECT" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" href="/icon1.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} logo-font`}>
        {children}
        <BootstrapClient />
        <Analytics />
      </body>
    </html>
  );
}
