'use client';

import { useOnboardingProgress } from '@/features/onboarding/hooks/useOnboardingProgress';
import { CheckCircle2, Circle, ArrowRight, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingProgress() {
    const { tasks, progress, completedCount } = useOnboardingProgress();

    // Hide if complete
    if (progress === 100) return null;

    return (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Trophy className="text-yellow-300" size={24} />
                        Get Started
                    </h3>
                    <p className="text-blue-100 text-sm">Complete these steps to unlock full potential.</p>
                </div>
                <div className="flex items-center gap-2 font-mono font-bold bg-white/10 px-3 py-1 rounded-full">
                    {completedCount} / {tasks.length} Steps
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 bg-black/20 rounded-full mb-6 overflow-hidden">
                <div
                    className="h-full bg-white shadow-sm transition-all duration-1000 ease-out rounded-full relative"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute inset-0 bg-white/30 w-full h-full animate-pulse-slow"></div>
                </div>
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tasks.map(task => (
                    <Link
                        key={task.id}
                        href={task.href || '#'}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${task.done
                            ? 'bg-white/10 text-blue-50 cursor-default'
                            : 'bg-white text-blue-900 hover:scale-[1.02] shadow-sm font-semibold'
                            }`}
                    >
                        {task.done ? (
                            <CheckCircle2 size={20} className="text-green-300 shrink-0" />
                        ) : (
                            <Circle size={20} className="text-blue-200 shrink-0" />
                        )}
                        <span className="text-sm flex-1">{task.label}</span>
                        {!task.done && <ArrowRight size={16} className="opacity-50" />}
                    </Link>
                ))}
            </div>
        </div>
    );
}
