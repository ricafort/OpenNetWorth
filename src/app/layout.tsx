import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { ThemeProvider } from "@/contexts/ThemeContext";
import OnboardingTour from "@/components/OnboardingTour";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import DemoBanner from "@/components/DemoBanner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ClearWorth | Net Worth Tracker & Financial Dashboard',
  description: 'Track your assets, liabilities, and net worth progress with privacy-first analytics.',
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
            <DashboardProvider>
              <DemoBanner />
              <LayoutShell>
                <OnboardingTour />
                {children}
              </LayoutShell>
            </DashboardProvider>
          </OnboardingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
