'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import { useBetaMode } from '../../context/BetaModeContext';
import { Search, FileText, Folder, Globe, Settings, User, Home, Plus, X, Command, Rocket } from 'lucide-react';
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
        queryFn: () => api.documentation.list(),
        enabled: isBeta && isOpen
    });

    const { data: todosRes } = useQuery<any>({
        queryKey: ['todos', 'list'],
        queryFn: () => api.todos.list(),
        enabled: isBeta && isOpen
    });

    const { data: notesRes } = useQuery<any>({
        queryKey: ['notes', 'list'],
        queryFn: () => api.notes.list(),
        enabled: isBeta && isOpen
    });

    const collections = collectionsRes?.data || [];
    const todos = todosRes?.data || [];
    const notes = notesRes?.data || [];

    const actions = React.useMemo(() => [
        { id: 'toggle-theme', name: 'Toggle Theme', icon: Globe, section: 'Settings', action: () => { toggleTheme(); setIsOpen(false); } },
        { id: 'go-home', name: 'Go to Dashboard', icon: Home, section: 'Navigation', action: () => { router.push('/dashboard'); setIsOpen(false); } },
        { id: 'go-todos', name: 'Go to Tasks', icon: Rocket, section: 'Navigation', action: () => { router.push('/todos'); setIsOpen(false); } },
        { id: 'go-notes', name: 'Go to Notes', icon: FileText, section: 'Navigation', action: () => { router.push('/modules/notes'); setIsOpen(false); } },
        { id: 'go-profile', name: 'Go to Profile', icon: User, section: 'Settings', action: () => { router.push('/profile'); setIsOpen(false); } },
        { id: 'new-collection', name: 'Create New Collection', icon: Plus, section: 'Actions', action: () => { setIsOpen(false); } },
    ], [router, toggleTheme]);


    const filteredItems = React.useMemo(() => {
        if (!query) return actions.map(a => ({ ...a, type: 'action' }));

        const search = query.toLowerCase();
        const results: any[] = [];

        // 1. Search Actions
        actions.forEach(a => {
            if (a.name.toLowerCase().includes(search)) {
                results.push({ ...a, type: 'action' });
            }
        });

        // 2. Search Collections, Folders, and Endpoints (Global)
        collections.forEach((col: any) => {
            const colMatch = col.title.toLowerCase().includes(search) || col.description?.toLowerCase().includes(search);
            if (colMatch) {
                results.push({ 
                    id: col.id, 
                    name: col.title, 
                    icon: Folder, 
                    section: 'Collections', 
                    type: 'collection', 
                    action: () => { router.push(`/docs/${col.id}`); setIsOpen(false); } 
                });
            }

            // Search Folders in this collection
            (col.folders || []).forEach((f: any) => {
                if (f.name.toLowerCase().includes(search)) {
                    results.push({ 
                        id: f.id, 
                        name: f.name, 
                        icon: Folder, 
                        section: `Folders (${col.title})`, 
                        type: 'folder', 
                        action: () => { router.push(`/docs/${col.id}`); setIsOpen(false); } 
                    });
                }
            });

            // Search Endpoints in this collection
            (col.requests || []).forEach((e: any) => {
                const nameMatch = e.name?.toLowerCase().includes(search);
                const urlMatch = e.url?.toLowerCase().includes(search);
                const descMatch = e.description?.toLowerCase().includes(search);
                const schemaMatch = typeof e.responseSchema === 'string' 
                    ? e.responseSchema.toLowerCase().includes(search) 
                    : JSON.stringify(e.responseSchema || {}).toLowerCase().includes(search);

                if (nameMatch || urlMatch || descMatch || schemaMatch) {
                    results.push({ 
                        id: e.id, 
                        name: e.name, 
                        method: e.method, 
                        icon: FileText, 
                        section: `Endpoints (${col.title})`, 
                        type: 'endpoint', 
                        matchType: nameMatch ? null : urlMatch ? 'url' : descMatch ? 'description' : 'schema',
                        action: () => { router.push(`/docs/${col.id}?request=${e.id}`); setIsOpen(false); } 
                    });
                }
            });
        });

        // 3. Search Todos
        todos.forEach((t: any) => {
            if (t.title.toLowerCase().includes(search) || t.description?.toLowerCase().includes(search)) {
                results.push({ id: t.id, name: t.title, icon: Rocket, section: 'Tasks', type: 'todo', action: () => { router.push('/todos'); setIsOpen(false); } });
            }
        });

        // 4. Search Notes
        notes.forEach((n: any) => {
            const titleMatch = n.title.toLowerCase().includes(search);
            const contentMatch = n.content_html?.toLowerCase().includes(search) || JSON.stringify(n.content_json || {}).toLowerCase().includes(search);

            if (titleMatch || contentMatch) {
                results.push({ 
                    id: n.id, 
                    name: n.title, 
                    icon: FileText, 
                    section: 'Notes', 
                    type: 'note', 
                    matchType: titleMatch ? null : 'content',
                    action: () => { router.push(`/modules/notes?note=${n.id}`); setIsOpen(false); } 
                });
            }
        });

        return results;
    }, [query, collections, actions, todos, notes, router]);

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
            setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
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

    if (!isBeta) return null;
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setIsOpen(false)} />

            <div className={`relative z-10 w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-[#0f111a] border-white/10' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center px-4 border-b border-white/5">
                    <Search size={20} className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search workspace endpoints, folders, notes, or tasks... (Ctrl+K)"
                        className={`w-full bg-transparent border-none focus:ring-0 px-4 py-5 text-base outline-none ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
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
                                key={`${item.type}-${item.id || item.name}-${index}`}
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
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className={`text-[10px] uppercase tracking-widest font-black opacity-50`}>
                                            {item.section}
                                        </p>
                                        {item.matchType && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                Matched {item.matchType}
                                            </span>
                                        )}
                                    </div>
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
                    <div className={`px-4 py-2 border-t text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        {filteredItems.length} results found
                    </div>
                )}
            </div>
        </div>
    );
}
