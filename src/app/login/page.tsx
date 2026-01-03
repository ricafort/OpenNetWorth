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
