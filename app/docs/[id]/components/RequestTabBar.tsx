'use client';

import React from 'react';
import { X, Layout, FileText, ChevronRight, CornerDownRight } from 'lucide-react';
import { Endpoint } from '@/types';

interface RequestTabBarProps {
    openTabs: any[];
    activeTabId: string | null;
    onTabSelect: (id: string) => void;
    onTabClose: (id: string, e: React.MouseEvent) => void;
    theme: 'light' | 'dark';
}

export function RequestTabBar({ openTabs, activeTabId, onTabSelect, onTabClose, theme }: RequestTabBarProps) {
    if (openTabs.length === 0) return null;

    return (
        <div className={`flex items-center overflow-x-auto scrollbar-none border-b ${theme === 'dark' ? 'bg-black/20 backdrop-blur-xl border-white/5' : 'bg-gray-50/50 backdrop-blur-md border-gray-200'} min-h-[44px]`}>
            {openTabs.map((tab, index) => {
                const isActive = activeTabId === tab.id;
                return (
                    <div
                        key={tab.id}
                        onClick={() => onTabSelect(tab.id)}
                        className={`group relative flex items-center min-w-[140px] max-w-[220px] h-11 px-4 cursor-pointer border-r transition-all duration-300 animate-in fade-in slide-in-from-left-2 ${index === 0 ? 'border-l' : ''
                            } ${theme === 'dark'
                                ? `border-white/5 ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`
                                : `border-gray-200 ${isActive ? 'bg-white text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`
                            }`}
                    >
                        <div className="flex items-center gap-2.5 w-full pr-6 overflow-hidden">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0 tracking-tighter ${tab.method === 'GET' ? 'bg-emerald-600/20 text-emerald-500' :
                                    tab.method === 'POST' ? 'bg-blue-600/20 text-blue-500' :
                                        tab.method === 'PUT' ? 'bg-amber-600/20 text-amber-500' :
                                            tab.method === 'DELETE' ? 'bg-red-600/20 text-red-500' :
                                                'bg-gray-600/20 text-gray-500'
                                }`}>{tab.method}</span>
                            <span className={`text-[12px] ${isActive ? 'font-bold' : 'font-medium'} truncate tracking-tight transition-all`}>
                                {tab.name || 'Untitled'}
                            </span>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); onTabClose(tab.id, e); }}
                            className={`absolute right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
                                } ${isActive ? 'opacity-100' : ''}`}
                        >
                            <X size={14} />
                        </button>

                        {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 shadow-[0_-2px_15px_rgba(99,102,241,0.5)]" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
