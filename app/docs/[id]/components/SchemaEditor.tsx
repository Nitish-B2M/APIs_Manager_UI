'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface SchemaEditorProps {
    value: string;
    onChange: (value: string) => void;
    theme: 'light' | 'dark';
}

export function SchemaEditor({ value, onChange, theme }: SchemaEditorProps) {
    const [isValid, setIsValid] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!value) {
            setIsValid(true);
            setError(null);
            return;
        }

        try {
            JSON.parse(value);
            setIsValid(true);
            setError(null);
        } catch (e: any) {
            setIsValid(false);
            setError(e.message);
        }
    }, [value]);

    return (
        <div className="flex flex-col h-full min-h-[500px] bg-transparent overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700/20 bg-gray-800/10">
                <div className="flex items-center gap-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Response JSON Schema</h3>
                    {isValid ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                            <CheckCircle2 size={10} /> Valid JSON
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                            <AlertCircle size={10} /> Invalid JSON
                        </span>
                    )}
                </div>
                <div className="text-[9px] text-gray-500 italic">
                    Define expectations for your API response structure
                </div>
            </div>

            <div className="flex-1 min-h-[300px] relative">
                <Editor
                    height="100%"
                    language="json"
                    value={value || '{\n  "type": "object",\n  "properties": {\n    \n  }\n}'}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    onChange={(val) => onChange(val || '')}
                    options={{
                        fontSize: 13,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        padding: { top: 12, bottom: 12 },
                        lineNumbers: 'on',
                        folding: true,
                        renderLineHighlight: 'all',
                        contextmenu: true,
                    }}
                />
            </div>

            {error && (
                <div className="mt-2 px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-[11px] text-red-400 font-mono">
                    {error}
                </div>
            )}

            <div className="px-4 py-3 bg-indigo-600/5 mt-auto border-t border-indigo-500/10">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                    <span className="font-bold text-indigo-400 uppercase tracking-tighter">Tip:</span> Use JSON Schema (draft 7+) to validate property types, required fields, and nested structures. Successful validation results will appear in the response pane after sending a request.
                </p>
            </div>
        </div>
    );
}
