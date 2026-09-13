'use client';

/**
 * Main Layout Shell
 * 
 * Why this exists:
 * Wraps all application routes with the persistent navigation sidebar and responsive main content area.
 * 
 * Tricky logic:
 * - The `md:pl-64` sidebar offset is placed on an outer layout wrapper div rather than `<main>`.
 *   This ensures that responsive padding utilities on `<main>` (e.g., `lg:p-10`) do not override
 *   the 256px sidebar allowance at viewport breakpoints >= 1024px and 1280px (Finding 8).
 */

import Sidebar from './Sidebar';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-background transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 md:pl-64">
                <main className="flex-1 w-full overflow-x-hidden p-4 sm:p-6 lg:p-10">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
