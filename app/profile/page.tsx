'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import { useBetaMode } from '../../context/BetaModeContext';
import { User as UserIcon, Save, ArrowLeft, Beaker, Settings, Shield, Globe, Clock, List } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '../../components/AuthGuard';
import { ProxySettings } from '../modules/ProxySettings';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
    const { theme } = useTheme();
    const { isBeta, toggleBeta } = useBetaMode();
    const { refreshUser } = useAuth();
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
        mutationFn: (data: { name?: string; avatarUrl?: string | null; settings?: Record<string, any> }) => api.auth.updateProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            refreshUser();
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
    const borderCol = theme === 'dark' ? 'border-gray-800' : 'border-gray-200';

    const handleToggleClock = async () => {
        const newSettings = {
            ...(me?.settings || {}),
            showFlipClock: !me?.settings?.showFlipClock
        };
        try {
            await updateMutation.mutateAsync({ settings: newSettings });
        } catch (err) { }
    };

    const handleToggleCopySingleLine = async () => {
        const newSettings = {
            ...(me?.settings || {}),
            copySingleLine: !me?.settings?.copySingleLine
        };
        try {
            await updateMutation.mutateAsync({ settings: newSettings });
        } catch (err) { }
    };

    const handleToggleLivePresence = async () => {
        const newSettings = {
            ...(me?.settings || {}),
            enableLivePresence: me?.settings?.enableLivePresence === false ? true : false
        };
        try {
            await updateMutation.mutateAsync({ settings: newSettings });
        } catch (err) { }
    };

    const sections = [
        { id: 'personal-info', label: 'Personal Info', icon: <UserIcon size={16} /> },
        { id: 'preferences', label: 'Preferences', icon: <Clock size={16} /> },
        { id: 'beta-features', label: 'Beta Features', icon: <Beaker size={16} /> },
        { id: 'proxy-settings', label: 'Proxy Settings', icon: <Globe size={16} /> },
    ];

    if (isLoading) {
        return (
            <div className={`min-h-[calc(100vh-64px)] ${mainBg} flex items-center justify-center`}>
                <div className="animate-pulse text-[#249d9f] text-lg">Loading profile...</div>
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <div className={`min-h-[calc(100vh-64px)] ${mainBg} p-8 transition-colors duration-300`}>
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Link
                            href="/dashboard"
                            className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-[#249d9f]">Profile Settings</h1>
                            <p className={`text-sm ${subTextColor}`}>Manage your account and preferences</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* TOC Sidebar */}
                        <div className="md:w-64 flex-shrink-0">
                            <div className={`sticky top-24 space-y-1`}>
                                <div className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest ${subTextColor}`}>Sections</div>
                                {sections.map(section => (
                                    <button
                                        key={section.id}
                                        onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${theme === 'dark'
                                            ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                                            : 'hover:bg-white hover:shadow-sm text-gray-500 hover:text-[#1a7a7c]'
                                            }`}
                                    >
                                        <span className="opacity-70">{section.icon}</span>
                                        {section.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 space-y-8 pb-20">
                            {/* Personal Info */}
                            <section id="personal-info" className="scroll-mt-24">
                                <div className={`${cardBg} border rounded-xl p-8`}>
                                    <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
                                        <div className="relative">
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt="Avatar"
                                                    className="w-20 h-20 rounded-full object-cover border-4 border-[#249d9f]/30"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#249d9f] to-[#249d9f] flex items-center justify-center border-4 border-[#249d9f]/30">
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
                                                className={`w-full rounded-lg px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-[#249d9f] ${inputBg}`}
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
                                                className={`w-full rounded-lg px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-[#249d9f] ${inputBg}`}
                                                maxLength={500}
                                            />
                                            <p className={`text-xs ${subTextColor} mt-1`}>Paste a URL to an image for your profile picture</p>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className="px-6 py-3 bg-[#1a7a7c] hover:bg-[#1a7a7c] text-white rounded-lg shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                                            >
                                                <Save size={16} />
                                                {isSaving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </section>

                            {/* Preferences */}
                            <section id="preferences" className="scroll-mt-24">
                                <div className={`${cardBg} border rounded-xl p-8`}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-[#249d9f]/10 text-[#2ec4c7]' : 'bg-indigo-50 text-[#1a7a7c]'}`}>
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold">Preferences</h2>
                                            <p className={`text-sm ${subTextColor}`}>Customize your interface and experience</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-500/5 border border-transparent hover:border-[#249d9f]/30 transition-all">
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">Header Flip Clock</p>
                                                <p className={`text-xs ${subTextColor}`}>Display an animated vintage flip clock and calendar in the header</p>
                                            </div>
                                            <button
                                                onClick={handleToggleClock}
                                                disabled={updateMutation.isPending}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#249d9f] focus:ring-offset-2 ${me?.settings?.showFlipClock ? 'bg-[#1a7a7c]' : 'bg-gray-300'}`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${me?.settings?.showFlipClock ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-500/5 border border-transparent hover:border-[#249d9f]/30 transition-all">
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">Copy as Single Line</p>
                                                <p className={`text-xs ${subTextColor}`}>Remove all whitespace when copying request URL, body, docs, or response to clipboard</p>
                                            </div>
                                            <button
                                                onClick={handleToggleCopySingleLine}
                                                disabled={updateMutation.isPending}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#249d9f] focus:ring-offset-2 ${me?.settings?.copySingleLine ? 'bg-[#1a7a7c]' : 'bg-gray-300'}`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${me?.settings?.copySingleLine ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-500/5 border border-transparent hover:border-[#249d9f]/30 transition-all">
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">Live Collaboration & Cursors</p>
                                                <p className={`text-xs ${subTextColor}`}>See who else is viewing the workspace and show your active field to team members</p>
                                            </div>
                                            <button
                                                onClick={handleToggleLivePresence}
                                                disabled={updateMutation.isPending}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#249d9f] focus:ring-offset-2 ${me?.settings?.enableLivePresence !== false ? 'bg-[#1a7a7c]' : 'bg-gray-300'}`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${me?.settings?.enableLivePresence !== false ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Beta Features */}
                            <section id="beta-features" className="scroll-mt-24">
                                <div className={`${cardBg} border rounded-xl p-8`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-[#249d9f]/10 text-[#2ec4c7]' : 'bg-indigo-50 text-[#1a7a7c]'}`}>
                                                <Beaker size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold">Beta Features</h2>
                                                <p className={`text-sm ${subTextColor}`}>Opt-in to experimental features before they're stable</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleBeta}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#249d9f] focus:ring-offset-2 ${isBeta ? 'bg-[#1a7a7c]' : 'bg-gray-300'}`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isBeta ? 'translate-x-6' : 'translate-x-1'}`}
                                            />
                                        </button>
                                    </div>
                                    <div className={`p-4 rounded-lg text-sm border ${theme === 'dark' ? 'bg-[#249d9f]/5 border-[#249d9f]/20 text-[#2ec4c7]' : 'bg-indigo-50 border-indigo-100 text-[#1a7a7c]'}`}>
                                        <p className="font-medium mb-1">Current Active Beta (Phase 1):</p>
                                        <ul className="list-disc list-inside space-y-1 opacity-80">
                                            <li>Rendered Public Documentation Viewer</li>
                                            <li>Request Chaining in Collection Runner</li>
                                            <li>Visual Snapshot Diff Viewer</li>
                                            <li>.env / JSON Environment Import</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            {/* Proxy Settings */}
                            <section id="proxy-settings" className="scroll-mt-24">
                                <ProxySettings />
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
