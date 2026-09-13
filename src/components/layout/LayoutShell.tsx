'use client';

import Sidebar from './Sidebar';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-background transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 w-full md:pl-64 overflow-x-hidden p-4 sm:p-6 lg:p-10">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
