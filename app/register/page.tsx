'use client';
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { registerSchema } from '@/types';
import { ZodError } from 'zod';

interface FormErrors {
    email?: string;
    password?: string;
}

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const router = useRouter();
    const { theme } = useTheme();

    // Clear field errors when user types
    useEffect(() => {
        if (email && errors.email) {
            setErrors(prev => ({ ...prev, email: undefined }));
        }
    }, [email]);

    useEffect(() => {
        if (password && errors.password) {
            setErrors(prev => ({ ...prev, password: undefined }));
        }
    }, [password]);

    const registerMutation = useMutation({
        mutationFn: api.auth.register,
        onSuccess: (res: { data: { token: string }; message?: string }) => {
            const data = res.data;
            localStorage.setItem('token', data.token);
            toast.success(res.message || 'Registration successful');
            router.push('/dashboard');
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Registration failed');
        }
    });

    const validateForm = (): boolean => {
        try {
            registerSchema.parse({ email, password });
            setErrors({});
            return true;
        } catch (error) {
            if (error instanceof ZodError) {
                const fieldErrors: FormErrors = {};
                error.errors.forEach((err) => {
                    const field = err.path[0] as keyof FormErrors;
                    if (!fieldErrors[field]) {
                        fieldErrors[field] = err.message;
                    }
                });
                setErrors(fieldErrors);
            }
            return false;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        registerMutation.mutate({ email, password });
    };

    const mainBg = theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-900 border-gray-800 shadow-2xl' : 'bg-white border-gray-100 shadow-xl';
    const inputBg = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white focus:border-indigo-500' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500';
    const inputErrorBg = theme === 'dark' ? 'bg-gray-800 border-red-500 text-white focus:border-red-400' : 'bg-white border-red-500 text-gray-900 focus:border-red-400';
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

                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    <div className="space-y-1.5">
                        <label className={`block text-xs font-black uppercase tracking-widest ${subTextColor}`}>
                            Email address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-all font-medium ${errors.email ? inputErrorBg : inputBg}`}
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? 'email-error' : undefined}
                        />
                        {errors.email && (
                            <div id="email-error" className="flex items-center gap-1.5 text-red-500 text-xs mt-1">
                                <AlertCircle size={12} />
                                <span>{errors.email}</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <label className={`block text-xs font-black uppercase tracking-widest ${subTextColor}`}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="min. 6 characters"
                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none transition-all font-medium ${errors.password ? inputErrorBg : inputBg}`}
                            aria-invalid={!!errors.password}
                            aria-describedby={errors.password ? 'password-error' : undefined}
                        />
                        {errors.password && (
                            <div id="password-error" className="flex items-center gap-1.5 text-red-500 text-xs mt-1">
                                <AlertCircle size={12} />
                                <span>{errors.password}</span>
                            </div>
                        )}
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
