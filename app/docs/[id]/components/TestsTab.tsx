'use client';

import React from 'react';
import { Plus, Trash2, FlaskConical, Sparkles, Loader2 } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { RequestAssertion, AssertionType } from '@/types';

interface TestsTabProps {
    assertions: RequestAssertion[];
    canEdit: boolean;
    onChange: (assertions: RequestAssertion[]) => void;
    aiEnabled?: boolean;
    method: string;
    url: string;
    lastResponse: any;
    onAiGenerateTests?: (assertions: any[]) => void;
}

const ASSERTION_TYPES: { value: AssertionType; label: string; placeholder: string; hasProperty: boolean }[] = [
    { value: 'status_code', label: 'Status Code', placeholder: '200', hasProperty: false },
    { value: 'response_time', label: 'Response Time (ms) <', placeholder: '500', hasProperty: false },
    { value: 'body_contains', label: 'Body Contains', placeholder: '"success"', hasProperty: false },
    { value: 'json_value', label: 'JSON Value', placeholder: 'expected value', hasProperty: true },
];

function generateId() {
    return Math.random().toString(36).slice(2, 9);
}

export function TestsTab({
    assertions,
    canEdit,
    onChange,
    aiEnabled,
    method,
    url,
    lastResponse,
    onAiGenerateTests
}: TestsTabProps) {
    const { theme } = useTheme();
    const [isGenerating, setIsGenerating] = React.useState(false);
    const themeClasses = getThemeClasses(theme);

    const handleAdd = () => {
        onChange([...assertions, { id: generateId(), type: 'status_code', expected: '200' }]);
    };

    const handleRemove = (id: string) => {
        onChange(assertions.filter(a => a.id !== id));
    };

    const handleChange = (id: string, updates: Partial<RequestAssertion>) => {
        onChange(assertions.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const handleAiGenerate = async () => {
        if (!onAiGenerateTests || isGenerating) return;
        setIsGenerating(true);
        try {
            await onAiGenerateTests([]); // Triggers the parent hook to call API
        } finally {
            setIsGenerating(false);
        }
    };

    const inputCls = `w-full px-3 py-1.5 rounded-lg text-xs border transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500/40 ${theme === 'dark'
        ? 'bg-[#1e1e36] border-gray-700 text-gray-200 placeholder-gray-600'
        : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
        }`;

    const selectCls = `px-2 py-1.5 rounded-lg text-xs border transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500/40 ${theme === 'dark'
        ? 'bg-[#1e1e36] border-gray-700 text-gray-200'
        : 'bg-white border-gray-300 text-gray-800'
        }`;

    return (
        <div className="p-4 min-h-[200px] flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${themeClasses.subTextColor}`}>
                    Assertions ({assertions.length})
                </span>
                {canEdit && (
                    <div className="flex items-center gap-3">
                        {aiEnabled && lastResponse && (
                            <button
                                onClick={handleAiGenerate}
                                disabled={isGenerating}
                                className={`flex items-center gap-1.5 text-[10px] font-bold transition-all ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'text-purple-400 hover:text-purple-300'
                                    }`}
                            >
                                {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                AI GENERATE
                            </button>
                        )}
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                        >
                            <Plus size={11} /> ADD ASSERTION
                        </button>
                    </div>
                )}
            </div>

            {/* Empty state */}
            {assertions.length === 0 && (
                <div className={`flex-1 flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed rounded-xl ${theme === 'dark' ? 'border-gray-800 text-gray-600' : 'border-gray-200 text-gray-400'
                    }`}>
                    <FlaskConical size={28} className="opacity-40" />
                    <div className="text-center">
                        <p className="text-xs font-semibold">No assertions yet</p>
                        <p className="text-[10px] mt-0.5 opacity-70">Add assertions to validate the response automatically after each request.</p>
                    </div>
                    {canEdit && (
                        <button
                            onClick={handleAdd}
                            className="mt-1 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                        >
                            Add First Assertion
                        </button>
                    )}
                </div>
            )}

            {/* Assertion rows */}
            <div className="space-y-2">
                {assertions.map((assertion) => {
                    const typeDef = ASSERTION_TYPES.find(t => t.value === assertion.type)!;
                    return (
                        <div
                            key={assertion.id}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border ${theme === 'dark'
                                ? 'bg-[#1e1e36] border-gray-800'
                                : 'bg-gray-50 border-gray-200'
                                }`}
                        >
                            {/* Type selector */}
                            <select
                                value={assertion.type}
                                disabled={!canEdit}
                                onChange={e => handleChange(assertion.id, {
                                    type: e.target.value as AssertionType,
                                    property: undefined,
                                    expected: ''
                                })}
                                className={selectCls}
                            >
                                {ASSERTION_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>

                            {/* Property (JSON path) — only for json_value */}
                            {typeDef.hasProperty && (
                                <input
                                    type="text"
                                    value={assertion.property || ''}
                                    disabled={!canEdit}
                                    onChange={e => handleChange(assertion.id, { property: e.target.value })}
                                    placeholder="data.user.id"
                                    className={`${inputCls} flex-1`}
                                />
                            )}

                            {/* Expected value */}
                            <input
                                type="text"
                                value={assertion.expected}
                                disabled={!canEdit}
                                onChange={e => handleChange(assertion.id, { expected: e.target.value })}
                                placeholder={typeDef.placeholder}
                                className={`${inputCls} ${typeDef.hasProperty ? 'flex-1' : 'flex-[2]'}`}
                            />

                            {/* Delete */}
                            {canEdit && (
                                <button
                                    onClick={() => handleRemove(assertion.id)}
                                    className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${theme === 'dark'
                                        ? 'text-gray-600 hover:bg-red-900/30 hover:text-red-400'
                                        : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
                                        }`}
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
