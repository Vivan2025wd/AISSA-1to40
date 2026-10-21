import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Sinhala } from "next/font/google";
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
  /* Resolves relative URLs for OG images and links */
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),

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

  /* Prevent iOS Safari from auto-linking phone numbers, addresses, and
     emails inside exam question text or explanations */
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },

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
    apple: "/apple-touch-icon.png",
  },

  /* Enables "Add to Home Screen" on iOS with proper title + status bar */
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "O/L Science Quiz",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // allow pinch-zoom for accessibility

  /* We don't ship a dark mode — prevent iOS from auto-transforming
     form inputs into an inverted scheme */
  colorScheme: "light",

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
      <body className="flex min-h-dvh flex-col overflow-x-hidden bg-slate-50 text-slate-800 antialiased selection:bg-sky-200 selection:text-slate-900">
        {children}
      </body>
    </html>
  );
}