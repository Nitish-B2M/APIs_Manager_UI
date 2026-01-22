'use client';
import { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const registerMutation = trpc.auth.register.useMutation({
        onSuccess: (data) => {
            localStorage.setItem('token', data.token);
            router.push('/dashboard');
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        registerMutation.mutate({ email, password });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold mb-2 text-center">Register</h1>
                <p className="text-gray-400 text-center mb-8 text-sm">Join us today! It only takes a minute.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 focus:outline-none"
                            minLength={6}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 active:scale-[0.98]"
                    >
                        {registerMutation.isPending ? 'Creating Account...' : 'Register'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-700/50 text-center">
                    <p className="text-gray-400 text-sm">
                        Already have an account?{' '}
                        <button
                            onClick={() => router.push('/login')}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                        >
                            Log in
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
