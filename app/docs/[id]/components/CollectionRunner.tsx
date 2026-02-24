'use client';

import React, { useState, useMemo } from 'react';
import {
    X, Play, Square, Clock, CheckCircle2, XCircle, Loader2,
    ChevronDown, ChevronRight, Zap, ArrowRight
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses, getMethodColor } from '../utils/theme';
import { useCollectionRunner, RunResult } from '../hooks/useCollectionRunner';
import { Endpoint } from '@/types';

interface CollectionRunnerProps {
    endpoints: Endpoint[];
    variables: Record<string, string>;
    onClose: () => void;
}

export function CollectionRunner({ endpoints, variables, onClose }: CollectionRunnerProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);

    const [delay, setDelay] = useState(200);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        () => new Set(endpoints.filter(e => e.id).map(e => e.id!))
    );
    const [showExtracted, setShowExtracted] = useState(false);
    const [expandedResult, setExpandedResult] = useState<string | null>(null);

    const { results, isRunning, currentIndex, runVariables, start, stop } = useCollectionRunner({ variables });

    const selectedEndpoints = useMemo(
        () => endpoints.filter(e => e.id && selectedIds.has(e.id)),
        [endpoints, selectedIds]
    );

    const toggleEndpoint = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === endpoints.filter(e => e.id).length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(endpoints.filter(e => e.id).map(e => e.id!)));
        }
    };

    const handleStart = () => start(selectedEndpoints, delay);

    const stats = useMemo(() => {
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        const totalTime = results.reduce((sum, r) => sum + r.time, 0);
        return { passed, failed, totalTime };
    }, [results]);

    const extractedVarCount = useMemo(() => {
        const originalKeys = Object.keys(variables);
        let count = 0;
        for (const key of originalKeys) {
            if (runVariables[key] && runVariables[key] !== variables[key]) count++;
        }
        return count;
    }, [runVariables, variables]);

    const getStatusBadge = (result: RunResult) => {
        if (result.passed) {
            return (
                <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                    <CheckCircle2 size={14} /> {result.status}
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-xs font-bold text-red-400">
                <XCircle size={14} /> {result.status || 'ERR'}
            </span>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className={`w-[840px] max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-[#1a1a2e] border border-gray-800' : 'bg-white border border-gray-200'
                }`}>
                {/* Header */}
                <div className={`px-6 py-4 flex items-center justify-between border-b ${themeClasses.borderCol}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-purple-600/20' : 'bg-purple-100'
                            }`}>
                            <Zap size={18} className="text-purple-500" />
                        </div>
                        <div>
                            <h2 className={`text-base font-bold ${themeClasses.textColor}`}>Collection Runner</h2>
                            <p className={`text-xs ${themeClasses.subTextColor}`}>
                                Run {selectedEndpoints.length} of {endpoints.length} requests sequentially
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-lg ${themeClasses.hoverBg} ${themeClasses.subTextColor} transition-colors`}>
                        <X size={18} />
                    </button>
                </div>

                {/* Controls Bar */}
                <div className={`px-6 py-3 flex items-center gap-4 border-b ${themeClasses.borderCol} ${theme === 'dark' ? 'bg-[#16162a]' : 'bg-gray-50'
                    }`}>
                    {!isRunning ? (
                        <button
                            onClick={handleStart}
                            disabled={selectedEndpoints.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-green-600/20"
                        >
                            <Play size={14} /> Run Collection
                        </button>
                    ) : (
                        <button
                            onClick={stop}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors shadow-md shadow-red-600/20"
                        >
                            <Square size={14} /> Stop
                        </button>
                    )}

                    <div className="flex items-center gap-2">
                        <label className={`text-xs font-medium ${themeClasses.subTextColor}`}>Delay</label>
                        <input
                            type="number"
                            min={0}
                            max={5000}
                            step={100}
                            value={delay}
                            onChange={e => setDelay(Number(e.target.value))}
                            disabled={isRunning}
                            className={`w-20 px-2 py-1 rounded-md text-xs border transition-colors ${theme === 'dark'
                                    ? 'bg-[#1e1e2e] border-gray-700 text-gray-200'
                                    : 'bg-white border-gray-300 text-gray-800'
                                } disabled:opacity-50`}
                        />
                        <span className={`text-xs ${themeClasses.subTextColor}`}>ms</span>
                    </div>

                    {results.length > 0 && (
                        <div className="flex items-center gap-3 ml-auto text-xs font-bold">
                            <span className="text-green-400">{stats.passed} passed</span>
                            <span className="text-red-400">{stats.failed} failed</span>
                            <span className={themeClasses.subTextColor}>
                                <Clock size={12} className="inline mr-1" />
                                {stats.totalTime}ms
                            </span>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
                    {/* Request checklist (before run) */}
                    {results.length === 0 && !isRunning && (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <button onClick={toggleAll} className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
                                    {selectedIds.size === endpoints.filter(e => e.id).length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            {endpoints.map((ep) => {
                                if (!ep.id) return null;
                                const isSelected = selectedIds.has(ep.id);
                                return (
                                    <label
                                        key={ep.id}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${isSelected
                                                ? theme === 'dark'
                                                    ? 'bg-[#22224a] border-purple-800/40'
                                                    : 'bg-blue-50 border-blue-200'
                                                : theme === 'dark'
                                                    ? 'bg-[#1e1e36] border-transparent hover:bg-[#25254a]'
                                                    : 'bg-gray-50 border-transparent hover:bg-gray-100'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleEndpoint(ep.id!)}
                                            className="accent-purple-500"
                                        />
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getMethodColor(ep.method, theme)}`}>
                                            {ep.method}
                                        </span>
                                        <span className={`text-xs font-medium truncate ${themeClasses.textColor}`}>
                                            {ep.name || ep.url}
                                        </span>
                                        <span className={`text-[10px] ml-auto truncate max-w-[280px] ${themeClasses.subTextColor}`}>
                                            {ep.url}
                                        </span>
                                    </label>
                                );
                            })}
                        </>
                    )}

                    {/* Live results (during/after run) */}
                    {(isRunning || results.length > 0) && (
                        <>
                            {selectedEndpoints.map((ep, idx) => {
                                const result = results[idx];
                                const isCurrent = isRunning && idx === currentIndex;
                                const isPending = !result && !isCurrent;

                                return (
                                    <div key={ep.id}>
                                        <div
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border ${isCurrent
                                                    ? theme === 'dark'
                                                        ? 'bg-blue-900/20 border-blue-700/40 ring-1 ring-blue-600/30'
                                                        : 'bg-blue-50 border-blue-300 ring-1 ring-blue-200'
                                                    : result?.passed
                                                        ? theme === 'dark'
                                                            ? 'bg-green-900/10 border-green-800/30'
                                                            : 'bg-green-50 border-green-200'
                                                        : result && !result.passed
                                                            ? theme === 'dark'
                                                                ? 'bg-red-900/10 border-red-800/30'
                                                                : 'bg-red-50 border-red-200'
                                                            : theme === 'dark'
                                                                ? 'bg-[#1e1e36] border-transparent'
                                                                : 'bg-gray-50 border-transparent'
                                                }`}
                                        >
                                            {/* Status icon */}
                                            <div className="w-5 flex items-center justify-center">
                                                {isCurrent && <Loader2 size={14} className="animate-spin text-blue-400" />}
                                                {result?.passed && <CheckCircle2 size={14} className="text-green-400" />}
                                                {result && !result.passed && <XCircle size={14} className="text-red-400" />}
                                                {isPending && <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} />}
                                            </div>

                                            {/* Method */}
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getMethodColor(ep.method, theme)}`}>
                                                {ep.method}
                                            </span>

                                            {/* Name */}
                                            <span className={`text-xs font-medium truncate flex-1 ${themeClasses.textColor}`}>
                                                {ep.name || ep.url}
                                            </span>

                                            {/* Result info */}
                                            {result && (
                                                <div className="flex items-center gap-3 ml-auto">
                                                    {getStatusBadge(result)}
                                                    <span className={`text-[10px] font-mono ${themeClasses.subTextColor}`}>
                                                        {result.time}ms
                                                    </span>
                                                    <button
                                                        onClick={() => setExpandedResult(expandedResult === ep.id ? null : ep.id!)}
                                                        className={`p-1 rounded ${themeClasses.hoverBg} ${themeClasses.subTextColor} transition-colors`}
                                                    >
                                                        {expandedResult === ep.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Expanded response detail */}
                                        {result && expandedResult === ep.id && (
                                            <div className={`ml-8 mt-1 mb-2 p-3 rounded-lg text-xs font-mono max-h-40 overflow-y-auto border ${theme === 'dark' ? 'bg-[#12122a] border-gray-800 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'
                                                }`}>
                                                {result.error && <p className="text-red-400 mb-2">{result.error}</p>}
                                                <pre className="whitespace-pre-wrap break-all">
                                                    {result.responseData
                                                        ? JSON.stringify(result.responseData, null, 2)
                                                        : 'No response body'
                                                    }
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Extracted variables panel */}
                            {extractedVarCount > 0 && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => setShowExtracted(!showExtracted)}
                                        className={`flex items-center gap-2 text-xs font-bold ${themeClasses.subTextColor} hover:text-purple-400 transition-colors`}
                                    >
                                        {showExtracted ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                        <ArrowRight size={12} />
                                        {extractedVarCount} variable{extractedVarCount > 1 ? 's' : ''} updated during run
                                    </button>
                                    {showExtracted && (
                                        <div className={`mt-2 rounded-lg p-3 border space-y-1 ${theme === 'dark' ? 'bg-[#12122a] border-gray-800' : 'bg-gray-50 border-gray-200'
                                            }`}>
                                            {Object.entries(runVariables)
                                                .filter(([key]) => runVariables[key] !== variables[key])
                                                .map(([key, val]) => (
                                                    <div key={key} className="flex items-center gap-2 text-xs">
                                                        <code className="text-purple-400">{`{{${key}}}`}</code>
                                                        <ArrowRight size={10} className={themeClasses.subTextColor} />
                                                        <code className="text-green-400 truncate max-w-[400px]">{val}</code>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer with summary bar */}
                {results.length > 0 && !isRunning && (
                    <div className={`px-6 py-3 border-t ${themeClasses.borderCol} ${theme === 'dark' ? 'bg-[#16162a]' : 'bg-gray-50'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 flex-1">
                                {/* Mini progress bar */}
                                {results.map((r, i) => (
                                    <div
                                        key={i}
                                        className={`h-2 flex-1 rounded-full ${r.passed ? 'bg-green-500' : 'bg-red-500'}`}
                                        title={`${r.name}: ${r.status}`}
                                    />
                                ))}
                            </div>
                            <div className={`ml-4 text-xs font-bold ${themeClasses.subTextColor}`}>
                                {stats.passed}/{results.length} passed · {stats.totalTime}ms total
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
