'use client';
import { useState, Suspense } from 'react';
import { api } from '../../utils/api';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { PublicOnlyRoute } from '../../components/AuthGuard';

function ResetPasswordContent() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { theme } = useTheme();

    const resetPasswordMutation = useMutation({
        mutationFn: (data: { token: string, password: string }) => api.auth.resetPassword(data.token, data.password),
        onSuccess: (res: { message?: string }) => {
            toast.success(res.message || 'Password reset successfully');
            router.push('/login');
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Failed to reset password');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            toast.error('Invalid or missing reset token');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        resetPasswordMutation.mutate({ token, password });
    };

    const mainBg = theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-900 border-gray-800 shadow-2xl' : 'bg-white border-gray-100 shadow-xl';
    const inputBg = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white focus:border-indigo-500' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

    if (!token) {
        return (
            <div className={`flex min-h-[calc(100vh-64px)] items-center justify-center ${mainBg}`}>
                <div className={`p-8 ${cardBg} rounded-xl text-center`}>
                    <p className="text-red-500 font-bold">Invalid or missing reset token.</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex min-h-[calc(100vh-64px)] items-center justify-center ${mainBg} transition-colors duration-300 p-6`}>
            <div className={`w-full max-w-md p-10 ${cardBg} rounded-3xl border`}>
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/30">
                        <KeyRound size={24} />
                    </div>
                    <h1 className={`text-2xl font-black ${textColor} tracking-tight`}>Set New Password</h1>
                    <p className={`${subTextColor} text-sm mt-1 font-medium`}>
                        Enter your new password below.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className={`block text-xs font-black uppercase tracking-widest ${subTextColor}`}>
                            New Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-all font-medium ${inputBg}`}
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className={`block text-xs font-black uppercase tracking-widest ${subTextColor}`}>
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-all font-medium ${inputBg}`}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={resetPasswordMutation.isPending}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 active:scale-[0.98]"
                    >
                        {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <PublicOnlyRoute>
            <Suspense fallback={<div>Loading...</div>}>
                <ResetPasswordContent />
            </Suspense>
        </PublicOnlyRoute>
    );
}
