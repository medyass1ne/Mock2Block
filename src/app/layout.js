import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Mock2Block | Instant AI Mock API Generator",
  description:
    "Visually design, test, and deploy stateful mock APIs in seconds. Features AI schema generation, Chaos Mode error injection, JWT auth simulation, ER diagram visualization, and instant cloud deployments.",
  keywords: [
    "mock api",
    "api generator",
    "nextjs",
    "developer tools",
    "rest api testing",
    "dummy data",
    "mock server",
    "api builder",
    "faker",
    "openapi",
    "postman",
  ],
  authors: [{ name: "Yessin", url: "https://github.com/medyass1ne" }],
  icons: {
    icon: "/favicon.ico",
  },
  verification: {
    google: "google-site-verification-code",
  },
  openGraph: {
    title: "Mock2Block | Instant AI Mock API Generator",
    description:
      "Visually design, test, and deploy stateful mock APIs in seconds. Features AI schema generation, JWT auth simulation, and instant cloud deployments.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://mock2block.vercel.app",
    siteName: "Mock2Block",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://mock2block.vercel.app"}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Mock2Block — Instant AI Mock API Generator",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mock2Block | Instant AI Mock API Generator",
    description:
      "Visually design, test, and deploy stateful mock APIs in seconds.",
    images: [
      `${process.env.NEXT_PUBLIC_BASE_URL || "https://mock2block.vercel.app"}/og-image.png`,
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
