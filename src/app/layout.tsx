import type { Metadata } from "next";
import React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/layout/LayoutShell";
import { ThemeProvider } from "@/contexts/ThemeContext";
import OnboardingTour from "@/features/onboarding/components/OnboardingTour";
import { OnboardingProvider } from "@/features/onboarding/context/OnboardingContext";
import { DashboardProvider } from "@/features/dashboard/context/DashboardContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import DemoBanner from "@/components/layout/DemoBanner";
import QueryProvider from "@/components/providers/QueryProvider";

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

import GlobalPrivacyBanner from "@/components/layout/GlobalPrivacyBanner";
import { getSupportStatus } from "@/features/privacy/actions";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supportStatus = await getSupportStatus();
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <QueryProvider>
          <ThemeProvider>
            <OnboardingProvider>
              <React.Suspense fallback={null}>
                <ProfileProvider>
                  <DashboardProvider>
                    <GlobalPrivacyBanner active={supportStatus.active} />
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
        </QueryProvider>
      </body>
    </html>
  );
}
