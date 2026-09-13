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
  title: 'OpenNetWorth | 100% Private, Local-First Financial Control Room',
  description: 'Open-source personal net worth tracker and financial manager. 100% on-device storage powered by Local LLMs.',
  openGraph: {
    title: 'OpenNetWorth | Private & Local-First Financial Control Room',
    description: 'Open-source personal net worth tracker and financial manager. Zero cloud telemetry.',
    url: 'https://opennetworth.org',
    siteName: 'OpenNetWorth',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'OpenNetWorth Dashboard Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenNetWorth | Private & Local-First Financial Control Room',
    description: 'Track your wealth and debt payoff 100% on-device with Local LLMs.',
    images: ['/og-image.jpg'],
  },
  metadataBase: new URL('http://localhost:4000'),
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
