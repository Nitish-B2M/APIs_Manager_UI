'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import { User as UserIcon, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '../../components/AuthGuard';

export default function ProfilePage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();

    const { data: meRes, isLoading } = useQuery({ queryKey: ['me'], queryFn: api.auth.me });
    const me = meRes?.data;

    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (me) {
            setName(me.name || '');
            setAvatarUrl(me.avatarUrl || '');
        }
    }, [me]);

    const updateMutation = useMutation({
        mutationFn: (data: { name?: string; avatarUrl?: string | null }) => api.auth.updateProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            toast.success('Profile updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update profile');
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateMutation.mutateAsync({
                name: name.trim() || undefined,
                avatarUrl: avatarUrl.trim() || null,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const mainBg = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm';
    const inputBg = theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const labelColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';

    if (isLoading) {
        return (
            <div className={`min-h-[calc(100vh-64px)] ${mainBg} flex items-center justify-center`}>
                <div className="animate-pulse text-indigo-500 text-lg">Loading profile...</div>
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <div className={`min-h-[calc(100vh-64px)] ${mainBg} p-8 transition-colors duration-300`}>
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Link
                            href="/dashboard"
                            className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">Profile Settings</h1>
                            <p className={`text-sm ${subTextColor}`}>Manage your account information</p>
                        </div>
                    </div>

                    <div className={`${cardBg} border rounded-xl p-8`}>
                        {/* Avatar preview */}
                        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="Avatar"
                                        className="w-20 h-20 rounded-full object-cover border-4 border-indigo-500/30"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center border-4 border-indigo-500/30">
                                        <UserIcon size={32} className="text-white" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="font-semibold text-lg">{name || me?.email}</p>
                                <p className={`text-sm ${subTextColor}`}>{me?.email}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className={`block text-sm font-medium ${labelColor} mb-2`}>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={me?.email || ''}
                                    disabled
                                    className={`w-full rounded-lg px-4 py-3 border opacity-60 cursor-not-allowed ${inputBg}`}
                                />
                                <p className={`text-xs ${subTextColor} mt-1`}>Email cannot be changed</p>
                            </div>

                            <div>
                                <label className={`block text-sm font-medium ${labelColor} mb-2`}>
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your display name"
                                    className={`w-full rounded-lg px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
                                    maxLength={100}
                                />
                            </div>

                            <div>
                                <label className={`block text-sm font-medium ${labelColor} mb-2`}>
                                    Avatar URL
                                </label>
                                <input
                                    type="url"
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="https://example.com/avatar.png"
                                    className={`w-full rounded-lg px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
                                    maxLength={500}
                                />
                                <p className={`text-xs ${subTextColor} mt-1`}>Paste a URL to an image for your profile picture</p>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                                >
                                    <Save size={16} />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
