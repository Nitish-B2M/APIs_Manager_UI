'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import { useBetaMode } from '../../context/BetaModeContext';
import { Search, FileText, Folder, Globe, Settings, User, Home, Plus, X, Command } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { theme, toggleTheme } = useTheme();
    const { isBeta } = useBetaMode();
    const router = useRouter();
    const params = useParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const { data: collectionsRes } = useQuery<any>({
        queryKey: ['documentation', 'list'],
        queryFn: api.documentation.list,
        enabled: isBeta && isOpen
    });

    const { data: currentDocRes } = useQuery<any>({
        queryKey: ['doc', params?.id],
        queryFn: () => api.documentation.getById(params?.id as string),
        enabled: isBeta && isOpen && !!params?.id
    });


    const collections = collectionsRes?.data || [];
    const currentEndpoints = currentDocRes?.data?.requests || [];

    const actions = React.useMemo(() => [
        { id: 'toggle-theme', name: 'Toggle Theme', icon: Globe, section: 'Settings', action: () => { toggleTheme(); setIsOpen(false); } },
        { id: 'go-home', name: 'Go to Dashboard', icon: Home, section: 'Navigation', action: () => { router.push('/dashboard'); setIsOpen(false); } },
        { id: 'go-profile', name: 'Go to Profile', icon: User, section: 'Settings', action: () => { router.push('/profile'); setIsOpen(false); } },
        { id: 'new-collection', name: 'Create New Collection', icon: Plus, section: 'Actions', action: () => { /* Logic for new collection modal could go here or trigger a state */ setIsOpen(false); } },
    ], [router, toggleTheme]);


    const filteredItems = React.useMemo(() => {
        if (!query) return actions.map(a => ({ ...a, type: 'action' }));

        const search = query.toLowerCase();
        const results: any[] = [];

        // Search Actions
        actions.forEach(a => {
            if (a.name.toLowerCase().includes(search)) {
                results.push({ ...a, type: 'action' });
            }
        });

        // Search Collections
        collections.forEach((c: any) => {
            if (c.title.toLowerCase().includes(search)) {
                results.push({ id: c.id, name: c.title, icon: Folder, section: 'Collections', type: 'collection', action: () => { router.push(`/docs/${c.id}`); setIsOpen(false); } });
            }
        });

        // Search Endpoints (if in a doc)
        currentEndpoints.forEach((e: any) => {
            if (e.name?.toLowerCase().includes(search) || e.url?.toLowerCase().includes(search)) {
                results.push({ id: e.id, name: e.name, method: e.method, icon: FileText, section: 'Endpoints', type: 'endpoint', action: () => { router.push(`/docs/${params.id}?request=${e.id}`); setIsOpen(false); } });
            }
        });

        return results;
    }, [query, collections, currentEndpoints, actions]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        } else if (e.key === 'Enter') {
            if (filteredItems[selectedIndex]) {
                filteredItems[selectedIndex].action();
            }
        }
    };

    useEffect(() => {
        if (scrollContainerRef.current) {
            const selectedElement = scrollContainerRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    // Only enable if beta mode is on
    if (!isBeta) return null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setIsOpen(false)} />

            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-[#0f111a] border-white/10' : 'bg-white border-gray-200'
                }`}>
                <div className="flex items-center px-4 border-b border-white/5">
                    <Search size={20} className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search for endpoints, collections, or actions (Ctrl+K)"
                        className={`w-full bg-transparent border-none focus:ring-0 px-4 py-5 text-base outline-none ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}
                    />
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-500/10 border border-white/5 text-[10px] font-black text-gray-500">
                        <Command size={10} /> K
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    className="max-h-[450px] overflow-y-auto py-2 custom-scrollbar"
                >
                    {filteredItems.length > 0 ? (
                        filteredItems.map((item, index) => (
                            <div
                                key={`${item.type}-${item.id || item.name}`}
                                onClick={item.action}
                                className={`px-4 py-3 flex items-center gap-4 cursor-pointer transition-all ${index === selectedIndex
                                    ? (theme === 'dark' ? 'bg-indigo-500/20 text-white' : 'bg-indigo-50 text-indigo-700')
                                    : (theme === 'dark' ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50')
                                    }`}
                            >
                                <div className={`p-2 rounded-lg ${index === selectedIndex
                                    ? (theme === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-100')
                                    : (theme === 'dark' ? 'bg-white/5' : 'bg-gray-100')
                                    }`}>
                                    <item.icon size={18} className={index === selectedIndex ? 'text-indigo-500' : ''} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {item.method && (
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.method === 'GET' ? 'bg-emerald-500/10 text-emerald-500' :
                                                item.method === 'POST' ? 'bg-blue-500/10 text-blue-500' :
                                                    'bg-gray-500/10 text-gray-500'
                                                }`}>
                                                {item.method}
                                            </span>
                                        )}
                                        <p className="font-bold text-sm truncate">{item.name}</p>
                                    </div>
                                    <p className={`text-[10px] uppercase tracking-widest font-black mt-0.5 opacity-50`}>
                                        {item.section}
                                    </p>
                                </div>
                                {index === selectedIndex && (
                                    <span className="text-[10px] font-black opacity-40 uppercase tracking-tighter">Enter to select</span>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-12 text-center">
                            <Search size={40} className="mx-auto mb-4 opacity-10" />
                            <p className={`text-sm font-bold italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                No results found for "{query}"
                            </p>
                        </div>
                    )}
                </div>

                {query && filteredItems.length > 0 && (
                    <div className={`px-4 py-2 border-t text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400'
                        }`}>
                        {filteredItems.length} results found
                    </div>
                )}
            </div>
        </div>
    );
}
