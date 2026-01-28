'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            alert("Please fill in all fields");
            return;
        }

        setLoading(true);

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                }
            });
            if (error) {
                alert(error.message);
            } else {
                alert("Check your email for the confirmation link! (Check Spam too)");
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                alert(error.message);
            } else {
                // Successful login
                router.push('/admin');
            }
        }
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-neutral-900 text-white">
            <h1 className="text-4xl font-bold mb-8">ClearWorth Admin</h1>
            <p className="mb-8 text-neutral-400">
                {isSignUp ? "Create an account" : "Sign in to access the dashboard"}
            </p>

            <div className="w-full max-w-sm mb-6 space-y-3">
                <button
                    onClick={async () => {
                        const { error } = await supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                                redirectTo: `${location.origin}/auth/callback`,
                                queryParams: {
                                    access_type: 'offline',
                                    prompt: 'consent',
                                },
                            },
                        });
                        if (error) alert(error.message);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 font-bold py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Sign in with Google
                </button>
                <div className="relative flex items-center justify-center">
                    <div className="border-t border-gray-600 w-full" />
                    <span className="bg-neutral-900 px-2 text-sm text-gray-400 absolute">OR</span>
                </div>
            </div>

            <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 w-full max-w-sm">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="p-3 rounded bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="p-3 rounded bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                    required
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                </button>
            </form>

            <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="mt-4 text-sm text-neutral-400 hover:text-white underline"
            >
                {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </button>

            <div className="mt-8 text-xs text-neutral-600 max-w-sm text-center">
                Note: Check your Supabase project settings if Email Confirmation is enabled.
            </div>
        </div>
    );
}
