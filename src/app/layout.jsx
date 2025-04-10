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
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="manifest" href="/manifest.json" />
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
