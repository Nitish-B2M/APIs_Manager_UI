'use client';
import { useState } from 'react';
import { Play, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../context/ThemeContext';

interface EndpointCardProps {
    endpoint: any;
    variables: Record<string, string>;
}

export default function EndpointCard({ endpoint, variables }: EndpointCardProps) {
    const { theme } = useTheme();
    const [mode, setMode] = useState<'view' | 'run'>('view');
    const [url, setUrl] = useState(endpoint.url || '');
    const [body, setBody] = useState(endpoint.body?.raw || '');
    const [response, setResponse] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Helper to replace variables like {{WA}}
    const replaceVariables = (text: string) => {
        let result = text;
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, value);
        });
        return result;
    };

    const handleSend = async () => {
        setLoading(true);
        setResponse(null);

        try {
            const finalUrl = replaceVariables(url);
            const finalBody = body ? replaceVariables(body) : undefined;
            const headers = (endpoint.headers || []).reduce((acc: any, h: any) => {
                acc[h.key] = replaceVariables(h.value);
                return acc;
            }, {});

            // Default content-type if body exists
            if (finalBody && !headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }

            const startTime = Date.now();
            const res = await fetch(finalUrl, {
                method: endpoint.method,
                headers,
                body: ['GET', 'HEAD'].includes(endpoint.method) ? undefined : finalBody
            });
            const endTime = Date.now();

            let responseData;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await res.json();
            } else {
                responseData = await res.text();
            }

            setResponse({
                status: res.status,
                statusText: res.statusText,
                time: endTime - startTime,
                data: responseData
            });
        } catch (e: any) {
            setResponse({
                error: true,
                message: e.message
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`rounded-xl shadow-sm p-6 border transition-all duration-300 ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 hover:shadow-md'}`}>
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <span className={`px-3 py-1 rounded font-semibold text-sm h-fit ${endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                    endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                        endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                            endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                    }`}>
                    {endpoint.method}
                </span>

                <div className="flex-1 flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-gray-800">{endpoint.name}</h3>
                    {mode === 'view' ? (
                        <code className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded mt-1 inline-block border border-gray-200">
                            {endpoint.url}
                        </code>
                    ) : (
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    )}
                </div>

                <button
                    onClick={() => setMode(mode === 'view' ? 'run' : 'view')}
                    className="text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded font-medium transition-colors"
                >
                    {mode === 'view' ? 'Try it' : 'Back to Docs'}
                </button>

                {mode === 'run' && (
                    <button
                        onClick={handleSend}
                        disabled={loading}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-all font-medium text-sm"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        Send
                    </button>
                )}
            </div>

            {endpoint.description && (
                <p className="text-gray-600 mb-4 text-sm">{endpoint.description}</p>
            )}

            {/* Run Mode Inputs */}
            {mode === 'run' && (
                <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2 text-sm uppercase tracking-wide">Request Configuration</h4>

                    {/* Headers (Read Only for now or editable if needed, simplifying to Body for first pass) */}

                    {['POST', 'PUT', 'PATCH'].includes(endpoint.method) && (
                        <div className="mt-4">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Body (JSON)</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="w-full h-40 font-mono text-sm p-3 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Response Section */}
            {mode === 'run' && response && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-700 text-sm uppercase tracking-wide">Response</h4>
                        <div className="flex gap-4 text-xs">
                            <span className={response.status >= 200 && response.status < 300 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                {response.status} {response.statusText}
                            </span>
                            <span className="text-gray-500">{response.time}ms</span>
                        </div>
                    </div>
                    {response.error ? (
                        <div className="p-3 bg-red-50 text-red-700 rounded text-sm border border-red-200">
                            Error: {response.message}
                        </div>
                    ) : (
                        <div className={`rounded-xl overflow-hidden border ${theme === 'dark' ? 'bg-[#1e1e1e] border-gray-800' : 'bg-[#fafafa] border-gray-200 shadow-inner'}`}>
                            <SyntaxHighlighter
                                style={theme === 'dark' ? vscDarkPlus : materialLight}
                                language="json"
                                PreTag="div"
                                customStyle={{
                                    margin: 0,
                                    padding: '1.5rem',
                                    backgroundColor: 'transparent',
                                    fontSize: '13px',
                                    lineHeight: '1.5'
                                }}
                            >
                                {typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)}
                            </SyntaxHighlighter>
                        </div>
                    )}
                </div>
            )}

            {/* View Mode: Original Code Blocks */}
            {mode === 'view' && endpoint.body && endpoint.body.raw && (
                <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2 text-sm uppercase tracking-wide">Request Body</h4>
                    <div className={`mb-4 rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <SyntaxHighlighter
                            style={theme === 'dark' ? vscDarkPlus : materialLight}
                            language="json"
                            customStyle={{ margin: 0, padding: '1.25rem', backgroundColor: 'transparent', fontSize: '13px' }}
                        >
                            {(() => {
                                try {
                                    return JSON.stringify(JSON.parse(endpoint.body.raw), null, 2);
                                } catch {
                                    return endpoint.body.raw;
                                }
                            })()}
                        </SyntaxHighlighter>
                    </div>
                </div>
            )}

            {mode === 'view' && endpoint.response && endpoint.response.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="font-medium text-gray-700 mb-2 text-sm uppercase tracking-wide">Response Example</h4>
                    {endpoint.response.map((resp: any, i: number) => (
                        <div key={i} className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold px-2 py-0.5 bg-gray-200 rounded text-gray-700">
                                    {resp.code} {resp.status}
                                </span>
                            </div>
                            {resp.body && (
                                <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                    <SyntaxHighlighter
                                        style={theme === 'dark' ? vscDarkPlus : materialLight}
                                        language="json"
                                        customStyle={{ margin: 0, padding: '1.25rem', backgroundColor: 'transparent', fontSize: '13px' }}
                                    >
                                        {(() => {
                                            try {
                                                return JSON.stringify(JSON.parse(resp.body), null, 2);
                                            } catch {
                                                return resp.body;
                                            }
                                        })()}
                                    </SyntaxHighlighter>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
