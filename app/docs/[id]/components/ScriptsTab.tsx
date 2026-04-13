'use client';

import React, { useState, memo } from 'react';
import { Play, ChevronDown, Copy, Trash2, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';

const Editor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => <div style={{ height: 200, background: '#0D1117' }} />,
});

interface ScriptResult {
    success: boolean;
    output: string[];
    variables?: Record<string, string>;
    error?: string;
    duration: number;
}

interface ScriptsTabProps {
    preScript: string;
    postScript: string;
    canEdit: boolean;
    onChange: (updates: { pre_script?: string; post_script?: string }) => void;
    lastPreResult?: ScriptResult | null;
    lastPostResult?: ScriptResult | null;
}

const SNIPPETS = [
    { label: 'Set variable from response', code: `const data = pm.response.json();\npm.variables.set("token", data.token);` },
    { label: 'Assert status 200', code: `pm.test("Status is 200", () => {\n  pm.expect(pm.response.code).to.equal(200);\n});` },
    { label: 'Assert response time < 500ms', code: `pm.test("Response time < 500ms", () => {\n  pm.expect(pm.response.responseTime).to.be.below(500);\n});` },
    { label: 'Assert body contains key', code: `pm.test("Has userId", () => {\n  pm.expect(pm.response.json()).to.have.property("userId");\n});` },
    { label: 'Extract and set header', code: `const token = pm.response.headers["authorization"];\npm.variables.set("authToken", token);` },
    { label: 'Log response body', code: `console.log("Response:", pm.response.json());` },
    { label: 'Set timestamp variable', code: `pm.variables.set("timestamp", new Date().toISOString());` },
    { label: 'Generate random UUID', code: `const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {\n  const r = Math.random() * 16 | 0;\n  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);\n});\npm.variables.set("randomId", uuid);` },
];

export const ScriptsTab = memo(({ preScript, postScript, canEdit, onChange, lastPreResult, lastPostResult }: ScriptsTabProps) => {
    const [activeSection, setActiveSection] = useState<'pre' | 'post'>('pre');
    const [snippetsOpen, setSnippetsOpen] = useState(false);

    const currentScript = activeSection === 'pre' ? preScript : postScript;
    const currentResult = activeSection === 'pre' ? lastPreResult : lastPostResult;
    const fieldKey = activeSection === 'pre' ? 'pre_script' : 'post_script';

    const insertSnippet = (code: string) => {
        const updated = currentScript ? `${currentScript}\n\n${code}` : code;
        onChange({ [fieldKey]: updated });
        setSnippetsOpen(false);
        toast.success('Snippet inserted');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {/* Tab switcher: Pre / Post */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 12px', borderBottom: '1px solid #21262D', flexShrink: 0 }}>
                {(['pre', 'post'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveSection(tab)}
                        style={{
                            padding: '10px 16px', fontSize: 12, fontWeight: 500, border: 'none', background: 'transparent',
                            color: activeSection === tab ? '#E6EDF3' : '#6E7681',
                            borderBottom: activeSection === tab ? '2px solid #249d9f' : '2px solid transparent',
                            cursor: 'pointer',
                        }}
                    >
                        {tab === 'pre' ? 'Pre-request' : 'Post-response'}
                        {(tab === 'pre' ? preScript : postScript) && (
                            <span style={{ width: 5, height: 5, borderRadius: 3, background: '#249d9f', display: 'inline-block', marginLeft: 6 }} />
                        )}
                    </button>
                ))}

                <div style={{ flex: 1 }} />

                {/* Snippets dropdown */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setSnippetsOpen(!snippetsOpen)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6,
                            background: '#21262D', border: '1px solid #30363D', color: '#8B949E', fontSize: 11, cursor: 'pointer',
                        }}
                    >
                        Snippets <ChevronDown size={12} />
                    </button>
                    {snippetsOpen && (
                        <div style={{
                            position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 280, maxHeight: 300,
                            background: '#161B22', border: '1px solid #30363D', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            zIndex: 50, overflowY: 'auto',
                        }}>
                            {SNIPPETS.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => insertSnippet(s.code)}
                                    style={{
                                        display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                                        background: 'transparent', border: 'none', color: '#E6EDF3', fontSize: 12,
                                        borderBottom: '1px solid #21262D', cursor: 'pointer',
                                    }}
                                    className="hover:bg-white/5"
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {currentScript && (
                    <button
                        onClick={() => onChange({ [fieldKey]: '' })}
                        title="Clear script"
                        style={{ padding: 5, borderRadius: 6, background: 'none', border: 'none', color: '#6E7681', cursor: 'pointer', marginLeft: 4 }}
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>

            {/* Editor */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <Editor
                    height="100%"
                    language="javascript"
                    value={currentScript || ''}
                    onChange={(value) => { if (canEdit) onChange({ [fieldKey]: value || '' }); }}
                    theme="vs-dark"
                    options={{
                        readOnly: !canEdit,
                        fontSize: 13,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        padding: { top: 12, bottom: 12 },
                        lineNumbers: 'on',
                        renderLineHighlight: 'none',
                        tabSize: 2,
                        placeholder: activeSection === 'pre'
                            ? '// Runs before the request is sent\n// Use pm.variables.set("key", "value") to set variables\n'
                            : '// Runs after the response is received\n// Use pm.response.json() to access response body\n// Use pm.test("name", () => { ... }) to write tests\n',
                    }}
                />
            </div>

            {/* Console output */}
            {currentResult && (
                <div style={{ flexShrink: 0, borderTop: '1px solid #21262D', maxHeight: 180, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#0D1117' }}>
                        {currentResult.success
                            ? <CheckCircle2 size={13} style={{ color: '#3FB950' }} />
                            : <XCircle size={13} style={{ color: '#F85149' }} />}
                        <span style={{ fontSize: 11, fontWeight: 600, color: currentResult.success ? '#3FB950' : '#F85149' }}>
                            {currentResult.success ? 'Passed' : 'Failed'}
                        </span>
                        <span style={{ fontSize: 10, color: '#484F58' }}>
                            <Clock size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                            {currentResult.duration}ms
                        </span>
                        {currentResult.error && (
                            <span style={{ fontSize: 11, color: '#F85149', marginLeft: 'auto' }}>
                                <AlertTriangle size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                {currentResult.error}
                            </span>
                        )}
                    </div>
                    {currentResult.output.length > 0 && (
                        <div style={{ padding: '4px 12px 8px', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}>
                            {currentResult.output.map((line, i) => (
                                <div key={i} style={{
                                    color: line.startsWith('✓') ? '#3FB950' : line.startsWith('✗') ? '#F85149' : line.startsWith('[error]') ? '#F85149' : line.startsWith('[warn]') ? '#D29922' : '#8B949E',
                                }}>
                                    {line}
                                </div>
                            ))}
                        </div>
                    )}
                    {currentResult.variables && Object.keys(currentResult.variables).length > 0 && (
                        <div style={{ padding: '4px 12px 8px', borderTop: '1px solid #161B22' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#484F58', textTransform: 'uppercase', letterSpacing: 1 }}>Extracted Variables</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                {Object.entries(currentResult.variables).map(([k, v]) => (
                                    <span key={k} style={{
                                        fontSize: 10, padding: '2px 8px', borderRadius: 4,
                                        background: '#1C2128', border: '1px solid #21262D', color: '#8B949E', fontFamily: 'monospace',
                                    }}>
                                        <span style={{ color: '#249d9f' }}>{k}</span>
                                        <span style={{ color: '#484F58', margin: '0 4px' }}>=</span>
                                        <span style={{ color: '#E6EDF3' }}>{String(v).substring(0, 40)}{String(v).length > 40 ? '...' : ''}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

ScriptsTab.displayName = 'ScriptsTab';
