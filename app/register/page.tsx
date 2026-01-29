'use client';
import { useState } from 'react';
import { api } from '../../utils/api';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { UserPlus, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const { theme } = useTheme();

    const registerMutation = useMutation({
        mutationFn: api.auth.register,
        onSuccess: (res: any) => {
            const data = res.data;
            localStorage.setItem('token', data.token);
            toast.success(res.message || 'Registration successful');
            router.push('/dashboard');
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        registerMutation.mutate({ email, password });
    };

    const mainBg = theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-900 border-gray-800 shadow-2xl' : 'bg-white border-gray-100 shadow-xl';
    const inputBg = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white focus:border-indigo-500' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

    return (
        <div className={`flex min-h-[calc(100vh-64px)] items-center justify-center ${mainBg} transition-colors duration-300 p-6`}>
            <div className={`w-full max-w-md p-10 ${cardBg} rounded-3xl border`}>
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/30">
                        <UserPlus size={24} />
                    </div>
                    <h1 className={`text-3xl font-black ${textColor} tracking-tight`}>Create Account</h1>
                    <p className={`${subTextColor} text-sm mt-1 font-medium`}>Join us and start generating API docs today</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className={`block text-xs font-black uppercase tracking-widest ${subTextColor}`}>Email address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-all font-medium ${inputBg}`}
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className={`block text-xs font-black uppercase tracking-widest ${subTextColor}`}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="min. 6 characters"
                            minLength={6}
                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-all font-medium ${inputBg}`}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 active:scale-[0.98]"
                    >
                        {registerMutation.isPending ? 'Creating Account...' : 'Register Now'}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-gray-500/10 text-center">
                    <p className={`${subTextColor} text-sm font-medium`}>
                        Already have an account?{' '}
                        <button
                            onClick={() => router.push('/login')}
                            className="text-indigo-600 hover:text-indigo-500 font-bold transition-colors cursor-pointer"
                        >
                            Log in
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
