'use client';

import React, { useState, useMemo } from 'react';
import {
    X, Play, Square, Clock, CheckCircle2, XCircle, Loader2,
    ChevronDown, ChevronRight, Zap, ArrowRight, Code2, Link2
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
    const [isChainingEnabled, setIsChainingEnabled] = useState(true);
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

    const handleStart = () => start(selectedEndpoints, delay, isChainingEnabled);

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
            <div className="max-h-[85vh] overflow-hidden flex flex-col" style={{ background: '#161B22', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', minWidth: 640, maxWidth: '78vw', width: '72vw' }} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(36,157,159,0.1)', color: '#249d9f', flexShrink: 0 }}>
                        <Zap size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF3', margin: 0 }}>Collection Runner</h2>
                        <p style={{ fontSize: 13, color: '#8B949E', margin: '2px 0 0' }}>Run {selectedEndpoints.length} of {endpoints.length} requests sequentially</p>
                    </div>
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B949E', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>

                {/* Controls: Run button full-width + delay right-aligned */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: results.length > 0 ? 12 : 0 }}>
                        {!isRunning ? (
                            <button
                                onClick={handleStart}
                                disabled={selectedEndpoints.length === 0}
                                style={{ flex: 1, height: 44, borderRadius: 8, background: '#249d9f', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: selectedEndpoints.length === 0 ? 0.4 : 1 }}
                            >
                                <Play size={16} /> Run Collection
                            </button>
                        ) : (
                            <button
                                onClick={stop}
                                style={{ flex: 1, height: 44, borderRadius: 8, background: '#F85149', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                <Square size={16} /> Stop
                            </button>
                        )}

                        {/* Delay stepper — right-aligned */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 12, color: '#6E7681' }}>Delay</span>
                            <div style={{ display: 'flex', alignItems: 'center', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                <button onClick={() => setDelay(Math.max(0, delay - 100))} disabled={isRunning} style={{ width: 28, height: 32, background: '#21262D', border: 'none', color: '#8B949E', cursor: 'pointer', fontSize: 14 }}>−</button>
                                <input
                                    type="number" min={0} max={5000} step={100} value={delay}
                                    onChange={e => setDelay(Number(e.target.value))} disabled={isRunning}
                                    style={{ width: 56, height: 32, textAlign: 'center', background: '#161B22', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', color: '#E6EDF3', fontSize: 12, outline: 'none' }}
                                />
                                <button onClick={() => setDelay(Math.min(5000, delay + 100))} disabled={isRunning} style={{ width: 28, height: 32, background: '#21262D', border: 'none', color: '#8B949E', cursor: 'pointer', fontSize: 14 }}>+</button>
                            </div>
                            <span style={{ fontSize: 11, color: '#6E7681' }}>ms</span>
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8B949E', cursor: 'pointer', marginTop: 8 }}>
                        <input type="checkbox" checked={isChainingEnabled} onChange={e => setIsChainingEnabled(e.target.checked)} className="accent-[#249d9f]" />
                        Variable Chaining — pass extracted variables between requests
                    </label>

                    {results.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, fontWeight: 600, marginTop: 8 }}>
                            <span style={{ color: '#3FB950' }}>{stats.passed} passed</span>
                            <span style={{ color: '#F85149' }}>{stats.failed} failed</span>
                            <span style={{ color: '#8B949E' }}><Clock size={11} className="inline mr-1" />{stats.totalTime}ms</span>
                        </div>
                    )}
                </div>

                {/* Request list */}
                <div className="flex-1 overflow-y-auto" style={{ padding: '16px 24px' }}>
                    {results.length === 0 && !isRunning && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <button onClick={toggleAll} style={{ fontSize: 12, color: '#249d9f', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                                    {selectedIds.size === endpoints.filter(e => e.id).length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            {endpoints.map((ep) => {
                                if (!ep.id) return null;
                                const isSelected = selectedIds.has(ep.id);
                                const displayLabel = ep.protocol === 'WS' ? 'WS' : ep.protocol === 'SSE' ? 'SSE' : ep.protocol === 'GRAPHQL' ? 'GQL' : ep.method;
                                const dotColor = ep.protocol === 'WS' ? '#BC8CFF' : ep.protocol === 'SSE' ? '#D29922' : ep.protocol === 'GRAPHQL' ? '#FF6B9D' : ep.method === 'GET' ? '#3FB950' : ep.method === 'POST' ? '#58A6FF' : ep.method === 'DELETE' ? '#F85149' : ep.method === 'PATCH' ? '#D29922' : '#8B949E';
                                return (
                                    <label
                                        key={ep.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                                            borderRadius: 8, cursor: 'pointer', marginBottom: 4, transition: 'all 0.15s',
                                            background: isSelected ? '#1C2128' : 'transparent',
                                            border: `1px solid ${isSelected ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                                        }}
                                    >
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleEndpoint(ep.id!)} className="accent-[#249d9f]" />
                                        {/* Colored dot by method */}
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                                        <span style={{ fontSize: 10, fontWeight: 600, color: dotColor, width: 42, flexShrink: 0 }}>{displayLabel}</span>
                                        <span style={{ fontSize: 13, fontWeight: 500, color: '#E6EDF3', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {ep.name || ep.url}
                                        </span>
                                        {((ep as any).pre_script || (ep as any).post_script) && (
                                            <span title="Has pre/post scripts"><Code2 size={12} style={{ color: '#249d9f', flexShrink: 0 }} /></span>
                                        )}
                                        {(() => {
                                            const VAR_RE = /\{\{\s*\w+\s*\}\}/;
                                            const usesVars = VAR_RE.test(ep.url || '')
                                                || (ep.headers || []).some((h: any) => VAR_RE.test(h.value || ''))
                                                || VAR_RE.test(ep.body?.raw || '')
                                                || VAR_RE.test(JSON.stringify((ep as any).auth || {}));
                                            return usesVars ? <span title="Depends on variables from earlier requests"><Link2 size={12} style={{ color: '#D29922', flexShrink: 0 }} /></span> : null;
                                        })()}
                                        <span style={{ fontSize: 11, color: '#6E7681', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
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

                                        {/* Expanded response + script detail */}
                                        {result && expandedResult === ep.id && (
                                            <div className={`ml-8 mt-1 mb-2 rounded-lg text-xs font-mono overflow-hidden border ${theme === 'dark' ? 'bg-[#0D1117] border-gray-800 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                                                {/* Script outputs */}
                                                {(result.preScriptResult || result.postScriptResult) && (
                                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #21262D' }}>
                                                        {result.preScriptResult && (
                                                            <div style={{ marginBottom: result.postScriptResult ? 6 : 0 }}>
                                                                <span style={{ fontSize: 9, fontWeight: 700, color: '#484F58', textTransform: 'uppercase', letterSpacing: 1 }}>Pre-script</span>
                                                                {result.preScriptResult.output.map((line: string, li: number) => (
                                                                    <div key={li} style={{ color: line.startsWith('✓') ? '#3FB950' : line.startsWith('✗') ? '#F85149' : '#8B949E' }}>{line}</div>
                                                                ))}
                                                                {result.preScriptResult.error && <div style={{ color: '#F85149' }}>{result.preScriptResult.error}</div>}
                                                            </div>
                                                        )}
                                                        {result.postScriptResult && (
                                                            <div>
                                                                <span style={{ fontSize: 9, fontWeight: 700, color: '#484F58', textTransform: 'uppercase', letterSpacing: 1 }}>Post-script</span>
                                                                {result.postScriptResult.output.map((line: string, li: number) => (
                                                                    <div key={li} style={{ color: line.startsWith('✓') ? '#3FB950' : line.startsWith('✗') ? '#F85149' : '#8B949E' }}>{line}</div>
                                                                ))}
                                                                {result.postScriptResult.error && <div style={{ color: '#F85149' }}>{result.postScriptResult.error}</div>}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Response body */}
                                                <div style={{ padding: '8px 12px', maxHeight: 160, overflowY: 'auto' }}>
                                                    {result.error && <p className="text-red-400 mb-2">{result.error}</p>}
                                                    <pre className="whitespace-pre-wrap break-all">
                                                        {result.responseData ? JSON.stringify(result.responseData, null, 2) : 'No response body'}
                                                    </pre>
                                                </div>
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
                                        className={`flex items-center gap-2 text-xs font-bold ${themeClasses.subTextColor} hover:text-[#2ec4c7] transition-colors`}
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
                                                        <code className="text-[#2ec4c7]">{`{{${key}}}`}</code>
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
