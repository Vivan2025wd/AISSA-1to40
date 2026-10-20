import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Sinhala } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

/* ------------------------------------------------------------------ */
/*  Fonts                                                             */
/* ------------------------------------------------------------------ */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const notoSinhala = Noto_Sans_Sinhala({
  variable: "--font-sinhala",
  subsets: ["sinhala"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* ------------------------------------------------------------------ */
/*  Metadata                                                          */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: {
    default: "O/L Science Quiz | Sri Lanka",
    template: "%s · O/L Science Quiz",
  },
  description:
    "Free online Science quiz platform for Sri Lankan O/L students. Compete island-wide, take timed exams in Sinhala or English, and review every question.",
  keywords: [
    "O/L",
    "Science",
    "Sri Lanka",
    "Quiz",
    "Online Exam",
    "සාමාන්‍ය පෙළ",
    "විද්‍යාව",
  ],
  applicationName: "O/L Science Quiz",
  authors: [{ name: "O/L Science Quiz" }],
  openGraph: {
    title: "O/L Science Quiz",
    description:
      "Compete with students island-wide on timed Science quizzes. Free forever.",
    siteName: "O/L Science Quiz",
    type: "website",
    locale: "en_LK",
  },
  twitter: {
    card: "summary",
    title: "O/L Science Quiz",
    description: "Free O/L Science quizzes for Sri Lankan students.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,          // allow pinch-zoom for accessibility
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0284c7" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Root layout                                                       */
/* ------------------------------------------------------------------ */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSinhala.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-white text-slate-800 selection:bg-sky-200 selection:text-slate-900">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}