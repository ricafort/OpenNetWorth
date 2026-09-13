
import React from 'react';
import Link from 'next/link';
import SupportAccessManager from '@/features/privacy/components/SupportAccessManager';
import { getSupportStatus } from '@/features/privacy/actions';

export default async function TrustPage() {
    const supportStatus = await getSupportStatus();

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
                        OpenNetWorth Privacy Charter
                    </h1>
                    <p className="mt-4 text-xl text-gray-600">
                        100% Open Source, Local-First, and On-Device AI. Your financial life belongs to you alone.
                    </p>
                </div>

                {/* Core Pillars */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Local-First Sovereign Architecture
                        </h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">
                                    Can anyone else see your balances?
                                </dt>
                                <dd className="mt-1 text-lg font-semibold text-green-600">
                                    Never.
                                </dd>
                                <dd className="mt-1 text-sm text-gray-600">
                                    All your Assets, Liabilities, and Net Worth history are stored in your device&apos;s local browser storage. We operate zero centralized telemetry servers.
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">
                                    Where does AI inference happen?
                                </dt>
                                <dd className="mt-1 text-lg font-semibold text-green-600">
                                    100% On-Device (Local LLM).
                                </dd>
                                <dd className="mt-1 text-sm text-gray-600">
                                    Financial prompts and mentorship calculations are processed locally by LM Studio or Ollama on your machine. No financial state is transmitted to OpenAI, Google, or external clouds.
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* Local Mode vs Self-Hosted Support */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Support Access &amp; Break-Glass Control
                        </h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <p className="text-gray-600 mb-4 text-sm">
                            In <strong>Local Vault Mode</strong> (default), there is <strong>no remote admin access possible</strong> because no data leaves your machine. For optional self-hosted multi-user Supabase instances, emergency support requires explicit cryptographic consent:
                        </p>
                        <SupportAccessManager initialActive={supportStatus.active} initialExpiresAt={supportStatus.expiresAt} />

                        <div className="mt-4 text-sm text-gray-500">
                            <p>
                                When active in self-hosted mode, a banner alerts you transparently that temporary access was authorized.
                                You can revoke this at any second.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Storage & Privacy Transparency */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Where Your Data Lives
                        </h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <p className="text-gray-600 mb-4">
                            Summary of data persistence and transmission in OpenNetWorth:
                        </p>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Target</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network Exposure</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                <tr>
                                    <td className="px-3 py-2 text-gray-900 font-medium">Financial Records (Assets, Debts, History)</td>
                                    <td className="px-3 py-2 text-gray-600">Local Browser Storage / IndexedDB</td>
                                    <td className="px-3 py-2 text-green-600 font-bold">100% OFFLINE / ZERO CLOUD</td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-2 text-gray-900 font-medium">AI Mentorship &amp; Quick Actions</td>
                                    <td className="px-3 py-2 text-gray-600">Local LLM (LM Studio / Ollama on localhost)</td>
                                    <td className="px-3 py-2 text-green-600 font-bold">LOCAL LOOPBACK ONLY</td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-2 text-gray-900 font-medium">Telemetry &amp; Behavioral Tracking</td>
                                    <td className="px-3 py-2 text-gray-600">None (Disabled completely)</td>
                                    <td className="px-3 py-2 text-green-600 font-bold">ZERO BYTES SENT</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="text-center mt-12">
                    <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
                        &larr; Back to Dashboard
                    </Link>
                </div>

            </div>
        </div>
    );
}
