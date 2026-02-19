'use client';

import React, { useState, useEffect } from 'react';
import { Check, Copy, Terminal, Code2, FileCode } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../../../context/ThemeContext';
import { generateAllSnippets } from '../../../../utils/codeGenerator';
import { resolveAll, resolveHeaders, resolveUrl } from '../../../../utils/variables';

interface CodeSnippetsProps {
    request: any;
    variables: Record<string, string>;
    requestId?: string; // Kept for compatibility if needed, but unused
}

const LANGUAGES = [
    { key: 'curl', label: 'cURL', icon: Terminal },
    { key: 'javascript', label: 'JavaScript', icon: Code2 },
    { key: 'python', label: 'Python', icon: FileCode },
    { key: 'go', label: 'Go', icon: FileCode },
    { key: 'php', label: 'PHP', icon: FileCode },
] as const;

export default function CodeSnippets({ request, variables }: CodeSnippetsProps) {
    const { theme } = useTheme();
    const [snippets, setSnippets] = useState<Record<string, string>>({});
    const [activeLanguage, setActiveLanguage] = useState('curl');
    const [copiedLang, setCopiedLang] = useState<string | null>(null);

    useEffect(() => {
        if (!request) return;

        // Resolve variables locally without modifying original request
        const resolvedUrl = resolveUrl(request, variables);
        const resolvedHeaders = resolveHeaders(request.headers || [], variables, request);

        let resolvedBody;
        if (request.body?.raw) {
            resolvedBody = {
                ...request.body,
                raw: resolveAll(request.body.raw, variables, request)
            };
        } else {
            resolvedBody = request.body;
        }

        const input = {
            method: request.method || 'GET',
            url: resolvedUrl,
            headers: resolvedHeaders,
            body: resolvedBody
        };

        const generated = generateAllSnippets(input);
        setSnippets(generated);
    }, [request, variables]);

    const handleCopy = (lang: string) => {
        const code = snippets[lang];
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopiedLang(lang);
        setTimeout(() => setCopiedLang(null), 2000);
    };

    const codeBg = theme === 'dark' ? 'bg-gray-950' : 'bg-gray-900';
    const tabBg = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
    const activeBg = theme === 'dark' ? 'bg-indigo-600' : 'bg-indigo-600';
    const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

    if (!request) {
        return (
            <div className={`p-6 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                Select a request to generate code snippets
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Language tabs */}
            <div className={`flex items-center gap-1 p-2 ${tabBg} border-b ${borderColor}`}>
                {LANGUAGES.map(lang => {
                    const Icon = lang.icon;
                    const isActive = activeLanguage === lang.key;
                    return (
                        <button
                            key={lang.key}
                            onClick={() => setActiveLanguage(lang.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isActive
                                ? `${activeBg} text-white shadow-sm`
                                : `${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`
                                }`}
                        >
                            <Icon size={12} />
                            {lang.label}
                        </button>
                    );
                })}
            </div>

            {/* Code body */}
            <div className="flex-1 relative overflow-auto">
                <button
                    onClick={() => handleCopy(activeLanguage)}
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-xs transition-all z-10"
                    title="Copy to clipboard"
                >
                    {copiedLang === activeLanguage ? (
                        <><Check size={12} className="text-green-400" /> Copied</>
                    ) : (
                        <><Copy size={12} /> Copy</>
                    )}
                </button>
                <div className={`${codeBg} h-full overflow-hidden flex flex-col`}>
                    <SyntaxHighlighter
                        language={activeLanguage === 'curl' ? 'bash' : activeLanguage}
                        style={theme === 'dark' ? vscDarkPlus : materialLight}
                        customStyle={{
                            margin: 0,
                            padding: '3rem 1rem 1rem 1rem', // Top padding for copy button
                            height: '100%',
                            fontSize: '13px',
                            lineHeight: '1.5',
                            background: 'transparent'
                        }}
                    >
                        {snippets[activeLanguage] || '// No snippet available'}
                    </SyntaxHighlighter>
                </div>
            </div>
        </div>
    );
}
