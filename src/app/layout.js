import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "react-loading-skeleton/dist/skeleton.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { cookies } from "next/headers";
import { verifyToken } from "../lib/auth";

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

export default async function RootLayout({ children }) {
  let initialUser = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        initialUser = decoded.username || null;
      }
    }
  } catch (e) {
    console.error("Token verification failed", e);
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950">
        <AuthProvider initialUser={initialUser}>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
