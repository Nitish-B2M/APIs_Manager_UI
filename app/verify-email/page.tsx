'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { MailCheck, Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { theme } = useTheme();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [errorMsg, setErrorMsg] = useState('');

    const mainBg = theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-900 border-gray-800 shadow-2xl' : 'bg-white border-gray-100 shadow-xl';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMsg('No verification token found in URL.');
            return;
        }

        api.auth.verifyEmail(token)
            .then(() => {
                setStatus('success');
                toast.success('Email verified successfully!');
            })
            .catch((err: Error) => {
                setStatus('error');
                setErrorMsg(err.message || 'Verification failed. The link may have expired.');
            });
    }, [token]);

    return (
        <div className={`flex min-h-[calc(100vh-64px)] items-center justify-center ${mainBg} transition-colors duration-300 p-6`}>
            <div className={`w-full max-w-md p-10 ${cardBg} rounded-3xl border text-center`}>
                {status === 'verifying' && (
                    <>
                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-indigo-500/30">
                            <Loader2 size={32} className="animate-spin" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight mb-2">Verifying Your Email</h1>
                        <p className={`${subTextColor} text-sm font-medium`}>Please wait...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-green-500/30">
                            <CheckCircle size={32} />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight mb-2">Email Verified!</h1>
                        <p className={`${subTextColor} text-sm font-medium mb-8`}>
                            Your email has been verified successfully. You now have full access to all features.
                        </p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20"
                        >
                            Go to Dashboard <ArrowRight size={16} />
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-red-500/30">
                            <XCircle size={32} />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight mb-2">Verification Failed</h1>
                        <p className={`${subTextColor} text-sm font-medium mb-6`}>{errorMsg}</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all"
                            >
                                Go to Dashboard
                            </button>
                            <p className={`${subTextColor} text-xs`}>
                                You can resend the verification email from your dashboard.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
