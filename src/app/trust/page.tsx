
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
                        Our Trust Promise
                    </h1>
                    <p className="mt-4 text-xl text-gray-600">
                        ClearWorth is built on a "Need-to-Know" basis. We believe your financial data is yours alone.
                    </p>
                </div>

                {/* Core Pillars */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Data Access Policy
                        </h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">
                                    Can we see your balances?
                                </dt>
                                <dd className="mt-1 text-lg font-semibold text-green-600">
                                    No.
                                </dd>
                                <dd className="mt-1 text-sm text-gray-600">
                                    By default, our Support Team has <strong>zero access</strong> to see your Assets, Liabilities, or Transactions.
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">
                                    Storage of Credentials
                                </dt>
                                <dd className="mt-1 text-lg font-semibold text-green-600">
                                    Never.
                                </dd>
                                <dd className="mt-1 text-sm text-gray-600">
                                    We do not store Bank Login credentials. We use secure partners (like Plaid) who provide us with a temporary read-only token.
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* The "Break-Glass" Mechanism */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Support Access ("Break-Glass")
                        </h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <SupportAccessManager initialActive={supportStatus.active} initialExpiresAt={supportStatus.expiresAt} />

                        <div className="mt-4 text-sm text-gray-500">
                            <p>
                                When active, a banner will appear globally to remind you transparently that an Admin has access.
                                You can revoke this at any time.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Metadata vs Data */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            What We CAN See
                        </h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <p className="text-gray-600 mb-4">
                            To operate the service, we store strictly necessary metadata:
                        </p>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Example</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                <tr>
                                    <td className="px-3 py-2 text-gray-900 font-medium">Identity</td>
                                    <td className="px-3 py-2 text-gray-500">Email, Name</td>
                                    <td className="px-3 py-2 text-yellow-600">Visible to Admin</td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-2 text-gray-900 font-medium">App Config</td>
                                    <td className="px-3 py-2 text-gray-500">Currency, Country</td>
                                    <td className="px-3 py-2 text-yellow-600">Visible to Admin</td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-2 text-gray-900 font-medium">Financial Data</td>
                                    <td className="px-3 py-2 text-gray-500">Bank Balance, Debt Amount</td>
                                    <td className="px-3 py-2 text-green-600 font-bold">HIDDEN (Unless Granted)</td>
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
