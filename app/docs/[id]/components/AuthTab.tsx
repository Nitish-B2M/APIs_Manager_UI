'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Key, User, Lock } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { AuthConfig, AuthType } from '@/types';

interface AuthTabProps {
    auth: AuthConfig;
    canEdit: boolean;
    onAuthChange: (auth: AuthConfig) => void;
}

const AUTH_OPTIONS: { value: AuthType; label: string; icon: React.ReactNode }[] = [
    { value: 'none', label: 'No Auth', icon: <Shield size={14} /> },
    { value: 'bearer', label: 'Bearer Token', icon: <Key size={14} /> },
    { value: 'basic', label: 'Basic Auth', icon: <User size={14} /> },
    { value: 'apikey', label: 'API Key', icon: <Lock size={14} /> },
];

export function AuthTab({ auth, canEdit, onAuthChange }: AuthTabProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const [showToken, setShowToken] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showApiValue, setShowApiValue] = useState(false);

    const currentType = auth?.type || 'none';

    const handleTypeChange = (type: AuthType) => {
        switch (type) {
            case 'none':
                onAuthChange({ type: 'none' });
                break;
            case 'bearer':
                onAuthChange({ type: 'bearer', token: (auth as any)?.token || '' });
                break;
            case 'basic':
                onAuthChange({ type: 'basic', username: (auth as any)?.username || '', password: (auth as any)?.password || '' });
                break;
            case 'apikey':
                onAuthChange({ type: 'apikey', key: (auth as any)?.key || '', value: (auth as any)?.value || '', addTo: (auth as any)?.addTo || 'header' });
                break;
        }
    };

    return (
        <div className="p-4 space-y-5">
            {/* Auth Type Selector */}
            <div>
                <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${themeClasses.subTextColor}`}>
                    Authorization Type
                </label>
                <div className="flex gap-2 flex-wrap">
                    {AUTH_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            disabled={!canEdit}
                            onClick={() => handleTypeChange(opt.value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${currentType === opt.value
                                ? theme === 'dark'
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                                    : 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20'
                                : theme === 'dark'
                                    ? 'bg-[#2a2a3e] text-gray-400 border-gray-700 hover:bg-[#33334d] hover:text-gray-200'
                                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:text-gray-800'
                                } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            {opt.icon}
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Auth-specific fields */}
            {currentType === 'none' && (
                <div className={`text-sm ${themeClasses.subTextColor} flex items-center gap-2 py-4`}>
                    <Shield size={18} className="opacity-50" />
                    This request does not use any authorization.
                </div>
            )}

            {currentType === 'bearer' && (
                <div className="space-y-3">
                    <label className={`text-xs font-semibold uppercase tracking-wider block ${themeClasses.subTextColor}`}>
                        Token
                    </label>
                    <div className="relative">
                        <input
                            type={showToken ? 'text' : 'password'}
                            value={(auth as any)?.token || ''}
                            disabled={!canEdit}
                            onChange={e => onAuthChange({ type: 'bearer', token: e.target.value })}
                            placeholder="Enter your bearer token"
                            className={`w-full px-3 py-2 pr-10 rounded-md text-sm font-mono border transition-colors ${theme === 'dark'
                                ? 'bg-[#1e1e2e] border-gray-700 text-gray-200 placeholder-gray-600 focus:border-blue-500'
                                : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-400'
                                } focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${!canEdit ? 'opacity-50' : ''}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${themeClasses.subTextColor} hover:text-blue-400 transition-colors`}
                        >
                            {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                    <p className={`text-xs ${themeClasses.subTextColor}`}>
                        The token will be sent as <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">Authorization: Bearer &lt;token&gt;</code>
                    </p>
                </div>
            )}

            {currentType === 'basic' && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className={`text-xs font-semibold uppercase tracking-wider block ${themeClasses.subTextColor}`}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={(auth as any)?.username || ''}
                            disabled={!canEdit}
                            onChange={e => onAuthChange({ type: 'basic', username: e.target.value, password: (auth as any)?.password || '' })}
                            placeholder="Username"
                            className={`w-full px-3 py-2 rounded-md text-sm font-mono border transition-colors ${theme === 'dark'
                                ? 'bg-[#1e1e2e] border-gray-700 text-gray-200 placeholder-gray-600 focus:border-blue-500'
                                : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-400'
                                } focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${!canEdit ? 'opacity-50' : ''}`}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className={`text-xs font-semibold uppercase tracking-wider block ${themeClasses.subTextColor}`}>
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={(auth as any)?.password || ''}
                                disabled={!canEdit}
                                onChange={e => onAuthChange({ type: 'basic', username: (auth as any)?.username || '', password: e.target.value })}
                                placeholder="Password"
                                className={`w-full px-3 py-2 pr-10 rounded-md text-sm font-mono border transition-colors ${theme === 'dark'
                                    ? 'bg-[#1e1e2e] border-gray-700 text-gray-200 placeholder-gray-600 focus:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-400'
                                    } focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${!canEdit ? 'opacity-50' : ''}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${themeClasses.subTextColor} hover:text-blue-400 transition-colors`}
                            >
                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>
                    <p className={`text-xs ${themeClasses.subTextColor}`}>
                        Credentials will be Base64-encoded and sent as <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">Authorization: Basic &lt;encoded&gt;</code>
                    </p>
                </div>
            )}

            {currentType === 'apikey' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={`text-xs font-semibold uppercase tracking-wider block ${themeClasses.subTextColor}`}>
                                Key
                            </label>
                            <input
                                type="text"
                                value={(auth as any)?.key || ''}
                                disabled={!canEdit}
                                onChange={e => onAuthChange({ type: 'apikey', key: e.target.value, value: (auth as any)?.value || '', addTo: (auth as any)?.addTo || 'header' })}
                                placeholder="e.g. X-API-Key"
                                className={`w-full px-3 py-2 rounded-md text-sm font-mono border transition-colors ${theme === 'dark'
                                    ? 'bg-[#1e1e2e] border-gray-700 text-gray-200 placeholder-gray-600 focus:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-400'
                                    } focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${!canEdit ? 'opacity-50' : ''}`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-xs font-semibold uppercase tracking-wider block ${themeClasses.subTextColor}`}>
                                Value
                            </label>
                            <div className="relative">
                                <input
                                    type={showApiValue ? 'text' : 'password'}
                                    value={(auth as any)?.value || ''}
                                    disabled={!canEdit}
                                    onChange={e => onAuthChange({ type: 'apikey', key: (auth as any)?.key || '', value: e.target.value, addTo: (auth as any)?.addTo || 'header' })}
                                    placeholder="API key value"
                                    className={`w-full px-3 py-2 pr-10 rounded-md text-sm font-mono border transition-colors ${theme === 'dark'
                                        ? 'bg-[#1e1e2e] border-gray-700 text-gray-200 placeholder-gray-600 focus:border-blue-500'
                                        : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-400'
                                        } focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${!canEdit ? 'opacity-50' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiValue(!showApiValue)}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${themeClasses.subTextColor} hover:text-blue-400 transition-colors`}
                                >
                                    {showApiValue ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className={`text-xs font-semibold uppercase tracking-wider block ${themeClasses.subTextColor}`}>
                            Add To
                        </label>
                        <div className="flex gap-2">
                            {(['header', 'query'] as const).map(opt => (
                                <button
                                    key={opt}
                                    disabled={!canEdit}
                                    onClick={() => onAuthChange({ type: 'apikey', key: (auth as any)?.key || '', value: (auth as any)?.value || '', addTo: opt })}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${(auth as any)?.addTo === opt
                                        ? theme === 'dark'
                                            ? 'bg-blue-600 text-white border-blue-500'
                                            : 'bg-blue-500 text-white border-blue-400'
                                        : theme === 'dark'
                                            ? 'bg-[#2a2a3e] text-gray-400 border-gray-700 hover:bg-[#33334d]'
                                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                        } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    {opt === 'header' ? 'Header' : 'Query Params'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className={`text-xs ${themeClasses.subTextColor}`}>
                        {(auth as any)?.addTo === 'query'
                            ? 'The key-value pair will be appended as a query parameter.'
                            : 'The key-value pair will be sent as a custom header.'}
                    </p>
                </div>
            )}
        </div>
    );
}
