'use client';
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Lock } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const stored = localStorage.getItem('redirect_message');
        if (stored) {
            setMessage(stored);
            localStorage.removeItem('redirect_message');
        }
    }, []);

    const loginMutation = useMutation({
        mutationFn: api.auth.login,
        onSuccess: (data: any) => {
            localStorage.setItem('token', data.token);
            router.push('/dashboard');
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loginMutation.mutate({ email, password });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold mb-2 text-center">Login</h1>
                <p className="text-gray-400 text-center mb-8 text-sm">Welcome back! Please enter your details.</p>

                {message && (
                    <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg flex items-start gap-3">
                        <div className="p-1.5 bg-indigo-500/20 rounded-md mt-0.5">
                            <Lock size={16} className="text-indigo-400" />
                        </div>
                        <p className="text-sm text-indigo-300 leading-relaxed font-medium">
                            {message}
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 active:scale-[0.98]"
                    >
                        {loginMutation.isPending ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-700/50 text-center">
                    <p className="text-gray-400 text-sm">
                        Don't have an account?{' '}
                        <button
                            onClick={() => router.push('/register')}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                        >
                            Create an account
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
