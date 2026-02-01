'use client';

import { useState, useEffect, useRef, ReactNode, cloneElement, isValidElement, Children } from 'react';

interface ChartContainerProps {
    children: ReactNode;
    className?: string;
    height?: number;
}

/**
 * A wrapper component that uses ResizeObserver to measure container dimensions
 * and passes them to ResponsiveContainer to prevent "-1 width/height" warnings.
 * 
 * This component waits until valid dimensions are available before rendering children.
 */
export default function ChartContainer({
    children,
    className = '',
    height = 300
}: ChartContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Check dimensions after a frame to ensure CSS has been applied
        const checkDimensions = () => {
            const rect = container.getBoundingClientRect();
            if (rect.width > 0) {
                setIsReady(true);
            }
        };

        // Use requestAnimationFrame for more reliable timing
        const rafId = requestAnimationFrame(() => {
            requestAnimationFrame(checkDimensions);
        });

        // Also set up ResizeObserver as backup
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    setIsReady(true);
                }
            }
        });
        observer.observe(container);

        return () => {
            cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={`w-full ${className}`}
            style={{ height: `${height}px` }}
        >
            {isReady ? children : (
                <div
                    className="w-full h-full bg-slate-100/50 animate-pulse rounded-xl"
                    style={{ height: `${height}px` }}
                />
            )}
        </div>
    );
}
