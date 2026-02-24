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
        <div className={`flex items-center overflow-x-auto scrollbar-none border-b ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            {openTabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                    <div
                        key={tab.id}
                        onClick={() => onTabSelect(tab.id)}
                        className={`group relative flex items-center min-w-[120px] max-w-[200px] h-10 px-4 cursor-pointer border-r transition-all duration-200 ${theme === 'dark'
                                ? `border-gray-700 ${isActive ? 'bg-gray-800 text-indigo-400' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'}`
                                : `border-gray-200 ${isActive ? 'bg-white text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`
                            }`}
                    >
                        <div className="flex items-center gap-2 w-full pr-6 overflow-hidden">
                            <span className={`text-[8px] font-black px-1 py-0.5 rounded flex-shrink-0 ${tab.method === 'GET' ? 'bg-green-600/20 text-green-500' :
                                    tab.method === 'POST' ? 'bg-blue-600/20 text-blue-500' :
                                        'bg-gray-600/20 text-gray-500'
                                }`}>{tab.method}</span>
                            <span className="text-[11px] font-medium truncate">{tab.name || 'Untitled'}</span>
                        </div>

                        <button
                            onClick={(e) => onTabClose(tab.id, e)}
                            className={`absolute right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                                } ${isActive ? 'opacity-100' : ''}`}
                        >
                            <X size={12} />
                        </button>

                        {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
