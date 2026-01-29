'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Endpoint, HttpMethod } from '@/types';

interface SearchBarProps {
    endpoints: Endpoint[];
    onSelect: (index: number) => void;
    onClose: () => void;
    isOpen: boolean;
}

interface SearchResult {
    index: number;
    endpoint: Endpoint;
    matchType: 'name' | 'url' | 'method';
}

export function SearchBar({ endpoints, onSelect, onClose, isOpen }: SearchBarProps) {
    const { theme } = useTheme();
    const [query, setQuery] = useState('');
    const [selectedResultIdx, setSelectedResultIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

    const results = useMemo((): SearchResult[] => {
        if (!query.trim()) {
            return endpoints.map((endpoint, index) => ({
                index,
                endpoint,
                matchType: 'name' as const
            }));
        }

        const lowerQuery = query.toLowerCase();
        const matches: SearchResult[] = [];

        endpoints.forEach((endpoint, index) => {
            if (endpoint.name?.toLowerCase().includes(lowerQuery)) {
                matches.push({ index, endpoint, matchType: 'name' });
            } else if (endpoint.url?.toLowerCase().includes(lowerQuery)) {
                matches.push({ index, endpoint, matchType: 'url' });
            } else if (endpoint.method?.toLowerCase().includes(lowerQuery)) {
                matches.push({ index, endpoint, matchType: 'method' });
            }
        });

        return matches;
    }, [endpoints, query]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
            setSelectedResultIdx(0);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedResultIdx(0);
    }, [query]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedResultIdx(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedResultIdx(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedResultIdx]) {
            e.preventDefault();
            onSelect(results[selectedResultIdx].index);
            onClose();
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [results, selectedResultIdx, onSelect, onClose]);

    const getMethodColor = (method: HttpMethod) => {
        switch (method) {
            case 'GET': return 'bg-green-600/20 text-green-500';
            case 'POST': return 'bg-blue-600/20 text-blue-500';
            case 'PUT': return 'bg-yellow-600/20 text-yellow-600';
            case 'DELETE': return 'bg-red-600/20 text-red-500';
            case 'PATCH': return 'bg-purple-600/20 text-purple-500';
            default: return 'bg-gray-700 text-gray-400';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Search Modal */}
            <div className={`relative w-full max-w-xl ${bgColor} rounded-xl shadow-2xl border ${borderCol} overflow-hidden`}>
                {/* Search Input */}
                <div className={`flex items-center gap-3 p-4 border-b ${borderCol}`}>
                    <Search size={20} className={subTextColor} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search endpoints..."
                        className={`flex-1 bg-transparent outline-none ${textColor} placeholder:${subTextColor}`}
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className={`p-1 ${subTextColor} hover:text-indigo-400`}>
                            <X size={16} />
                        </button>
                    )}
                    <kbd className={`px-2 py-1 text-xs ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'} rounded`}>
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto">
                    {results.length === 0 ? (
                        <div className={`p-8 text-center ${subTextColor}`}>
                            No endpoints found
                        </div>
                    ) : (
                        results.map((result, idx) => (
                            <button
                                key={result.index}
                                onClick={() => {
                                    onSelect(result.index);
                                    onClose();
                                }}
                                className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                                    idx === selectedResultIdx 
                                        ? 'bg-indigo-600/20' 
                                        : 'hover:bg-gray-700/30'
                                }`}
                            >
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-12 text-center ${getMethodColor(result.endpoint.method)}`}>
                                    {result.endpoint.method}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-medium truncate ${textColor}`}>
                                        {result.endpoint.name || 'Untitled'}
                                    </div>
                                    <div className={`text-xs truncate ${subTextColor}`}>
                                        {result.endpoint.url || 'No URL'}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-between p-2 border-t ${borderCol} text-[10px] ${subTextColor}`}>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className={`px-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded`}>↑</kbd>
                            <kbd className={`px-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded`}>↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className={`px-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded`}>↵</kbd>
                            Select
                        </span>
                    </div>
                    <span>{results.length} results</span>
                </div>
            </div>
        </div>
    );
}
