import type { Metadata } from "next";
import React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { ThemeProvider } from "@/contexts/ThemeContext";
import OnboardingTour from "@/components/OnboardingTour";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import DemoBanner from "@/components/DemoBanner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ClearWorth | Net Worth Tracker & Financial Dashboard',
  description: 'Track your assets, liabilities, and net worth progress with privacy-first analytics.',
  openGraph: {
    title: 'ClearWorth | Net Worth Tracker',
    description: 'Track your assets, liabilities, and net worth progress with privacy-first analytics.',
    url: 'https://clearworth.wisdomwits.com',
    siteName: 'ClearWorth',
    images: [
      {
        url: '/og-image.jpg', // Placeholder - user should create this
        width: 1200,
        height: 630,
        alt: 'ClearWorth Dashboard Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClearWorth | Net Worth Tracker',
    description: 'Track your assets, liabilities, and net worth progress with privacy-first analytics.',
    images: ['/og-image.jpg'], // Placeholder
  },
  metadataBase: new URL('https://clearworth.wisdomwits.com'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <OnboardingProvider>
            <React.Suspense fallback={null}>
              <ProfileProvider>
                <DashboardProvider>
                  <DemoBanner />
                  <LayoutShell>
                    <OnboardingTour />
                    {children}
                  </LayoutShell>
                </DashboardProvider>
              </ProfileProvider>
            </React.Suspense>
          </OnboardingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
