'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Bookmark, Share2, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

interface Quote {
    text: string;
    author: string;
    mentorId: string;
}

interface WisdomBannerProps {
    customMentors?: any[];
    onOpenSettings?: () => void;
}

const standardQuotes: Quote[] = [
    { text: "Consistency compounds as much as capital does.", author: "Long-Term Thinker", mentorId: "lt" },
    { text: "Capital preservation is the first rule of wealth building.", author: "Risk Guardian", mentorId: "rg" },
    { text: "Look for underutilized resources and creative expansion.", author: "Growth Optimist", mentorId: "go" },
    { text: "Find freedom in simplicity and detachment from comparison.", author: "Stoic Minimalist", mentorId: "sm" }
];

export default function WisdomBanner({ customMentors = [], onOpenSettings }: WisdomBannerProps) {
    const [allQuotes, setAllQuotes] = useState<Quote[]>(standardQuotes);
    const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>(standardQuotes);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [rotationSpeed, setRotationSpeed] = useState(15); // Default 15s
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [filterMentorId, setFilterMentorId] = useState<string | null>(null);

    // Load quotes and settings
    useEffect(() => {
        const savedSettings = localStorage.getItem('mentor_controls');
        if (savedSettings) {
            try {
                const { rotationSpeed: speed } = JSON.parse(savedSettings);
                setRotationSpeed(speed || 15);
            } catch (e) { console.error('Settings parse error'); }
        }

        const customQuotes: Quote[] = [];
        customMentors.forEach(m => {
            if (m.quotes && Array.isArray(m.quotes)) {
                m.quotes.forEach((q: string) => {
                    customQuotes.push({ text: q, author: m.name, mentorId: m.id });
                });
            } else if (m.description) {
                customQuotes.push({ text: m.description, author: m.name, mentorId: m.id });
            }
        });

        setAllQuotes([...standardQuotes, ...customQuotes]);
    }, [customMentors]);

    // Apply filtering
    useEffect(() => {
        if (filterMentorId) {
            const filtered = allQuotes.filter(q => q.mentorId === filterMentorId);
            setFilteredQuotes(filtered.length > 0 ? filtered : allQuotes);
            setCurrentIndex(0); // Reset to first quote of filter
        } else {
            setFilteredQuotes(allQuotes);
        }
    }, [filterMentorId, allQuotes]);

    const nextQuote = useCallback(() => {
        if (filteredQuotes.length === 0) return;
        setCurrentIndex((prev) => (prev + 1) % filteredQuotes.length);
    }, [filteredQuotes.length]);

    const prevQuote = () => {
        if (filteredQuotes.length === 0) return;
        setCurrentIndex((prev) => (prev - 1 + filteredQuotes.length) % filteredQuotes.length);
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && filteredQuotes.length > 0) {
            interval = setInterval(nextQuote, rotationSpeed * 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, rotationSpeed, nextQuote, filteredQuotes.length]);

    const handleBookmark = () => {
        const currentQuote = filteredQuotes[currentIndex];
        if (!currentQuote) return;
        const saved = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
        const exists = saved.find((q: any) => q.text === currentQuote.text);

        if (exists) {
            const filtered = saved.filter((q: any) => q.text !== currentQuote.text);
            localStorage.setItem('saved_quotes', JSON.stringify(filtered));
            setIsBookmarked(false);
        } else {
            saved.push(currentQuote);
            localStorage.setItem('saved_quotes', JSON.stringify(saved));
            setIsBookmarked(true);
        }
    };

    const handleShare = () => {
        const currentQuote = filteredQuotes[currentIndex];
        const text = `"${currentQuote?.text}" — ${currentQuote?.author} via OpenNetWorth`;
        navigator.clipboard.writeText(text);
        alert('Quote copied to clipboard!');
    };

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
        const currentQuote = filteredQuotes[currentIndex];
        setIsBookmarked(!!saved.find((q: any) => q.text === currentQuote?.text));
    }, [currentIndex, filteredQuotes]);

    const currentQuote = filteredQuotes[currentIndex] || standardQuotes[0];

    const mentors = Array.from(
        new Map(allQuotes.map(q => [q.mentorId, { id: q.mentorId, name: q.author, initial: q.author.charAt(0) }])).values()
    );

    return (
        <div className="relative group bg-card rounded-3xl border border-border shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* Banner Content */}
            <div className="relative p-8 md:p-12 flex flex-col items-center justify-center text-center h-[280px]">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={onOpenSettings} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
                        <Settings size={18} />
                    </button>
                </div>

                <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-500 w-full flex flex-col items-center" key={currentQuote?.text}>
                    <p className={`font-serif text-muted-foreground italic leading-relaxed mb-6 transition-all duration-300 ${currentQuote?.text.length > 150 ? 'text-lg md:text-xl' :
                        currentQuote?.text.length > 80 ? 'text-xl md:text-2xl' :
                            'text-2xl md:text-3xl'
                        }`}>
                        "{currentQuote?.text}"
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-auto">
                        <span className="h-px w-8 bg-blue-100" />
                        <span className="text-xs font-black text-blue-600 uppercase tracking-widest whitespace-nowrap">
                            {currentQuote?.author}
                        </span>
                        <span className="h-px w-8 bg-blue-100" />
                    </div>
                </div>

                {/* Manual Controls */}
                <button
                    onClick={prevQuote}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100 z-10"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={nextQuote}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100 z-10"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Interaction Bar */}
            <div className="bg-muted/80 backdrop-blur-sm border-t border-border py-3 px-6 flex items-center justify-between gap-4">
                {/* Mentor Strip - Scrollable */}
                <div className="flex -space-x-1.5 overflow-x-auto no-scrollbar py-1 px-1 mask-linear-fade">
                    {mentors.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setFilterMentorId(filterMentorId === m.id ? null : m.id)}
                            className={`shrink-0 h-8 w-8 rounded-full border flex items-center justify-center text-[10px] font-black transition-all ring-2 ring-slate-50 hover:z-10 hover:scale-110 active:scale-90 ${filterMentorId === m.id
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md z-10'
                                : 'bg-card border-border text-muted-foreground'
                                }`}
                            title={m.name}
                        >
                            {m.initial}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-2 hover:bg-card rounded-xl text-muted-foreground transition-all hover:shadow-sm"
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>

                    <button
                        onClick={handleBookmark}
                        className={`p-2 hover:bg-card rounded-xl transition-all hover:shadow-sm ${isBookmarked ? 'text-blue-600' : 'text-muted-foreground'}`}
                        title="Save Quote"
                    >
                        <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
                    </button>

                    <button
                        onClick={handleShare}
                        className="p-2 hover:bg-card rounded-xl text-muted-foreground transition-all hover:shadow-sm"
                        title="Share Quote"
                    >
                        <Share2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
