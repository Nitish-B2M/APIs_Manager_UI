'use client';
import { api } from '../../../utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Download, Layout, Settings, Save, Share2, Plus, Sparkles, Send, Copy, Trash2, ChevronLeft, ChevronRight, Columns2, Rows2, FileText, CheckCircle2, Clock, History, X, RotateCcw, MoreVertical, GripVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import EndpointCard from '../../components/EndpointCard';
import EnvModal from '../../components/EnvModal';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ApiClient() {
    const { id } = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();

    // Queries & Mutations
    const { data: doc, isLoading, error } = useQuery<any>({
        queryKey: ['doc', id],
        queryFn: () => api.documentation.getById(id as string),
        retry: false
    });

    // Redirection for private docs
    useEffect(() => {
        if (error && (error as any).message?.toLowerCase().includes('unauthorized')) {
            localStorage.setItem('redirect_message', "This collection is private. Please sign in with an authorized account to view it.");
            router.push('/login');
        }
    }, [error, router]);
    const { data: me } = useQuery<any>({
        queryKey: ['me'],
        queryFn: api.auth.me,
        retry: false,
        enabled: typeof window !== 'undefined' && !!localStorage.getItem('token')
    });
    const updateMutation = useMutation({
        mutationFn: (data: { id: string, content: any }) => api.documentation.update(data.id, data.content)
    });
    const togglePublicMutation = useMutation({
        mutationFn: (data: { id: string, isPublic: boolean }) => api.documentation.togglePublic(data.id, data.isPublic)
    });
    const aiMutation = useMutation({
        mutationFn: (data: any) => api.ai.generateDocs(data)
    });

    const isOwner = me && doc && me.userId === (doc as any).userId;
    const canEdit = isOwner;

    // State
    const [endpoints, setEndpoints] = useState<any[]>([]);
    const [selectedIdx, setSelectedIdx] = useState<number>(0);
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [showEnv, setShowEnv] = useState(false);

    // Current Editing State (for the selected endpoint)
    const [currentReq, setCurrentReq] = useState<any>(null);
    const [response, setResponse] = useState<any>(null);
    const [reqLoading, setReqLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'docs' | 'ai' | 'share'>('params');
    const [aiCommand, setAiCommand] = useState('Generate a professional name and a simple, clear description explaining what the request does and what the response means.');

    // UI Layout State
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [paneLayout, setPaneLayout] = useState<'horizontal' | 'vertical'>('horizontal');
    const [showHistory, setShowHistory] = useState(false);
    const [isViewingHistory, setIsViewingHistory] = useState(false);
    const [mainSplitRatio, setMainSplitRatio] = useState(50); // percentage
    const [isResizingMain, setIsResizingMain] = useState(false);
    const [verticalSplitRatio, setVerticalSplitRatio] = useState(50); // percentage for vertical layout
    const [isResizingVertical, setIsResizingVertical] = useState(false);
    const [isResizing, setIsResizing] = useState(false); // Sidebar resizing
    const [showAbsoluteTime, setShowAbsoluteTime] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [cursorPos, setCursorPos] = useState(0);
    const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    // Initialize state from doc
    useEffect(() => {
        if (doc && doc.content) {
            try {
                let content: any = { endpoints: [], variables: {} };
                if (typeof doc.content === 'string') {
                    if (doc.content.trim().startsWith('{')) {
                        content = JSON.parse(doc.content);
                    }
                } else {
                    content = doc.content;
                }

                const eps = content.endpoints || [];
                setEndpoints(eps);
                if (content.variables) {
                    setVariables(content.variables);
                }
                if (eps.length > 0 && !currentReq) {
                    setCurrentReq(eps[0]);
                }
            } catch (e) {
                console.warn("Doc content parsing skipped:", e);
            }
        }
    }, [doc]);

    // Update currentReq when selection changes
    useEffect(() => {
        if (endpoints[selectedIdx]) {
            const req = { ...endpoints[selectedIdx] };
            setCurrentReq(req);
            // Restore last response if it exists
            if (req.lastResponse) {
                setResponse(req.lastResponse);
            } else {
                setResponse(null);
            }
        }
    }, [selectedIdx, endpoints]);

    // Handle outside click for menus
    useEffect(() => {
        const handleClick = () => setOpenMenuIdx(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const parseUrlParams = (url: string) => {
        const params: { key: string; value: string; type: 'path' | 'query' }[] = [];

        // Path variables: :varName
        const pathVars = url.match(/:[a-zA-Z0-9_]+/g);
        if (pathVars) {
            pathVars.forEach(v => {
                const key = v.slice(1);
                params.push({ key, value: '', type: 'path' });
            });
        }

        // Query params: ?key=value&...
        if (url.includes('?')) {
            const queryPart = url.split('?')[1];
            const searchParams = new URLSearchParams(queryPart);
            searchParams.forEach((value, key) => {
                params.push({ key, value, type: 'query' });
            });
        }

        return params;
    };

    // Auto-sync params when URL changes
    useEffect(() => {
        if (!currentReq) return;
        const detected = parseUrlParams(currentReq.url);
        const existing = currentReq.params || [];

        // 1. Strictly sync path params with what's present in the URL
        const pathParams = detected.filter(p => p.type === 'path').map(p => {
            const match = existing.find((e: any) => e.key === p.key && e.type === 'path');
            return match ? { ...p, value: match.value } : p;
        });

        // 2. Sync query params from URL, but also keep manual additions
        const queryFromUrl = detected.filter(p => p.type === 'query');
        const queryParams = queryFromUrl.map(p => {
            const match = existing.find((e: any) => e.key === p.key && e.type === 'query');
            // If the URL has a value (non-empty), it takes precedence over the table value
            return match ? { ...match, value: p.value || match.value } : p;
        });

        // Keep manual query params that aren't in the URL yet
        const manualQuery = existing.filter((e: any) => e.type === 'query' && !queryFromUrl.some(q => q.key === e.key));

        const cleanedParams = [...pathParams, ...queryParams, ...manualQuery];

        if (JSON.stringify(cleanedParams) !== JSON.stringify(existing)) {
            setCurrentReq((prev: any) => ({ ...prev, params: cleanedParams }));
        }
    }, [currentReq?.url]);

    const resolveAll = (text: string, ep?: any) => {
        let result = text || '';
        // Env vars
        Object.entries(variables).forEach(([key, value]) => {
            const cleanKey = key.replace(/[{}]/g, '');
            const regex = new RegExp(`{{${cleanKey}}}`, 'g');
            result = result.replace(regex, value);
        });
        // Path vars
        if (ep?.params) {
            ep.params.forEach((p: any) => {
                if (p.type === 'path' && p.key) {
                    const regex = new RegExp(`:${p.key}`, 'g');
                    result = result.replace(regex, p.value || `:${p.key}`);
                }
            });
        }
        return result;
    };

    const resolveUrl = (ep: any) => {
        let finalUrl = resolveAll(ep.url, ep);
        const queryParams = (ep.params || []).filter((p: any) => p.type === 'query' && p.key);
        if (queryParams.length > 0) {
            try {
                const urlSegments = finalUrl.split('?');
                const baseUrl = urlSegments[0];
                const existingQuery = urlSegments[1] || '';
                const searchParams = new URLSearchParams(existingQuery);
                queryParams.forEach((p: any) => {
                    searchParams.set(p.key, resolveAll(p.value, ep));
                });
                const newQuery = searchParams.toString();
                finalUrl = newQuery ? `${baseUrl}?${newQuery}` : baseUrl;
            } catch (e) { }
        }
        return finalUrl;
    };

    const handleSaveCollection = async (specificEndpoints?: any[]) => {
        const eps = specificEndpoints || endpoints;
        const updatedEndpoints = eps.map((ep, idx) => {
            const current = specificEndpoints ? ep : (idx === selectedIdx ? currentReq : ep);
            return {
                ...current
            };
        });

        setEndpoints(updatedEndpoints);

        const content = typeof doc?.content === 'string' ? JSON.parse(doc.content) : doc?.content;
        const newContent = {
            ...content,
            endpoints: updatedEndpoints,
            variables: variables
        };

        try {
            await updateMutation.mutateAsync({
                id: id as string,
                content: newContent
            });
            toast.success('Collection saved!');
            setIsDirty(false);
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e) {
            toast.error('Failed to save');
        }
    };

    const handleShare = async () => {
        if (!doc) return;
        const newStatus = !doc.isPublic; // Assuming type update will happen, casting for now
        // The type for doc might not strictly have isPublic yet if not regenerated, but DB has it.
        // We act optimistically.
        try {
            await togglePublicMutation.mutateAsync({ id: id as string, isPublic: newStatus });
            toast.success(newStatus ? 'Collection is now Public' : 'Collection is now Private');
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e) {
            toast.error('Failed to update share status');
        }
    };

    const handleAiGenerate = async () => {
        if (!currentReq) return;
        try {
            const res = await aiMutation.mutateAsync({
                method: currentReq.method,
                url: currentReq.url,
                body: currentReq.body,
                response: response?.data,
                userCommand: aiCommand
            });
            const updatedReq = {
                ...currentReq,
                name: res.name || currentReq.name,
                description: res.description
            };
            setCurrentReq(updatedReq);

            // Sync with sidebar list immediately
            const newEps = [...endpoints];
            newEps[selectedIdx] = updatedReq;
            setEndpoints(newEps);
            setIsDirty(true);

            toast.success('Documentation updated with AI!');
        } catch (e) {
            toast.error('AI generation failed');
        }
    };

    const handleFormatJson = () => {
        if (!currentReq?.body?.raw) return;
        try {
            const formatted = JSON.stringify(JSON.parse(currentReq.body.raw), null, 2);
            const updatedReq = { ...currentReq, body: { ...currentReq.body, raw: formatted } };
            setCurrentReq(updatedReq);
            // Sync with sidebar
            const newEps = [...endpoints];
            newEps[selectedIdx] = updatedReq;
            setEndpoints(newEps);
            setIsDirty(true);
            toast.success('JSON Formatted');
        } catch (e) {
            toast.error('Invalid JSON');
        }
    };

    const handleGenerateMarkdown = () => {
        if (!doc) return;
        let md = `# ${doc.title}\n\n`;
        endpoints.forEach((ep) => {
            const resolvedUrl = resolveUrl(ep);
            const resolvedDescription = resolveAll(ep.description || '', ep);

            md += `## ${ep.name}\n\n`;
            md += `**Method:** ${ep.method}\n\n`;
            md += `**URL:** \`${resolvedUrl}\`\n\n`;
            if (resolvedDescription) md += `**Description:** ${resolvedDescription}\n\n`;

            const resolvedHeaders = (ep.headers || []).map((h: any) => ({
                key: h.key,
                value: resolveAll(h.value, ep)
            }));

            if (resolvedHeaders.length > 0) {
                md += `### Headers\n| Key | Value |\n|---|---|\n`;
                resolvedHeaders.forEach((h: any) => md += `| ${h.key} | ${h.value} |\n`);
                md += `\n`;
            }

            if (ep.body?.raw) {
                const resolvedBody = resolveAll(ep.body.raw, ep);
                md += `### Body\n\`\`\`json\n${resolvedBody}\n\`\`\`\n\n`;
            }

            if (ep.lastResponse) {
                md += `### Last Response (${ep.lastResponse.status})\n\`\`\`json\n${JSON.stringify(ep.lastResponse.data, null, 2)}\n\`\`\`\n\n`;
            }
            md += `---\n\n`;
        });

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title.replace(/\s+/g, '_')}_docs.md`;
        a.click();
        toast.success('Markdown generated!');
    };

    const processUrl = (url: string) => {
        let processed = url;
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            processed = processed.replace(regex, variables[key]);
        });
        return processed;
    };

    const handleCopyUrl = () => {
        if (!currentReq?.url) return;
        const finalUrl = processUrl(currentReq.url);
        navigator.clipboard.writeText(finalUrl);
        toast.success('URL copied to clipboard');
    };

    const handleCopyRequest = () => {
        if (!currentReq?.body?.raw) return;
        navigator.clipboard.writeText(currentReq.body.raw);
        toast.success('Request Body copied');
    };

    const handleCopyResponse = () => {
        if (!response?.data) return;
        navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
        toast.success('Response copied');
    };

    // Sidebar resize logic
    useEffect(() => {
        if (!isResizing) return;
        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = Math.max(200, Math.min(600, e.clientX));
            setSidebarWidth(newWidth);
        };
        const handleMouseUp = () => setIsResizing(false);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Main pane resize logic (Vertical split)
    useEffect(() => {
        if (!isResizingVertical) return;
        const handleMouseMove = (e: MouseEvent) => {
            const topBarHeight = 135; // Approx height of header + URL bar
            const availableHeight = window.innerHeight - topBarHeight;
            const mouseYRelative = e.clientY - topBarHeight;
            const newRatio = Math.max(20, Math.min(80, (mouseYRelative / availableHeight) * 100));
            setVerticalSplitRatio(newRatio);
        };
        const handleMouseUp = () => setIsResizingVertical(false);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingVertical]);

    // Main pane resize logic (Horizontal split)
    useEffect(() => {
        if (!isResizingMain) return;
        const handleMouseMove = (e: MouseEvent) => {
            const sidebarOffset = isSidebarCollapsed ? 48 : sidebarWidth;
            const availableWidth = window.innerWidth - sidebarOffset;
            const mouseXRelative = e.clientX - sidebarOffset;
            const newRatio = Math.max(20, Math.min(80, (mouseXRelative / availableWidth) * 100));
            setMainSplitRatio(newRatio);
        };
        const handleMouseUp = () => setIsResizingMain(false);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingMain, sidebarWidth, isSidebarCollapsed]);

    const HighlightedText = ({ text, className = "" }: { text: string, className?: string }) => {
        if (!text) return null;

        // Regex to find {{var}} or :var
        const parts = text.split(/(\{\{[^{}]+\}\}|:[a-zA-Z0-9_]+)/g);

        return (
            <div className={`pointer-events-none whitespace-pre break-all h-full ${className}`}>
                {parts.map((part, i) => {
                    const isBraceVar = part.startsWith('{{') && part.endsWith('}}');
                    const isColonVar = part.startsWith(':') && part.length > 1;

                    if (isBraceVar || isColonVar) {
                        const key = isBraceVar ? part.slice(2, -2) : part.slice(1);
                        const isSet = variables[key] !== undefined;

                        return (
                            <span
                                key={i}
                                className={`py-1 rounded ${isSet
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-red-100 text-red-600'
                                    }`}
                            >
                                {part}
                            </span>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        );
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart || 0;
        setCursorPos(pos);
        setCurrentReq({ ...currentReq, url: val });

        // Environment Variable Suggestions
        const beforeCursor = val.slice(0, pos);
        const lastDoubleBrace = beforeCursor.lastIndexOf('{{');
        if (lastDoubleBrace !== -1 && !beforeCursor.slice(lastDoubleBrace).includes('}}')) {
            const query = beforeCursor.slice(lastDoubleBrace + 2).toLowerCase();
            const matches = Object.keys(variables).filter(k => k.toLowerCase().includes(query));
            setSuggestions(matches);
            setSuggestionIndex(0);
            return;
        }

        // URL Protocol/Base Suggestions
        if (val.length > 0 && val.length < 15) {
            const bases = ['https://', 'http://', 'localhost:3000', 'localhost:4000', 'localhost:8080', 'api.example.com'];
            const matches = bases.filter(b => b.startsWith(val.toLowerCase()) && b !== val);
            if (matches.length > 0) {
                setSuggestions(matches);
                setSuggestionIndex(0);
                return;
            }
        }
        setSuggestions([]);
        setIsDirty(true);
    };

    const handleSuggestionSelect = (varName: string) => {
        const val = currentReq.url;
        const beforeCursor = val.slice(0, cursorPos);
        const afterCursor = val.slice(cursorPos);
        const lastDoubleBrace = beforeCursor.lastIndexOf('{{');

        const newVal = beforeCursor.slice(0, lastDoubleBrace) + `{{${varName}}}` + afterCursor;
        setCurrentReq({ ...currentReq, url: newVal });
        setSuggestions([]);
        setIsDirty(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSuggestionIndex((i) => (i + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSuggestionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSuggestionSelect(suggestions[suggestionIndex]);
            } else if (e.key === 'Escape') {
                setSuggestions([]);
            }
        }
    };

    const handleSendRequest = async () => {
        setReqLoading(true);
        setResponse(null);

        try {
            const processContent = (text: string) => {
                let result = text || '';
                Object.entries(variables).forEach(([key, value]) => {
                    const cleanKey = key.replace(/[{}]/g, '');
                    const regex = new RegExp(`{{${cleanKey}}}`, 'g');
                    result = result.replace(regex, value);
                });
                (currentReq.params || []).forEach((p: any) => {
                    if (p.type === 'path' && p.key) {
                        const regex = new RegExp(`:${p.key}`, 'g');
                        result = result.replace(regex, p.value || `:${p.key}`);
                    }
                });
                return result;
            };

            let finalUrl = processContent(currentReq.url);
            const queryParams = (currentReq.params || []).filter((p: any) => p.type === 'query' && p.key);
            if (queryParams.length > 0) {
                try {
                    const urlSegments = finalUrl.split('?');
                    const baseUrl = urlSegments[0];
                    const existingQuery = urlSegments[1] || '';
                    const searchParams = new URLSearchParams(existingQuery);

                    queryParams.forEach((p: any) => {
                        searchParams.set(p.key, processContent(p.value));
                    });

                    const newQuery = searchParams.toString();
                    finalUrl = newQuery ? `${baseUrl}?${newQuery}` : baseUrl;
                } catch (e) {
                    console.warn("URL enhancement failed", e);
                }
            }

            const rawBody = currentReq.body?.raw || '';
            const finalBody = rawBody ? processContent(rawBody) : undefined;
            const headers = (currentReq.headers || []).reduce((acc: any, h: any) => {
                acc[h.key] = processContent(h.value);
                return acc;
            }, {});

            if (finalBody && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

            const startTime = Date.now();
            const res = await fetch(finalUrl, {
                method: currentReq.method,
                headers,
                body: ['GET', 'HEAD'].includes(currentReq.method) ? undefined : finalBody
            });

            const endTime = Date.now();
            const textData = await res.text();

            // Helper to recursively parse JSON strings
            const deepParseJson = (obj: any): any => {
                if (typeof obj === 'string') {
                    // 1. Try direct JSON parse
                    try {
                        const parsed = JSON.parse(obj);
                        return deepParseJson(parsed);
                    } catch (e) {
                        // 2. Fallback: Check for "Error: JSON" patterns (e.g. TRPCError)
                        const firstBrace = obj.search(/[\{\[]/);
                        if (firstBrace > -1) {
                            const stackStart = obj.indexOf('\n    at ');

                            let potentialJson = '';
                            let prefix = obj.substring(0, firstBrace);
                            let suffix = '';

                            if (stackStart > -1 && stackStart > firstBrace) {
                                potentialJson = obj.substring(firstBrace, stackStart);
                                suffix = obj.substring(stackStart);
                            } else {
                                potentialJson = obj.substring(firstBrace);
                            }

                            try {
                                const parsed = JSON.parse(potentialJson);
                                const deepParsed = deepParseJson(parsed);
                                return {
                                    errorType: prefix.trim().replace(/:$/, ''),
                                    errorDetails: deepParsed,
                                    stackTrace: suffix.trim().split('\n').map(line => line.trim())
                                };
                            } catch (ignore) {
                                // If extraction fails, regular string return
                            }
                        }
                        return obj;
                    }
                } else if (Array.isArray(obj)) {
                    return obj.map(deepParseJson);
                } else if (obj !== null && typeof obj === 'object') {
                    return Object.keys(obj).reduce((acc: any, key) => {
                        acc[key] = deepParseJson(obj[key]);
                        return acc;
                    }, {});
                }
                return obj;
            };

            let responseData;
            try {
                // First parse the main text
                const initialParse = JSON.parse(textData);
                // Then deep parse fields
                responseData = deepParseJson(initialParse);
            } catch (e) {
                // If main parsing fails, try deep parsing the raw text just in case, otherwise return text
                responseData = deepParseJson(textData);
            }

            const responseObj = {
                status: res.status,
                statusText: res.statusText,
                time: endTime - startTime,
                data: responseData,
                timestamp: new Date().toISOString()
            };

            setResponse(responseObj);

            // Persist the request/response into the currentReq and endpoints list
            const historyItem = {
                ...currentReq,
                lastResponse: responseObj,
                timestamp: responseObj.timestamp
            };

            const updatedHistory = [historyItem, ...(currentReq.history || [])].slice(0, 10);

            const updatedReq = {
                ...currentReq,
                lastResponse: responseObj,
                history: updatedHistory,
                headers: currentReq.headers,
                body: currentReq.body,
                url: currentReq.url,
                method: currentReq.method
            };
            setCurrentReq(updatedReq);
            const newEps = [...endpoints];
            newEps[selectedIdx] = updatedReq;
            setEndpoints(newEps);
            setIsDirty(true);

            // If user was viewing history, exit it on new request
            setIsViewingHistory(false);

        } catch (e: any) {
            setResponse({ error: true, message: e.message });
        } finally {
            setReqLoading(false);
        }
    };

    const addNewRequest = () => {
        const newReq = {
            name: 'New Request',
            method: 'GET',
            url: '',
            headers: [],
            body: { mode: 'raw', raw: '' },
            description: ''
        };
        const newEps = [...endpoints, newReq];
        setEndpoints(newEps);
        setSelectedIdx(newEps.length - 1);
        setIsDirty(true);
    };

    const deleteRequest = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this request?')) {
            const newEps = endpoints.filter((_, i) => i !== idx);
            setEndpoints(newEps);
            if (selectedIdx === idx) {
                if (newEps.length > 0) setSelectedIdx(Math.max(0, idx - 1));
                else setCurrentReq(null);
            } else if (idx < selectedIdx) {
                setSelectedIdx(selectedIdx - 1);
            }
            setIsDirty(true);
        }
        setOpenMenuIdx(null);
    };

    const duplicateRequest = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const reqToDup = endpoints[idx];
        const newReq = JSON.parse(JSON.stringify(reqToDup));
        newReq.name = `${newReq.name} (Copy)`;
        const newEps = [...endpoints];
        newEps.splice(idx + 1, 0, newReq);
        setEndpoints(newEps);
        setSelectedIdx(idx + 1);
        setOpenMenuIdx(null);
        toast.success('Request duplicated & Auto-saving...');
        handleSaveCollection(newEps);
    };

    const handleDragStart = (idx: number) => {
        setDraggedIdx(idx);
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === idx) return;

        const newEps = [...endpoints];
        const draggedItem = newEps[draggedIdx];
        newEps.splice(draggedIdx, 1);
        newEps.splice(idx, 0, draggedItem);

        setEndpoints(newEps);
        setDraggedIdx(idx);

        // Update selectedIdx if the dragged item was selected
        if (selectedIdx === draggedIdx) {
            setSelectedIdx(idx);
        } else if (selectedIdx > draggedIdx && selectedIdx <= idx) {
            setSelectedIdx(selectedIdx - 1);
        } else if (selectedIdx < draggedIdx && selectedIdx >= idx) {
            setSelectedIdx(selectedIdx + 1);
        }

        setIsDirty(true);
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center text-gray-500">Loading Client...</div>;
    if (error || !doc) return <div className="h-screen flex items-center justify-center text-red-500">Failed to load</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden font-sans text-sm relative">
            {/* Sidebar */}
            <div
                className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 shadow-sm z-20 ${isSidebarCollapsed ? 'w-12' : ''}`}
                style={{ width: isSidebarCollapsed ? '48px' : `${sidebarWidth}px` }}
            >
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 min-h-[60px]">
                    {!isSidebarCollapsed && <h2 className="font-semibold text-gray-700 truncate" title={doc.title}>{doc.title}</h2>}
                    <div className="flex gap-1 mx-auto">
                        {!isSidebarCollapsed && canEdit && (
                            <>
                                <button onClick={() => setShowEnv(!showEnv)} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Environment">
                                    <Settings size={16} />
                                </button>
                                <button onClick={addNewRequest} className="p-1.5 hover:bg-indigo-100 text-indigo-600 rounded" title="New Request">
                                    <Plus size={16} />
                                </button>
                            </>
                        )}
                        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 hover:bg-gray-200 rounded text-gray-400">
                            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    </div>
                </div>

                {/* Env Modal */}
                <EnvModal
                    isOpen={showEnv}
                    onClose={() => setShowEnv(false)}
                    variables={variables}
                    setVariables={(v) => {
                        setVariables(v);
                        setIsDirty(true);
                    }}
                />

                {!isSidebarCollapsed && (
                    <div className="flex-1 overflow-y-auto">
                        {endpoints.map((ep, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedIdx(idx)}
                                draggable={canEdit}
                                onDragStart={() => canEdit && handleDragStart(idx)}
                                onDragOver={(e) => canEdit && handleDragOver(e, idx)}
                                onDragEnd={() => canEdit && handleDragEnd()}
                                className={`group flex items-center justify-between p-3 cursor-pointer border-l-2 transition-all relative ${selectedIdx === idx ? 'bg-indigo-50 border-indigo-500' : 'border-transparent hover:bg-gray-50'} ${canEdit && draggedIdx === idx ? 'opacity-50 ring-2 ring-indigo-500 ring-inset shadow-inner' : ''}`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    {canEdit && <GripVertical size={14} className="text-gray-300 group-hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0" />}
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-10 text-center flex-shrink-0 ${ep.method === 'GET' ? 'bg-green-100 text-green-700' :
                                        ep.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                                            ep.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                                                ep.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-200 text-gray-700'
                                        }`}>{ep.method}</span>
                                    <span className={`truncate ${selectedIdx === idx ? 'font-medium text-gray-900' : 'text-gray-600'}`}>{ep.name || 'Untitled'}</span>
                                </div>

                                {canEdit && (
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuIdx(openMenuIdx === idx ? null : idx);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 p-1 rounded hover:bg-gray-200 transition-all"
                                        >
                                            <MoreVertical size={14} />
                                        </button>

                                        {openMenuIdx === idx && (
                                            <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded shadow-xl z-50 py-1 text-xs">
                                                <button onClick={(e) => duplicateRequest(idx, e)} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">
                                                    <Copy size={12} /> Duplicate
                                                </button>
                                                <button onClick={(e) => deleteRequest(idx, e)} className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-gray-100">
                                                    <Trash2 size={12} /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Resizer */}
            {!isSidebarCollapsed && (
                <div
                    className={`w-1 cursor-col-resize hover:bg-indigo-400 transition-colors z-30 flex-shrink-0 ${isResizing ? 'bg-indigo-600' : 'bg-transparent'}`}
                    onMouseDown={() => setIsResizing(true)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                {currentReq ? (
                    <>
                        {/* Top Bar */}
                        <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 shadow-sm z-10">
                            <div className="flex-1 flex gap-2 min-w-0">
                                <select
                                    value={currentReq.method}
                                    disabled={!canEdit}
                                    onChange={(e) => {
                                        setCurrentReq({ ...currentReq, method: e.target.value });
                                        setIsDirty(true);
                                    }}
                                    className="flex-shrink-0 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                                >
                                    <option>GET</option>
                                    <option>POST</option>
                                    <option>PUT</option>
                                    <option>DELETE</option>
                                    <option>PATCH</option>
                                </select>
                                <div className="flex-1 relative group min-w-0">
                                    <input
                                        type="text"
                                        value={currentReq.url}
                                        readOnly={!canEdit}
                                        onChange={handleUrlChange}
                                        onKeyDown={handleKeyDown}
                                        className={`w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm bg-transparent relative z-10 text-transparent caret-gray-800 ${!canEdit ? 'cursor-default' : ''}`}
                                        placeholder="Enter Request URL"
                                    />
                                    <div className="absolute inset-y-0 right-0 z-20 flex items-center pr-2">
                                        <button
                                            onClick={handleCopyUrl}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                                            title="Copy full URL"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                    <div className="absolute inset-0 px-4 py-2 flex items-center pointer-events-none overflow-hidden h-full">
                                        <HighlightedText
                                            text={currentReq.url}
                                            className="text-sm w-full"
                                        />
                                    </div>

                                    {/* Suggestions Dropdown */}
                                    {suggestions.length > 0 && (
                                        <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
                                            {suggestions.map((s, idx) => (
                                                <div
                                                    key={s}
                                                    onClick={() => handleSuggestionSelect(s)}
                                                    className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between ${idx === suggestionIndex ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <span className="font-mono text-xs">{`{{${s}}}`}</span>
                                                    <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{variables[s]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleSendRequest}
                                    disabled={reqLoading}
                                    className="flex-shrink-0 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    {reqLoading ? <span className="animate-spin">⌛</span> : <Send size={16} />}
                                    Send
                                </button>
                            </div>
                            <div className="flex gap-2 border-l pl-4 border-gray-200 flex-shrink-0">
                                <div className="flex gap-2">
                                    <button onClick={handleGenerateMarkdown} className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Export Markdown">
                                        <FileText size={20} />
                                    </button>
                                    {canEdit && (
                                        <>
                                            <button onClick={() => handleSaveCollection()} className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors relative" title="Save Collection">
                                                <Save size={20} />
                                                {isDirty && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full border border-white shadow-sm animate-pulse" />}
                                            </button>
                                            <button onClick={handleShare} className={`p-2 hover:bg-indigo-50 rounded-lg transition-colors ${(doc as any).isPublic ? 'text-green-600' : 'text-gray-600 hover:text-indigo-600'}`} title={(doc as any).isPublic ? 'Privatize' : 'Share Publicly'}>
                                                <Share2 size={20} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Request details */}
                        <div className={`flex-1 overflow-hidden flex ${paneLayout === 'horizontal' ? 'flex-row' : 'flex-col'}`}>
                            {/* Left Pane: Config */}
                            <div
                                className={`border-r border-gray-200 flex flex-col min-h-0 min-w-0 ${paneLayout === 'horizontal' ? '' : 'overflow-y-auto'}`}
                                style={paneLayout === 'horizontal' ? { width: `${mainSplitRatio}%` } : { height: `${verticalSplitRatio}%` }}
                            >
                                <div className="flex border-b border-gray-200 bg-gray-50">
                                    {['docs', 'params', 'headers', 'body'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab as any)}
                                            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-4 flex-1 overflow-y-auto">
                                    {activeTab === 'headers' && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2 px-1">
                                                <span>Key</span><span>Value</span>
                                            </div>
                                            {(currentReq.headers || []).map((h: any, i: number) => (
                                                <div key={i} className="flex gap-2">
                                                    <input
                                                        value={h.key}
                                                        readOnly={!canEdit}
                                                        onChange={(e) => {
                                                            const newH = [...(currentReq.headers || [])];
                                                            newH[i].key = e.target.value;
                                                            setCurrentReq({ ...currentReq, headers: newH });
                                                            setIsDirty(true);
                                                        }}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                                                        placeholder="Key"
                                                    />
                                                    <input
                                                        value={h.value}
                                                        readOnly={!canEdit}
                                                        onChange={(e) => {
                                                            const newH = [...(currentReq.headers || [])];
                                                            newH[i].value = e.target.value;
                                                            setCurrentReq({ ...currentReq, headers: newH });
                                                            setIsDirty(true);
                                                        }}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                                                        placeholder="Value"
                                                    />
                                                    {canEdit && <button onClick={() => {
                                                        const newH = currentReq.headers.filter((_: any, idx: number) => idx !== i);
                                                        setCurrentReq({ ...currentReq, headers: newH });
                                                        setIsDirty(true);
                                                    }} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>}
                                                </div>
                                            ))}
                                            {canEdit && <button onClick={() => {
                                                setCurrentReq({ ...currentReq, headers: [...(currentReq.headers || []), { key: '', value: '' }] });
                                                setIsDirty(true);
                                            }} className="text-sm text-indigo-600 font-medium">+ Add Header</button>}
                                        </div>
                                    )}

                                    {activeTab === 'body' && (
                                        <div className="h-full flex flex-col">
                                            <div className="mb-2 flex justify-between items-center text-xs text-gray-500">
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked readOnly /> Raw (JSON)</label>
                                                    <button onClick={handleCopyRequest} className="text-gray-400 hover:text-indigo-600 flex items-center gap-1">
                                                        <Copy size={12} /> Copy Body
                                                    </button>
                                                </div>
                                                {canEdit && <button onClick={handleFormatJson} className="px-2 py-1 hover:bg-indigo-50 text-indigo-600 rounded flex items-center gap-1 font-medium transition-colors">
                                                    <CheckCircle2 size={12} /> Format JSON
                                                </button>}
                                            </div>
                                            <textarea
                                                value={currentReq.body?.raw || ''}
                                                readOnly={!canEdit}
                                                onChange={(e) => {
                                                    setCurrentReq({ ...currentReq, body: { ...currentReq.body, raw: e.target.value } });
                                                    setIsDirty(true);
                                                }}
                                                className="flex-1 w-full font-mono text-sm p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                                placeholder='{ "key": "value" }'
                                            />
                                        </div>
                                    )}

                                    {activeTab === 'docs' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Request Name</label>
                                                <input
                                                    value={currentReq.name}
                                                    readOnly={!canEdit}
                                                    onChange={(e) => {
                                                        setCurrentReq({ ...currentReq, name: e.target.value });
                                                        setIsDirty(true);
                                                    }}
                                                    className={`w-full text-lg font-bold px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none ${!canEdit ? 'bg-transparent border-transparent px-0' : ''}`}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Description</label>
                                                <textarea
                                                    value={currentReq.description || ''}
                                                    readOnly={!canEdit}
                                                    onChange={(e) => {
                                                        setCurrentReq({ ...currentReq, description: e.target.value });
                                                        setIsDirty(true);
                                                    }}
                                                    className={`w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm leading-relaxed ${!canEdit ? 'bg-transparent border-transparent px-0 h-auto min-h-[100px]' : ''}`}
                                                    placeholder="API Documentation..."
                                                />
                                            </div>

                                            {canEdit && (
                                                <div className="pt-4 border-t border-gray-100">
                                                    <label className="text-xs font-semibold text-indigo-600 uppercase mb-2 flex items-center gap-2">
                                                        <Sparkles size={14} />
                                                        AI Generation Command
                                                    </label>
                                                    <div className="flex flex-col gap-2">
                                                        <textarea
                                                            value={aiCommand}
                                                            onChange={(e) => setAiCommand(e.target.value)}
                                                            className="w-full h-24 p-3 border border-indigo-100 bg-indigo-50/30 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-xs"
                                                            placeholder="Custom AI instructions..."
                                                        />
                                                        <button
                                                            onClick={handleAiGenerate}
                                                            disabled={aiMutation.isPending}
                                                            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50"
                                                        >
                                                            {aiMutation.isPending ? 'Refining Documentation...' : 'Generate/Refine with AI'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'params' && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase">Query & Path Params</h4>
                                                {canEdit && <button
                                                    onClick={() => {
                                                        const newParams = [...(currentReq.params || []), { key: '', value: '', type: 'query' }];
                                                        setCurrentReq({ ...currentReq, params: newParams });
                                                        setIsDirty(true);
                                                    }}
                                                    className="p-1 px-2 text-[10px] bg-indigo-50 text-indigo-600 rounded flex items-center gap-1 font-bold hover:bg-indigo-100"
                                                >
                                                    <Plus size={12} /> Add Param
                                                </button>}
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex text-[10px] font-bold text-gray-400 px-1 border-b border-gray-100 pb-1">
                                                    <span className="w-20">Type</span>
                                                    <span className="flex-1">Key</span>
                                                    <span className="flex-1 ml-2">Value</span>
                                                    <span className="w-8"></span>
                                                </div>
                                                {(currentReq.params || []).map((p: any, i: number) => (
                                                    <div key={i} className="flex gap-2 items-center">
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-20 text-center uppercase ${p.type === 'path' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {p.type}
                                                        </span>
                                                        <input
                                                            value={p.key}
                                                            readOnly={!canEdit || p.type === 'path'}
                                                            onChange={(e) => {
                                                                const newP = [...(currentReq.params || [])];
                                                                newP[i].key = e.target.value;
                                                                setCurrentReq({ ...currentReq, params: newP });
                                                                setIsDirty(true);
                                                            }}
                                                            className={`flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs ${(!canEdit || p.type === 'path') ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                                            placeholder="Key"
                                                        />
                                                        <input
                                                            value={p.value}
                                                            readOnly={!canEdit}
                                                            onChange={(e) => {
                                                                const newP = [...(currentReq.params || [])];
                                                                newP[i].value = e.target.value;
                                                                setCurrentReq({ ...currentReq, params: newP });
                                                                setIsDirty(true);
                                                            }}
                                                            className={`flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                                            placeholder="Value"
                                                        />
                                                        {canEdit && (
                                                            <button
                                                                disabled={p.type === 'path'}
                                                                onClick={() => {
                                                                    const newP = currentReq.params.filter((_: any, idx: number) => idx !== i);
                                                                    setCurrentReq({ ...currentReq, params: newP });
                                                                    setIsDirty(true);
                                                                }}
                                                                className={`p-1.5 text-gray-400 hover:text-red-500 ${p.type === 'path' ? 'opacity-20 cursor-not-allowed' : ''}`}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {!(currentReq.params || []).length && (
                                                    <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-lg text-gray-400 text-xs">
                                                        No parameters detected. Use :var in URL for path variables.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Main divider resizer */}
                            {paneLayout === 'horizontal' ? (
                                <div
                                    className={`w-1 cursor-col-resize hover:bg-indigo-400 transition-colors z-10 flex-shrink-0 ${isResizingMain ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                    onMouseDown={() => setIsResizingMain(true)}
                                />
                            ) : (
                                <div
                                    className={`h-1 cursor-row-resize hover:bg-indigo-400 transition-colors z-10 flex-shrink-0 ${isResizingVertical ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                    onMouseDown={() => setIsResizingVertical(true)}
                                />
                            )}

                            {/* Right Pane: Response */}
                            <div
                                className={`bg-gray-50 flex flex-col border-l border-gray-200 min-w-0 relative ${paneLayout === 'horizontal' ? '' : 'border-t'}`}
                                style={paneLayout === 'horizontal' ? { width: `${100 - mainSplitRatio}%` } : { height: `${100 - verticalSplitRatio}%` }}
                            >
                                <div className="p-3 border-b border-gray-200 bg-white flex justify-between items-center z-10 relative">
                                    <div className="flex items-center gap-4">
                                        <h3 className="font-semibold text-gray-700">Response</h3>
                                        {response && (
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className={`font-bold ${response.status >= 200 && response.status < 300 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {response.status} {response.statusText}
                                                </span>
                                                <span className="text-gray-500">{response.time}ms</span>
                                                <button
                                                    onClick={() => setShowAbsoluteTime(!showAbsoluteTime)}
                                                    className="text-[10px] text-gray-400 hover:text-indigo-600 flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200"
                                                >
                                                    {showAbsoluteTime
                                                        ? new Date(response.timestamp || Date.now()).toLocaleTimeString()
                                                        : 'Just now'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 items-center">
                                        {response && (
                                            <button
                                                onClick={handleCopyResponse}
                                                className="p-1 px-2 text-[10px] text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded border border-gray-200 flex items-center gap-1 transition-all mr-2"
                                            >
                                                <Copy size={12} /> Copy
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowHistory(!showHistory)}
                                            className={`p-1 rounded ${showHistory ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
                                            title="History"
                                        >
                                            <History size={16} />
                                        </button>
                                        <button
                                            onClick={() => setPaneLayout('horizontal')}
                                            className={`p-1 rounded ${paneLayout === 'horizontal' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
                                            title="Layout Right"
                                        >
                                            <Columns2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setPaneLayout('vertical')}
                                            className={`p-1 rounded ${paneLayout === 'vertical' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
                                            title="Layout Bottom"
                                        >
                                            <Rows2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 relative w-full h-full">
                                    {showHistory && (
                                        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm border-r border-gray-200 p-4 overflow-y-auto animate-in slide-in-from-right duration-200">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                                    <RotateCcw size={16} className="text-indigo-600" />
                                                    Response History
                                                </h4>
                                                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                                    <X size={18} className="text-gray-400" />
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {!(currentReq.history || []).length && (
                                                    <div className="text-center py-10 text-gray-400 text-xs text-center border-2 border-dashed border-gray-100 rounded-xl">
                                                        No history found for this endpoint.
                                                    </div>
                                                )}
                                                {(currentReq.history || []).map((item: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => {
                                                            setCurrentReq({ ...item });
                                                            setResponse(item.lastResponse);
                                                            setIsViewingHistory(true);
                                                            setShowHistory(false);
                                                            toast.success('Loaded from history');
                                                        }}
                                                        className="p-3 border border-gray-100 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all relative group"
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className={`text-[10px] font-bold px-1 rounded ${item.lastResponse?.status >= 200 && item.lastResponse?.status < 300
                                                                ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {item.lastResponse?.status}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">
                                                                {new Date(item.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs font-medium text-gray-700 truncate">{item.method} {item.url}</div>
                                                        <div className="text-[10px] text-gray-400 mt-1">{item.lastResponse?.time}ms • {item.name || 'Untitled'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {isViewingHistory && (
                                        <div className="absolute top-0 left-0 right-0 z-30 bg-amber-50 border-b border-amber-200 px-4 py-2 flex justify-between items-center animate-in fade-in duration-200">
                                            <span className="text-xs text-amber-700 font-medium flex items-center gap-2">
                                                <Clock size={14} /> Viewing historical snapshot
                                            </span>
                                            <button
                                                onClick={() => {
                                                    // Reload from main list
                                                    const latest = endpoints[selectedIdx];
                                                    setCurrentReq({ ...latest });
                                                    setResponse(latest.lastResponse || null);
                                                    setIsViewingHistory(false);
                                                }}
                                                className="text-[10px] bg-white border border-amber-300 text-amber-700 px-2 py-1 rounded hover:bg-amber-100 font-bold transition-colors"
                                            >
                                                Back to Latest
                                            </button>
                                        </div>
                                    )}
                                    {!response && !reqLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                                            Hit Send to see response
                                        </div>
                                    )}
                                    {reqLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                        </div>
                                    )}
                                    {response && !response.error && (
                                        <div className="absolute inset-0 overflow-auto">
                                            <SyntaxHighlighter
                                                style={vscDarkPlus}
                                                language="json"
                                                customStyle={{ margin: 0, minHeight: '100%', borderRadius: 0, fontSize: '12px' }}
                                                wrapLongLines={false}
                                            >
                                                {typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)}
                                            </SyntaxHighlighter>
                                        </div>
                                    )}
                                    {response && response.error && (
                                        <div className="absolute inset-0 p-4 text-red-600 bg-red-50 overflow-auto">
                                            <pre className="text-red-600 whitespace-pre-wrap break-all font-mono text-xs">Error: {response.message}</pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Layout size={48} className="mb-4 opacity-50" />
                        <p>Select a request from the sidebar</p>
                    </div>
                )}
            </div>
        </div>
    );
}
