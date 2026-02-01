
// src/components/ConcentrationWarning.tsx
import { AlertTriangle } from 'lucide-react';

interface ConcentrationWarningProps {
    warnings: string[];
}

export default function ConcentrationWarning({ warnings }: ConcentrationWarningProps) {
    if (warnings.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-950 border-l-4 border-l-amber-500 border-y border-r border-slate-200 dark:border-slate-800 rounded-r-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
            <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Concentration Risk Detected
                </h3>
                <ul className="space-y-1">
                    {warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                            {warning}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
