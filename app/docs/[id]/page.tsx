'use client';
import { api } from '../../../utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Download, Layout, Settings, Save, Share2, Plus, Sparkles, Send, Copy, Trash2, ChevronLeft, ChevronRight, Columns2, Rows2, FileText, CheckCircle2, Clock, History, X, RotateCcw, MoreVertical, GripVertical, Sun, Moon, Terminal, Code, Search, Keyboard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import EndpointCard from '../../components/EndpointCard';
import EnvModal from '../../components/EnvModal';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../../../context/ThemeContext';
import { useKeyboardShortcuts, createCommonShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { SearchBar } from '../../../components/SearchBar';
import { KeyboardShortcutsModal } from '../../../components/KeyboardShortcutsModal';
import { Endpoint, HttpMethod } from '../../../types';

export default function ApiClient() {
    const { id } = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();

    // Queries & Mutations
    const { data: docRes, isLoading, error } = useQuery<any>({
        queryKey: ['doc', id],
        queryFn: () => api.documentation.getById(id as string),
        retry: false
    });
    const doc = docRes?.data;

    // Redirection for private docs
    useEffect(() => {
        if (error && (error as any).message?.toLowerCase().includes('unauthorized')) {
            localStorage.setItem('redirect_message', "This collection is private. Please sign in with an authorized account to view it.");
            router.push('/login');
        }
    }, [error, router]);
    const { data: meRes } = useQuery<any>({
        queryKey: ['me'],
        queryFn: api.auth.me,
        retry: false,
        enabled: typeof window !== 'undefined' && !!localStorage.getItem('token')
    });
    const me = meRes?.data;
    const updateMutation = useMutation({
        mutationFn: (data: { id: string, content: any }) => api.documentation.update(data.id, data.content)
    });
    const togglePublicMutation = useMutation({
        mutationFn: (data: { id: string, isPublic: boolean }) => api.documentation.togglePublic(data.id, data.isPublic)
    });
    const aiMutation = useMutation({
        mutationFn: (data: any) => api.ai.generateDocs(data)
    });
    const updateRequestMutation = useMutation({
        mutationFn: (data: { requestId: string, content: any }) => api.documentation.updateRequest(data.requestId, data.content)
    });
    const createRequestMutation = useMutation({
        mutationFn: (data: { id: string, name?: string }) => api.documentation.createRequest(data.id, data)
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
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const [responseFilter, setResponseFilter] = useState('');
    const [showResponseFilter, setShowResponseFilter] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    const [urlHistory, setUrlHistory] = useState<string[]>([]);
    const { theme, toggleTheme } = useTheme();
    const bodyEditorRef = useRef<HTMLDivElement>(null);

    // Keyboard shortcuts
    const shortcuts = useMemo(() => createCommonShortcuts({
        onSend: () => {
            if (currentReq && !reqLoading) {
                handleSendRequest();
            }
        },
        onSave: () => {
            if (canEdit && isDirty) {
                handleSaveSingleRequest();
            }
        },
        onNewRequest: () => {
            if (canEdit) {
                handleAddRequest();
            }
        },
        onSearch: () => {
            setShowSearchModal(true);
        },
        onToggleTheme: toggleTheme,
        onShowShortcuts: () => {
            setShowShortcutsModal(true);
        }
    }), [currentReq, reqLoading, canEdit, isDirty, toggleTheme]);

    useKeyboardShortcuts({ shortcuts, enabled: !showSearchModal && !showShortcutsModal });

    // Load URL history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('urlHistory');
        if (saved) {
            try {
                setUrlHistory(JSON.parse(saved));
            } catch (e) {
                console.debug('Failed to parse URL history');
            }
        }
    }, []);

    // Save URL to history after successful request
    const addToUrlHistory = useCallback((url: string) => {
        if (!url || url.length < 5) return;
        setUrlHistory(prev => {
            const filtered = prev.filter(u => u !== url);
            const newHistory = [url, ...filtered].slice(0, 20);
            localStorage.setItem('urlHistory', JSON.stringify(newHistory));
            return newHistory;
        });
    }, []);

    // Initialize state from doc
    useEffect(() => {
        if (doc) {
            try {
                // 1. Load requests (either from doc.requests or doc.content.endpoints)
                let eps = (doc as any).requests || [];

                // Fallback for old records still stored as JSON in content
                if (eps.length === 0 && doc.content) {
                    let content: any = {};
                    if (typeof doc.content === 'string') {
                        if (doc.content.trim().startsWith('{')) {
                            content = JSON.parse(doc.content);
                        }
                    } else {
                        content = doc.content;
                    }
                    eps = content.endpoints || [];
                }

                setEndpoints(eps);

                // 2. Load variables
                let vars = {};
                if (doc.content) {
                    let content: any = {};
                    if (typeof doc.content === 'string') {
                        if (doc.content.trim().startsWith('{')) {
                            content = JSON.parse(doc.content);
                        }
                    } else {
                        content = doc.content;
                    }
                    vars = content.variables || {};
                }
                setVariables(vars);

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

    const handleAddRequest = async () => {
        try {
            const res = await createRequestMutation.mutateAsync({ id: id as string });
            const newReq = res.data;
            const newEps = [...endpoints, newReq];
            setEndpoints(newEps);
            setSelectedIdx(newEps.length - 1);
            toast.success('New request added');
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e: any) {
            toast.error(e.message || 'Failed to add request');
        }
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
            } catch (urlError) {
                // URL parameter parsing failed - proceed with basic URL
                console.debug('URL parameter enhancement failed:', urlError);
            }
        }
        return finalUrl;
    };

    const handleSaveSingleRequest = async () => {
        if (!currentReq || !currentReq.id) {
            toast.error('Cannot save: Request not yet created on server');
            return;
        }

        try {
            const res = await updateRequestMutation.mutateAsync({
                requestId: currentReq.id,
                content: {
                    name: currentReq.name,
                    method: currentReq.method,
                    url: currentReq.url,
                    description: currentReq.description,
                    body: currentReq.body,
                    headers: currentReq.headers,
                    params: currentReq.params,
                    lastResponse: currentReq.lastResponse,
                    history: currentReq.history || []
                }
            });
            toast.success(res.message || 'Request saved!');
            setIsDirty(false);

            // Sync local state with saved data including history
            const newEps = [...endpoints];
            newEps[selectedIdx] = res.data;
            setEndpoints(newEps);
            setCurrentReq(res.data);

            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e: any) {
            toast.error(e.message || 'Failed to save request');
        }
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
            variables: variables
        };

        try {
            await updateMutation.mutateAsync({
                id: id as string,
                content: newContent
            });
            toast.success('Collection settings saved!');
            setIsDirty(false);
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e: any) {
            toast.error(e.message || 'Failed to save collection');
        }
    };

    const handleShare = async () => {
        if (!doc) return;
        const newStatus = !doc.isPublic; // Assuming type update will happen, casting for now
        // The type for doc might not strictly have isPublic yet if not regenerated, but DB has it.
        // We act optimistically.
        try {
            const res = await togglePublicMutation.mutateAsync({ id: id as string, isPublic: newStatus });
            toast.success(res.message || (newStatus ? 'Collection is now Public' : 'Collection is now Private'));
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e: any) {
            toast.error(e.message || 'Failed to update share status');
        }
    };

    const handleAiGenerate = async () => {
        if (!currentReq) return;
        try {
            const res = await aiMutation.mutateAsync({
                method: currentReq.method,
                url: currentReq.url,
                body: currentReq.body.text_array,
                response: response?.data.translate,
                userCommand: aiCommand
            });
            const data = res.data;
            const updatedReq = {
                ...currentReq,
                name: data.name || currentReq.name,
                description: data.description
            };
            setCurrentReq(updatedReq);

            // Sync with sidebar list immediately
            const newEps = [...endpoints];
            newEps[selectedIdx] = updatedReq;
            setEndpoints(newEps);
            setIsDirty(true);

            toast.success(res.message || 'Documentation updated with AI!');
        } catch (e: any) {
            toast.error(e.message || 'AI generation failed');
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

    const getMarkdownForEndpoint = (ep: any) => {
        const resolvedUrl = resolveUrl(ep);
        const resolvedDescription = resolveAll(ep.description || '', ep);

        let md = `## ${ep.name}\n\n`;
        md += `**Method:** \`${ep.method}\`  \n`;
        md += `**URL:** \`${resolvedUrl}\`\n\n`;

        if (resolvedDescription) {
            md += `### Description\n> ${resolvedDescription.split('\n').join('\n> ')}\n\n`;
        }

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
            md += `### Request Body\n\`\`\`json\n${resolvedBody}\n\`\`\`\n\n`;
        }

        if (ep.lastResponse) {
            md += `### Last Response (${ep.lastResponse.status})\n\`\`\`json\n${JSON.stringify(ep.lastResponse.data, null, 2)}\n\`\`\`\n\n`;
        }
        md += `\n---\n\n`;
        return md;
    };

    const handleCopyMarkdown = (ep: any) => {
        const md = getMarkdownForEndpoint(ep);
        navigator.clipboard.writeText(md);
        toast.success('Markdown copied');
    };

    const handleDownloadIndividualMarkdown = (ep: any) => {
        if (!ep) return;
        const md = getMarkdownForEndpoint(ep);
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ep.name || 'request'}_${ep.method}.md`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Markdown downloaded!');
    };

    const handleGenerateMarkdown = (download = true) => {
        if (!doc) return;
        let md = `# ${doc.title}\n\n`;
        md += `Generated on ${new Date().toLocaleString()}\n\n---\n\n`;

        endpoints.forEach((ep) => {
            md += getMarkdownForEndpoint(ep);
        });

        if (download) {
            const blob = new Blob([md], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.title.replace(/\s+/g, '_')}_docs.md`;
            a.click();
            toast.success('Markdown generated!');
        } else {
            setPreviewContent(md);
            setShowPreview(true);
        }
    };

    const handleDownloadPdf = async () => {
        if (typeof window === 'undefined') return;
        toast.loading('Preparing PDF...', { id: 'pdf-loading' });
        
        // Helper to resolve URL with variables
        const resolveUrlForPdf = (url: string, ep: any) => {
            let resolved = url;
            
            // Replace environment variables
            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                resolved = resolved.replace(regex, variables[key] || `[${key}]`);
            });
            
            // Replace path params like :id with sample values
            resolved = resolved.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, param) => {
                return `[${param}]`;
            });
            
            return resolved;
        };
        
        // Create complete standalone HTML document for printing
        const docTitle = doc?.title || 'API Documentation';
        const dateStr = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const methodColors: Record<string, { bg: string; color: string }> = {
            'GET': { bg: '#dcfce7', color: '#16a34a' },
            'POST': { bg: '#dbeafe', color: '#2563eb' },
            'PUT': { bg: '#fef9c3', color: '#ca8a04' },
            'DELETE': { bg: '#fee2e2', color: '#dc2626' },
            'PATCH': { bg: '#f3e8ff', color: '#9333ea' }
        };
        
        let content = '';
        endpoints.forEach((ep, idx) => {
            const m = methodColors[ep.method] || { bg: '#f3f4f6', color: '#6b7280' };
            const resolvedUrl = resolveUrlForPdf(ep.url, ep);
            
            content += `
                <div class="endpoint" style="margin-bottom: 24px; page-break-inside: avoid;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span style="background: ${m.bg}; color: ${m.color}; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; font-family: system-ui;">${ep.method}</span>
                        <h2 style="margin: 0; font-size: 18px; color: #111827; font-family: system-ui;">${ep.name || 'Untitled'}</h2>
                    </div>
                    <code style="display: block; background: #f3f4f6; padding: 10px; border-radius: 6px; font-size: 12px; font-family: 'SF Mono', Monaco, monospace; color: #374151; margin: 8px 0; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${resolvedUrl}</code>
                    ${ep.description ? `<p style="margin: 10px 0; color: #4b5563; font-size: 13px; line-height: 1.5;">${ep.description}</p>` : ''}
            `;
            
            if (ep.headers && ep.headers.length > 0 && ep.headers.some((h: any) => h.key)) {
                content += `<h3 style="font-size: 13px; color: #111827; margin: 14px 0 6px; font-family: system-ui;">Headers</h3>`;
                content += `<table style="width: 100%; border-collapse: collapse; font-size: 12px;"><thead><tr style="background: #f9fafb;"><th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">Key</th><th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">Value</th></tr></thead><tbody>`;
                ep.headers.filter((h: any) => h.key).forEach((h: any) => {
                    let headerValue = h.value || '';
                    Object.keys(variables).forEach(key => {
                        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                        headerValue = headerValue.replace(regex, variables[key] || `[${key}]`);
                    });
                    content += `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 11px;">${h.key}</td><td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 11px;">${headerValue}</td></tr>`;
                });
                content += `</tbody></table>`;
            }
            
            if (ep.body?.raw) {
                content += `<h3 style="font-size: 13px; color: #111827; margin: 14px 0 6px; font-family: system-ui;">Request Body</h3>`;
                let bodyContent = ep.body.raw;
                Object.keys(variables).forEach(key => {
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                    bodyContent = bodyContent.replace(regex, variables[key] || `[${key}]`);
                });
                content += `<pre style="background: #1f2937; color: #e5e7eb; padding: 12px; border-radius: 6px; font-size: 11px; line-height: 1.5; overflow-x: auto; margin: 0;">${bodyContent}</pre>`;
            }
            
            if (ep.lastResponse) {
                const statusColor = ep.lastResponse.status >= 200 && ep.lastResponse.status < 300 ? '#16a34a' : '#dc2626';
                content += `<h3 style="font-size: 13px; color: #111827; margin: 14px 0 6px; font-family: system-ui;">Response <span style="color: ${statusColor}; font-weight: normal;">${ep.lastResponse.status}</span></h3>`;
                content += `<pre style="background: #1f2937; color: #e5e7eb; padding: 12px; border-radius: 6px; font-size: 11px; line-height: 1.5; overflow-x: auto; margin: 0;">${JSON.stringify(ep.lastResponse.data, null, 2)}</pre>`;
            }
            
            content += `</div>`;
            if (idx < endpoints.length - 1) {
                content += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">`;
            }
        });
        
        const printHtml = `<!DOCTYPE html>
<html>
<head>
    <title>${docTitle}</title>
    <style>
        @page { margin: 1.5cm; size: A4 portrait; }
        * { box-sizing: border-box; }
        body { 
            margin: 0; 
            padding: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            font-size: 14px; 
            line-height: 1.5; 
            color: #1f2937;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        h1 { font-size: 26px; color: #111827; margin: 0 0 8px 0; font-family: system-ui; }
        h2 { font-size: 18px; color: #111827; margin: 0; font-family: system-ui; }
        h3 { font-size: 14px; color: #111827; margin: 14px 0 6px 0; font-family: system-ui; }
        p { margin: 10px 0; color: #4b5563; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
        pre { 
            background: #1f2937; 
            color: #e5e7eb; 
            padding: 12px; 
            border-radius: 6px; 
            font-size: 11px; 
            line-height: 1.5; 
            overflow-x: auto; 
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        code { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border: 1px solid #e5e7eb; font-size: 12px; }
        th { background: #f9fafb; font-weight: 600; }
        .title-meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
        .endpoint { margin-bottom: 20px; }
        .method { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; font-family: system-ui; }
    </style>
</head>
<body>
    <h1>${docTitle}</h1>
    <p class="title-meta">Generated on ${dateStr}</p>
    <hr>
    ${content}
</body>
</html>`;
        
        // Create hidden iframe for printing
        let iframe = document.getElementById('pdf-print-iframe') as HTMLIFrameElement;
        if (iframe) {
            document.body.removeChild(iframe);
        }
        
        iframe = document.createElement('iframe');
        iframe.id = 'pdf-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '800px';
        iframe.style.height = '600px';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(printHtml);
            iframeDoc.close();
            
            setTimeout(() => {
                iframe.contentWindow?.print();
                toast.success('Print dialog opened!', { id: 'pdf-loading' });
                setTimeout(() => {
                    iframe.remove();
                }, 1000);
            }, 300);
        } else {
            toast.error('Failed to generate PDF', { id: 'pdf-loading' });
        }
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

    const handleCopyAsCurl = (ep: any = currentReq) => {
        if (!ep) return;
        const finalUrl = resolveUrl(ep);
        let curl = `curl --location '${finalUrl}' \\\n--request ${ep.method}`;

        (ep.headers || []).forEach((h: any) => {
            if (h.key) curl += ` \\\n--header '${h.key}: ${resolveAll(h.value, ep)}'`;
        });

        if (ep.body?.raw && !['GET', 'HEAD'].includes(ep.method)) {
            curl += ` \\\n--data '${resolveAll(ep.body.raw, ep)}'`;
        }

        navigator.clipboard.writeText(curl);
        toast.success('cURL copied');
    };

    const handleCopyAsFetch = (ep: any = currentReq) => {
        if (!ep) return;
        const finalUrl = resolveUrl(ep);
        const headers: Record<string, string> = {};
        (ep.headers || []).forEach((h: any) => {
            if (h.key) headers[h.key] = resolveAll(h.value, ep);
        });

        const options: any = {
            method: ep.method,
            headers
        };

        if (ep.body?.raw && !['GET', 'HEAD'].includes(ep.method)) {
            options.body = resolveAll(ep.body.raw, ep);
        }

        const fetchCode = `fetch("${finalUrl}", ${JSON.stringify(options, null, 2)});`;
        navigator.clipboard.writeText(fetchCode);
        toast.success('Fetch code copied');
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
                                className={`px-1 rounded ${isSet
                                    ? theme === 'dark' ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                    : theme === 'dark' ? 'bg-red-600/20 text-red-400' : 'bg-red-100 text-red-600'
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

        // Environment Variable Suggestions (when typing {{)
        const beforeCursor = val.slice(0, pos);
        const lastDoubleBrace = beforeCursor.lastIndexOf('{{');
        if (lastDoubleBrace !== -1 && !beforeCursor.slice(lastDoubleBrace).includes('}}')) {
            const query = beforeCursor.slice(lastDoubleBrace + 2).toLowerCase();
            const matches = Object.keys(variables).filter(k => k.toLowerCase().includes(query));
            setSuggestions(matches.map(m => `env:${m}`)); // Prefix with env: to identify type
            setSuggestionIndex(0);
            return;
        }

        // URL History Suggestions (match from history + common bases)
        if (val.length > 0 && val.length < 50) {
            const lowerVal = val.toLowerCase();
            
            // Get matching URLs from history
            const historyMatches = urlHistory
                .filter(u => u.toLowerCase().includes(lowerVal) && u !== val)
                .slice(0, 3);
            
            // Common URL bases
            const bases = ['https://', 'http://', 'http://localhost:3000', 'http://localhost:4000', 'http://localhost:8080'];
            const baseMatches = bases.filter(b => b.startsWith(lowerVal) && b !== val);
            
            // Combine: history first, then bases
            const allMatches = [...new Set([...historyMatches, ...baseMatches])].slice(0, 5);
            
            if (allMatches.length > 0) {
                setSuggestions(allMatches.map(m => `url:${m}`)); // Prefix with url: to identify type
                setSuggestionIndex(0);
                return;
            }
        }
        setSuggestions([]);
        setIsDirty(true);
    };

    const handleSuggestionSelect = (suggestion: string) => {
        const val = currentReq.url;
        const beforeCursor = val.slice(0, cursorPos);
        const afterCursor = val.slice(cursorPos);

        // Check if it's an env variable or URL suggestion
        if (suggestion.startsWith('env:')) {
            const varName = suggestion.slice(4);
            const lastDoubleBrace = beforeCursor.lastIndexOf('{{');
            const newVal = beforeCursor.slice(0, lastDoubleBrace) + `{{${varName}}}` + afterCursor;
            setCurrentReq({ ...currentReq, url: newVal });
        } else if (suggestion.startsWith('url:')) {
            const url = suggestion.slice(4);
            setCurrentReq({ ...currentReq, url: url });
        } else {
            // Fallback for backward compatibility
            const lastDoubleBrace = beforeCursor.lastIndexOf('{{');
            const newVal = beforeCursor.slice(0, lastDoubleBrace) + `{{${suggestion}}}` + afterCursor;
            setCurrentReq({ ...currentReq, url: newVal });
        }
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

            // Save URL to history for future suggestions
            addToUrlHistory(finalUrl);

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

    const secondaryBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    const mainBg = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
    const inputBg = theme === 'dark' ? 'bg-gray-950' : 'bg-white';
    const hoverBg = theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
    const activeHoverBg = theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200';

    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>Loading Client...</div>;
    if (error || !doc) return <div className={`h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-red-500' : 'bg-gray-50 text-red-600'}`}>Failed to load</div>;

    return (
        <div className={`flex h-[calc(100vh-64px)] overflow-hidden font-sans text-xs relative ${theme === 'dark' ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
            {/* Sidebar */}
            <div
                className={`${secondaryBg} border-r ${borderCol} flex flex-col transition-all duration-200 shadow-xl z-20 ${isSidebarCollapsed ? 'w-12' : ''}`}
                style={{ width: isSidebarCollapsed ? '48px' : `${sidebarWidth}px` }}
            >
                <div className={`p-3 border-b ${borderCol} flex flex-col gap-2 ${secondaryBg} min-h-[60px]`}>
                    <div className="flex items-center justify-between">
                        {!isSidebarCollapsed && <h2 className={`font-bold ${textColor} truncate text-sm`} title={doc.title}>{doc.title}</h2>}
                        <div className="flex items-center gap-1 ml-auto">
                            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`p-1 rounded ${subTextColor} hover:bg-opacity-10 hover:bg-gray-400`}>
                                {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                            </button>
                        </div>
                    </div>

                    {!isSidebarCollapsed && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {canEdit && (
                                <button
                                    onClick={handleAddRequest}
                                    className={`p-1.5 rounded flex-1 flex items-center justify-center gap-1 transition-all border ${theme === 'dark' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/40' : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'}`}
                                    title="Add New Request (Alt+N)"
                                >
                                    <Plus size={14} /> <span className="font-bold">NEW</span>
                                </button>
                            )}
                            {canEdit && (
                                <>
                                    <button onClick={() => handleSaveCollection()} className={`p-1.5 rounded flex-1 flex items-center justify-center gap-1 transition-all relative border ${theme === 'dark' ? 'bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/40' : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'}`} title="Save Collection (Ctrl+S)">
                                        <Save size={14} /> {isDirty && <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-gray-800 animate-pulse" />}
                                    </button>
                                    <button onClick={handleShare} className={`p-1.5 rounded flex-1 flex items-center justify-center gap-1 transition-all border ${doc.isPublic ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700' : theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`} title={doc.isPublic ? 'Make Private' : 'Make Public'}>
                                        <Share2 size={14} />
                                    </button>
                                </>
                            )}
                            <button 
                                onClick={() => handleGenerateMarkdown(false)} 
                                className={`p-1.5 rounded border flex-1 flex items-center justify-center gap-1 transition-all ${theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`} 
                                title="Export Documentation"
                            >
                                <FileText size={14} />
                            </button>
                            {canEdit && (
                                <button onClick={() => setShowEnv(!showEnv)} className={`p-1.5 rounded border flex-1 flex items-center justify-center gap-1 transition-all ${theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`} title="Environment Variables">
                                    <Settings size={14} />
                                </button>
                            )}
                        </div>
                    )}
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
                                className={`group flex items-center justify-between p-2.5 cursor-pointer border-l-2 transition-all relative ${
                                    selectedIdx === idx 
                                        ? theme === 'dark' 
                                            ? 'bg-indigo-600/20 border-indigo-500' 
                                            : 'bg-indigo-50 border-indigo-500' 
                                        : theme === 'dark'
                                            ? 'border-transparent hover:bg-gray-700/50'
                                            : 'border-transparent hover:bg-gray-100'
                                } ${canEdit && draggedIdx === idx ? 'opacity-50 ring-1 ring-indigo-500 ring-inset' : ''}`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    {canEdit && <GripVertical size={12} className={`${theme === 'dark' ? 'text-gray-600 group-hover:text-gray-400' : 'text-gray-400 group-hover:text-gray-600'} cursor-grab active:cursor-grabbing flex-shrink-0`} />}
                                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-10 text-center flex-shrink-0 ${ep.method === 'GET' ? 'bg-green-600/20 text-green-500' :
                                        ep.method === 'POST' ? 'bg-blue-600/20 text-blue-500' :
                                            ep.method === 'PUT' ? 'bg-yellow-600/20 text-yellow-600' :
                                                ep.method === 'DELETE' ? 'bg-red-600/20 text-red-500' :
                                                    theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                                        }`}>{ep.method}</span>
                                    <span className={`truncate text-[11px] ${selectedIdx === idx ? `font-bold ${textColor}` : theme === 'dark' ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'}`}>{ep.name || 'Untitled'}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleCopyMarkdown(ep); }}
                                        className={`opacity-0 group-hover:opacity-100 p-1 transition-all ${theme === 'dark' ? 'text-gray-500 hover:text-indigo-400' : 'text-gray-400 hover:text-indigo-600'}`}
                                        title="Copy Request Markdown"
                                    >
                                        <Copy size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuIdx(openMenuIdx === idx ? null : idx);
                                        }}
                                        className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${theme === 'dark' ? 'text-gray-400 hover:text-indigo-400 hover:bg-gray-700' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-200'}`}
                                    >
                                        <MoreVertical size={14} />
                                    </button>

                                    {openMenuIdx === idx && (
                                        <div className={`absolute right-0 mt-1 w-40 ${secondaryBg} border ${borderCol} rounded-lg shadow-2xl z-50 py-1 text-[10px]`}>
                                            <button onClick={(e) => { e.stopPropagation(); handleCopyAsCurl(ep); setOpenMenuIdx(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                                                <Terminal size={12} className="text-orange-500" /> Copy as cURL
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleCopyAsFetch(ep); setOpenMenuIdx(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                                                <Code size={12} className="text-blue-500" /> Copy as Fetch
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(resolveUrl(ep)); toast.success('URL copied'); setOpenMenuIdx(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                                                <Copy size={12} className="text-green-500" /> Copy URL
                                            </button>
                                            <div className={`h-px ${borderCol} my-1`} />
                                            <button onClick={(e) => duplicateRequest(idx, e)} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                                                <Plus size={12} /> Duplicate
                                            </button>
                                            <button onClick={(e) => deleteRequest(idx, e)} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/20' : 'text-red-600 hover:bg-red-50'}`}>
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
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
                        <div className={`${secondaryBg} border-b ${borderCol} p-3 flex items-center gap-3 shadow-md z-10`}>
                            <div className="flex-1 flex gap-2 min-w-0">
                                <select
                                    value={currentReq.method}
                                    disabled={!canEdit}
                                    onChange={(e) => {
                                        setCurrentReq({ ...currentReq, method: e.target.value });
                                        setIsDirty(true);
                                    }}
                                    className={`flex-shrink-0 px-2 py-1.5 ${inputBg} border ${borderCol} rounded-lg font-bold ${textColor} focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 text-[11px]`}
                                >
                                    <option>GET</option>
                                    <option>POST</option>
                                    <option>PUT</option>
                                    <option>DELETE</option>
                                    <option>PATCH</option>
                                </select>
                                <div className="flex-1 relative group min-w-0">
                                    {/* Hidden overlay for syntax highlighting */}
                                    <div 
                                        className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg border border-transparent"
                                        style={{ 
                                            padding: '6px 32px 6px 12px',
                                            lineHeight: '20px'
                                        }}
                                    >
                                        <HighlightedText
                                            text={currentReq.url}
                                            className="text-[11px] font-mono leading-[20px]"
                                        />
                                    </div>
                                    {/* Actual input */}
                                    <input
                                        type="text"
                                        value={currentReq.url}
                                        readOnly={!canEdit}
                                        onChange={handleUrlChange}
                                        onKeyDown={handleKeyDown}
                                        className={`w-full border ${borderCol} rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-[11px] ${inputBg} ${!canEdit ? 'cursor-default' : ''}`}
                                        style={{ 
                                            color: 'transparent',
                                            caretColor: theme === 'dark' ? '#e5e7eb' : '#1f2937',
                                            padding: '6px 32px 6px 12px',
                                            lineHeight: '20px'
                                        }}
                                        placeholder="Enter Request URL"
                                    />
                                    {/* Copy button */}
                                    <div className="absolute inset-y-0 right-0 z-20 flex items-center pr-2">
                                        <button
                                            onClick={handleCopyUrl}
                                            className={`p-1 ${subTextColor} hover:text-indigo-400 hover:bg-gray-500/10 rounded-md transition-all`}
                                            title="Copy full URL"
                                        >
                                            <Copy size={12} />
                                        </button>
                                    </div>

                                    {/* Suggestions Dropdown */}
                                    {suggestions.length > 0 && (
                                        <div className={`absolute left-0 top-full mt-1 w-80 ${secondaryBg} border ${borderCol} rounded-lg shadow-2xl z-50 py-1 max-h-60 overflow-y-auto`}>
                                            {suggestions.map((s, idx) => {
                                                const isEnv = s.startsWith('env:');
                                                const isUrl = s.startsWith('url:');
                                                const displayValue = isEnv ? s.slice(4) : isUrl ? s.slice(4) : s;
                                                
                                                return (
                                                    <div
                                                        key={s}
                                                        onClick={() => handleSuggestionSelect(s)}
                                                        className={`px-3 py-2 text-[11px] cursor-pointer flex items-center gap-2 ${idx === suggestionIndex ? 'bg-indigo-600 text-white' : `${subTextColor} hover:bg-opacity-10 hover:bg-gray-400`}`}
                                                    >
                                                        {isEnv ? (
                                                            <>
                                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${idx === suggestionIndex ? 'bg-indigo-500' : 'bg-blue-600/20 text-blue-400'}`}>
                                                                    ENV
                                                                </span>
                                                                <span className="font-mono flex-1">{`{{${displayValue}}}`}</span>
                                                                <span className={`text-[9px] truncate max-w-[100px] ${idx === suggestionIndex ? 'text-indigo-200' : 'text-gray-500'}`}>
                                                                    {variables[displayValue]}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${idx === suggestionIndex ? 'bg-indigo-500' : 'bg-green-600/20 text-green-400'}`}>
                                                                    URL
                                                                </span>
                                                                <span className="font-mono flex-1 truncate">{displayValue}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleSendRequest}
                                    disabled={reqLoading}
                                    className="flex-shrink-0 px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 text-[11px] disabled:opacity-50"
                                >
                                    {reqLoading ? <span className="animate-spin text-xs">⌛</span> : <Send size={14} />}
                                    SEND
                                </button>
                                {canEdit && (
                                    <button
                                        onClick={handleSaveSingleRequest}
                                        disabled={!isDirty}
                                        className={`flex-shrink-0 px-4 py-1.5 ${isDirty ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20' : `${theme === 'dark' ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-gray-100 text-gray-400 border-gray-200'} cursor-not-allowed opacity-50`} rounded-lg font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 text-[11px] border`}
                                        title={isDirty ? "Save this request" : "No changes to save"}
                                    >
                                        <Save size={14} />
                                        SAVE
                                    </button>
                                )}
                            </div>
                            <div className={`flex items-center gap-1 border-l pl-3 ${borderCol} flex-shrink-0`}>
                                <button
                                    onClick={() => handleDownloadIndividualMarkdown(currentReq)}
                                    className={`p-1.5 ${subTextColor} hover:text-green-500 hover:bg-green-500/10 rounded-md transition-all`}
                                    title="Download Request Markdown"
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    onClick={() => handleCopyMarkdown(currentReq)}
                                    className={`p-1.5 ${subTextColor} hover:text-indigo-500 hover:bg-indigo-500/10 rounded-md transition-all`}
                                    title="Copy Request Markdown"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Request details */}
                        <div className={`flex-1 overflow-hidden flex ${paneLayout === 'horizontal' ? 'flex-row' : 'flex-col'}`}>
                            {/* Left Pane: Config */}
                            <div
                                className={`border-r ${borderCol} flex flex-col min-h-0 min-w-0 ${mainBg} ${paneLayout === 'horizontal' ? '' : 'overflow-y-auto'}`}
                                style={paneLayout === 'horizontal' ? { width: `${mainSplitRatio}%` } : { height: `${verticalSplitRatio}%` }}
                            >
                                <div className={`flex border-b ${borderCol} ${secondaryBg}`}>
                                    {['docs', 'params', 'headers', 'body'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab as any)}
                                            className={`px-4 py-2 font-bold text-[10px] border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-indigo-500 text-indigo-500 bg-indigo-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-3 flex-1 overflow-y-auto">
                                    {activeTab === 'headers' && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1 px-1">
                                                <span>KEY</span><span>VALUE</span>
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
                                                        className={`flex-1 px-2 py-1.5 ${inputBg} border ${borderCol} ${textColor} rounded text-[11px]`}
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
                                                        className={`flex-1 px-2 py-1.5 ${inputBg} border ${borderCol} ${textColor} rounded text-[11px]`}
                                                        placeholder="Value"
                                                    />
                                                    {canEdit && <button onClick={() => {
                                                        const newH = currentReq.headers.filter((_: any, idx: number) => idx !== i);
                                                        setCurrentReq({ ...currentReq, headers: newH });
                                                        setIsDirty(true);
                                                    }} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>}
                                                </div>
                                            ))}
                                            {canEdit && <button onClick={() => {
                                                setCurrentReq({ ...currentReq, headers: [...(currentReq.headers || []), { key: '', value: '' }] });
                                                setIsDirty(true);
                                            }} className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors">+ ADD HEADER</button>}
                                        </div>
                                    )}

                                    {activeTab === 'body' && (
                                        <div className="h-full flex flex-col min-h-[300px]">
                                            <div className="mb-2 flex justify-between items-center text-[10px] text-gray-500 font-bold">
                                                <div className="flex items-center gap-3">
                                                    <label className="flex items-center gap-1.5 cursor-pointer text-indigo-400 group">
                                                        <div className={`w-3 h-3 rounded-full border ${theme === 'dark' ? 'border-indigo-500 bg-indigo-500/20' : 'border-indigo-400 bg-indigo-50'} flex items-center justify-center`}>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                        </div>
                                                        RAW (JSON)
                                                    </label>
                                                    <button onClick={handleCopyRequest} className="text-gray-500 hover:text-indigo-400 flex items-center gap-1 transition-colors">
                                                        <Copy size={10} /> COPY BODY
                                                    </button>
                                                </div>
                                                {canEdit && <button onClick={handleFormatJson} className="px-1.5 py-0.5 hover:bg-indigo-600/20 text-indigo-400 rounded border border-indigo-600/30 flex items-center gap-1 font-bold transition-all">
                                                    <CheckCircle2 size={10} /> FORMAT JSON
                                                </button>}
                                            </div>

                                            <div className={`relative flex-1 rounded-xl border ${borderCol} overflow-hidden ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-[#fafafa]'}`}>
                                                <div
                                                    ref={bodyEditorRef}
                                                    className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
                                                >
                                                    <SyntaxHighlighter
                                                        language="json"
                                                        style={theme === 'dark' ? vscDarkPlus : materialLight}
                                                        codeTagProps={{
                                                            style: {
                                                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                                                                fontSize: '13px',
                                                                lineHeight: '20px',
                                                                padding: 0
                                                            }
                                                        }}
                                                        customStyle={{
                                                            margin: 0,
                                                            background: 'transparent',
                                                            padding: '12px',
                                                            fontSize: '13px',
                                                            lineHeight: '20px',
                                                            minHeight: '100%',
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-all',
                                                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                                                        }}
                                                    >
                                                        {(currentReq?.body?.raw || '') + ((currentReq?.body?.raw || '').endsWith('\n') ? ' ' : '')}
                                                    </SyntaxHighlighter>
                                                </div>
                                                <textarea
                                                    value={currentReq?.body?.raw || ''}
                                                    readOnly={!canEdit}
                                                    spellCheck={false}
                                                    onScroll={(e) => {
                                                        if (bodyEditorRef.current) {
                                                            bodyEditorRef.current.scrollTop = e.currentTarget.scrollTop;
                                                            bodyEditorRef.current.scrollLeft = e.currentTarget.scrollLeft;
                                                        }
                                                    }}
                                                    onChange={(e) => {
                                                        if (!currentReq) return;
                                                        setCurrentReq({ ...currentReq, body: { ...currentReq.body, raw: e.target.value } });
                                                        setIsDirty(true);
                                                    }}
                                                    className="absolute inset-0 w-full h-full bg-transparent text-transparent outline-none resize-none overflow-auto selection:bg-indigo-500/30 z-10"
                                                    placeholder='{ "key": "value" }'
                                                    style={{
                                                        padding: '12px',
                                                        fontSize: '13px',
                                                        lineHeight: '20px',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-all',
                                                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                                                        caretColor: theme === 'dark' ? '#fff' : '#6366f1'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'docs' && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end">
                                                <div className="flex-1">
                                                    <label className={`text-[10px] font-bold ${textColor} opacity-60 uppercase mb-1 block`}>REQUEST NAME</label>
                                                    <input
                                                        value={currentReq.name}
                                                        readOnly={!canEdit}
                                                        onChange={(e) => {
                                                            setCurrentReq({ ...currentReq, name: e.target.value });
                                                            setIsDirty(true);
                                                        }}
                                                        className={`w-full text-base font-bold px-2 py-1.5 ${inputBg} border ${borderCol} ${textColor} rounded focus:ring-1 focus:ring-indigo-500 outline-none ${!canEdit ? 'bg-transparent border-transparent px-0' : ''}`}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleCopyMarkdown(currentReq)}
                                                    className="mb-0.5 ml-2 p-2 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 rounded-lg flex items-center gap-2 font-bold text-[10px] transition-all border border-indigo-600/20"
                                                    title="Copy as Markdown"
                                                >
                                                    <Copy size={14} /> COPY MKD
                                                </button>
                                            </div>
                                            <div>
                                                <label className={`text-[10px] font-bold ${textColor} opacity-60 uppercase mb-1 block`}>DESCRIPTION</label>
                                                <textarea
                                                    value={currentReq.description || ''}
                                                    readOnly={!canEdit}
                                                    onChange={(e) => {
                                                        setCurrentReq({ ...currentReq, description: e.target.value });
                                                        setIsDirty(true);
                                                    }}
                                                    className={`w-full h-40 p-3 ${inputBg} border ${borderCol} ${textColor} rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-[11px] leading-relaxed ${!canEdit ? 'bg-transparent border-transparent px-0 h-auto min-h-[100px]' : ''}`}
                                                    placeholder="API Documentation..."
                                                />
                                            </div>

                                            {canEdit && (
                                                <div className={`pt-3 border-t ${borderCol}`}>
                                                    <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1.5 flex items-center gap-1.5">
                                                        <Sparkles size={12} />
                                                        AI GENERATION COMMAND
                                                    </label>
                                                    <div className="flex flex-col gap-2">
                                                        <textarea
                                                            value={aiCommand}
                                                            onChange={(e) => setAiCommand(e.target.value)}
                                                            className={`w-full h-20 p-2 border ${theme === 'dark' ? 'border-indigo-900/50 bg-indigo-950/20 text-indigo-200' : 'border-indigo-200 bg-indigo-50 text-indigo-700'} rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-[10px]`}
                                                            placeholder="Custom AI instructions..."
                                                        />
                                                        <button
                                                            onClick={handleAiGenerate}
                                                            disabled={aiMutation.isPending}
                                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                                                        >
                                                            {aiMutation.isPending ? 'REFINING...' : 'GENERATE / REFINE WITH AI'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'params' && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <h4 className="text-[10px] font-bold text-gray-500 uppercase">QUERY & PATH PARAMS</h4>
                                                {canEdit && <button
                                                    onClick={() => {
                                                        const newParams = [...(currentReq.params || []), { key: '', value: '', type: 'query' }];
                                                        setCurrentReq({ ...currentReq, params: newParams });
                                                        setIsDirty(true);
                                                    }}
                                                    className="p-1 px-1.5 text-[9px] bg-indigo-600/20 text-indigo-400 rounded flex items-center gap-1 font-bold hover:bg-indigo-600/30 border border-indigo-600/30"
                                                >
                                                    <Plus size={10} /> ADD PARAM
                                                </button>}
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex text-[9px] font-bold text-gray-600 px-1 border-b border-gray-800 pb-1 uppercase">
                                                    <span className="w-16">TYPE</span>
                                                    <span className="flex-1">KEY</span>
                                                    <span className="flex-1 ml-2">VALUE</span>
                                                    <span className="w-6"></span>
                                                </div>
                                                {(currentReq.params || []).map((p: any, i: number) => (
                                                    <div key={i} className="flex gap-2 items-center">
                                                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded w-16 text-center uppercase ${p.type === 'path' ? 'bg-orange-600/20 text-orange-400 border border-orange-600/20' : 'bg-blue-600/20 text-blue-500 border border-blue-600/20'}`}>
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
                                                            className={`flex-1 px-2 py-1 ${inputBg} border ${borderCol} ${textColor} rounded text-[11px] ${(!canEdit || p.type === 'path') ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
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
                                                            className={`flex-1 px-2 py-1 ${inputBg} border ${borderCol} ${textColor} rounded text-[11px] ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                                                                className={`p-1 text-gray-500 hover:text-red-400 ${p.type === 'path' ? 'opacity-10 cursor-not-allowed' : ''}`}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {!(currentReq.params || []).length && (
                                                    <div className="text-center py-4 border border-dashed border-gray-800 rounded-lg text-gray-600 text-[10px]">
                                                        NO PARAMETERS DETECTED
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
                                    className={`w-1 cursor-col-resize hover:bg-indigo-500 transition-colors z-10 flex-shrink-0 ${isResizingMain ? 'bg-indigo-600' : borderCol}`}
                                    onMouseDown={() => setIsResizingMain(true)}
                                />
                            ) : (
                                <div
                                    className={`h-1 cursor-row-resize hover:bg-indigo-500 transition-colors z-10 flex-shrink-0 ${isResizingVertical ? 'bg-indigo-600' : borderCol}`}
                                    onMouseDown={() => setIsResizingVertical(true)}
                                />
                            )}

                            {/* Right Pane: Response */}
                            <div
                                className={`${mainBg} flex flex-col border-l ${borderCol} min-w-0 relative ${paneLayout === 'horizontal' ? '' : 'border-t'}`}
                                style={paneLayout === 'horizontal' ? { width: `${100 - mainSplitRatio}%` } : { height: `${100 - verticalSplitRatio}%` }}
                            >
                                <div className={`p-2 border-b ${borderCol} ${secondaryBg} flex justify-between items-center z-10 relative`}>
                                    <div className="flex items-center gap-4">
                                        <h3 className={`font-bold ${textColor} opacity-60 text-[10px] uppercase`}>Response</h3>
                                        {response && (
                                            <div className="flex items-center gap-3 text-[10px]">
                                                <span className={`font-bold ${response.status >= 200 && response.status < 300 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {response.status} {response.statusText}
                                                </span>
                                                <span className={subTextColor}>{response.time}ms</span>
                                                <button
                                                    onClick={() => setShowAbsoluteTime(!showAbsoluteTime)}
                                                    className={`text-[9px] ${subTextColor} hover:text-indigo-500 flex items-center gap-1 ${inputBg} px-1.5 py-0.5 rounded border ${borderCol}`}
                                                >
                                                    {showAbsoluteTime
                                                        ? new Date(response.timestamp || Date.now()).toLocaleTimeString()
                                                        : 'JUST NOW'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 items-center">
                                        {response && (
                                            <>
                                                {showResponseFilter ? (
                                                    <div className="flex items-center gap-1 mr-1">
                                                        <div className="relative">
                                                            <Search size={12} className={`absolute left-2 top-1/2 -translate-y-1/2 ${subTextColor}`} />
                                                            <input
                                                                type="text"
                                                                value={responseFilter}
                                                                onChange={(e) => setResponseFilter(e.target.value)}
                                                                placeholder="Filter response..."
                                                                className={`pl-7 pr-2 py-1 text-[10px] ${inputBg} border ${borderCol} rounded focus:ring-1 focus:ring-indigo-500 outline-none w-40 ${textColor}`}
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => { setShowResponseFilter(false); setResponseFilter(''); }}
                                                            className={`p-1 ${subTextColor} hover:text-red-400 rounded`}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowResponseFilter(true)}
                                                        className={`p-1 rounded transition-all ${subTextColor} hover:bg-gray-600 hover:text-white`}
                                                        title="Filter Response (Ctrl+F)"
                                                    >
                                                        <Search size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={handleCopyResponse}
                                                    className={`p-1 px-2 text-[9px] ${subTextColor} hover:text-indigo-500 ${inputBg} hover:bg-opacity-50 rounded border ${borderCol} flex items-center gap-1 transition-all mr-1 font-bold`}
                                                >
                                                    <Copy size={10} /> COPY
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => setShowHistory(!showHistory)}
                                            className={`p-1 rounded ${showHistory ? 'bg-indigo-600 text-white' : `${subTextColor} hover:bg-opacity-10 hover:bg-gray-400`}`}
                                            title="History"
                                        >
                                            <History size={14} />
                                        </button>
                                        <button
                                            onClick={() => setPaneLayout('horizontal')}
                                            className={`p-1 rounded ${paneLayout === 'horizontal' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-700'}`}
                                            title="Layout Right"
                                        >
                                            <Columns2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => setPaneLayout('vertical')}
                                            className={`p-1 rounded ${paneLayout === 'vertical' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-700'}`}
                                            title="Layout Bottom"
                                        >
                                            <Rows2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className={`flex-1 relative w-full h-full ${inputBg}`}>
                                    {showHistory && (
                                        <div className={`absolute inset-0 z-20 ${secondaryBg} backdrop-blur-sm border-r ${borderCol} p-4 overflow-y-auto animate-in slide-in-from-right duration-200 shadow-2xl`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className={`font-bold ${textColor} text-sm flex items-center gap-2`}>
                                                    <RotateCcw size={16} className="text-indigo-500" />
                                                    Response History
                                                </h4>
                                                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-800 rounded-full">
                                                    <X size={18} className="text-gray-400" />
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {!(currentReq.history || []).length && (
                                                    <div className="text-center py-10 text-gray-500 text-[11px] border-2 border-dashed border-gray-800 rounded-xl">
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
                                                        className={`p-3 border ${borderCol} rounded-lg hover:border-indigo-500 hover:bg-indigo-500/5 cursor-pointer transition-all relative group`}
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className={`text-[9px] font-bold px-1 rounded ${item.lastResponse?.status >= 200 && item.lastResponse?.status < 300
                                                                ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                                                                }`}>
                                                                {item.lastResponse?.status}
                                                            </span>
                                                            <span className="text-[9px] text-gray-500">
                                                                {new Date(item.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className={`text-[11px] font-bold ${textColor} truncate tracking-tight`}>{item.method} {item.url}</div>
                                                        <div className={`text-[9px] ${subTextColor} mt-1`}>{item.lastResponse?.time}ms • {item.name || 'Untitled'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {isViewingHistory && (
                                        <div className="absolute top-0 left-0 right-0 z-30 bg-indigo-900 border-b border-indigo-500/30 px-4 py-2 flex justify-between items-center animate-in fade-in duration-200">
                                            <span className="text-[10px] text-indigo-200 font-bold flex items-center gap-2">
                                                <Clock size={12} /> VIEWING HISTORICAL SNAPSHOT
                                            </span>
                                            <button
                                                onClick={() => {
                                                    const latest = endpoints[selectedIdx];
                                                    setCurrentReq({ ...latest });
                                                    setResponse(latest.lastResponse || null);
                                                    setIsViewingHistory(false);
                                                }}
                                                className="text-[9px] bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-500 font-bold transition-colors shadow-lg"
                                            >
                                                BACK TO LATEST
                                            </button>
                                        </div>
                                    )}
                                    {!response && !reqLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-[11px] font-bold">
                                            HIT SEND TO SEE RESPONSE
                                        </div>
                                    )}
                                    {reqLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                        </div>
                                    )}
                                    {response && !response.error && (() => {
                                        const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
                                        const filterLower = responseFilter.toLowerCase().trim();
                                        const hasFilter = filterLower.length > 0;
                                        const matchCount = hasFilter ? (responseText.toLowerCase().match(new RegExp(filterLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length : 0;
                                        
                                        // Highlight matches in the response
                                        const highlightMatches = (text: string) => {
                                            if (!hasFilter) return text;
                                            const escapedFilter = filterLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            const regex = new RegExp(`(${escapedFilter})`, 'gi');
                                            return text.replace(regex, '<<<HIGHLIGHT>>>$1<<<ENDHIGHLIGHT>>>');
                                        };
                                        
                                        const highlightedText = highlightMatches(responseText);
                                        
                                        return (
                                            <div className="absolute inset-0 overflow-auto scrollbar-thin">
                                                {hasFilter && (
                                                    <div className={`sticky top-0 z-10 px-4 py-2 text-[10px] font-bold ${theme === 'dark' ? 'bg-indigo-900/90 text-indigo-200' : 'bg-indigo-100 text-indigo-700'} border-b ${borderCol} flex items-center gap-2`}>
                                                        <Search size={12} />
                                                        {matchCount > 0 ? (
                                                            <span>{matchCount} match{matchCount !== 1 ? 'es' : ''} found for "{responseFilter}"</span>
                                                        ) : (
                                                            <span>No matches found for "{responseFilter}"</span>
                                                        )}
                                                    </div>
                                                )}
                                                {hasFilter ? (
                                                    <pre 
                                                        className="p-6 font-mono text-[13px] whitespace-pre-wrap break-words"
                                                        style={{ color: theme === 'dark' ? '#d4d4d4' : '#1f2937' }}
                                                    >
                                                        {highlightedText.split(/<<<HIGHLIGHT>>>|<<<ENDHIGHLIGHT>>>/).map((part, i) => 
                                                            i % 2 === 1 ? (
                                                                <mark key={i} className="bg-yellow-400 text-black px-0.5 rounded">{part}</mark>
                                                            ) : (
                                                                <span key={i}>{part}</span>
                                                            )
                                                        )}
                                                    </pre>
                                                ) : (
                                                    <SyntaxHighlighter
                                                        style={theme === 'dark' ? vscDarkPlus : materialLight}
                                                        language="json"
                                                        customStyle={{
                                                            margin: 0,
                                                            minHeight: '100%',
                                                            borderRadius: 0,
                                                            fontSize: '13px',
                                                            backgroundColor: theme === 'dark' ? 'transparent' : '#fafafa',
                                                            padding: '24px'
                                                        }}
                                                        wrapLongLines={false}
                                                    >
                                                        {responseText}
                                                    </SyntaxHighlighter>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    {response && response.error && (
                                        <div className="absolute inset-0 p-4 text-red-400 bg-red-950/20 overflow-auto">
                                            <pre className="text-red-400 whitespace-pre-wrap break-all font-mono text-[11px]">Error: {response.message}</pre>
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
            {showPreview && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowPreview(false);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowPreview(false);
                    }}
                    tabIndex={0}
                >
                    <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideIn`}>
                        {/* Header */}
                        <div className={`px-6 py-4 border-b no-print ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'} flex justify-between items-center`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-600/20' : 'bg-indigo-50'}`}>
                                    <FileText size={20} className="text-indigo-500" />
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {doc?.title || 'Documentation'} 
                                    </h3>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} documented
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(previewContent);
                                        toast.success('Markdown copied!');
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} rounded-lg transition-all text-xs font-medium`}
                                >
                                    <Copy size={14} />
                                    Copy MD
                                </button>
                                <button
                                    onClick={() => handleGenerateMarkdown(true)}
                                    className={`flex items-center gap-2 px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} rounded-lg transition-all text-xs font-medium`}
                                >
                                    <Download size={14} />
                                    Download MD
                                </button>
                                <button
                                    onClick={handleDownloadPdf}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-xs font-medium shadow-lg"
                                >
                                    <Download size={14} />
                                    Export PDF
                                </button>
                                <div className={`w-px h-8 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} mx-2`} />
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'} rounded-lg transition-all`}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Sidebar - Table of Contents */}
                            <div className={`w-56 flex-shrink-0 border-r no-print ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-100 bg-gray-50'} overflow-y-auto p-4`}>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Contents
                                </h4>
                                <nav className="space-y-1">
                                    {endpoints.map((ep, idx) => (
                                        <a
                                            key={idx}
                                            href={`#endpoint-${idx}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                document.getElementById(`endpoint-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-gray-100'}`}
                                        >
                                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                                                ep.method === 'GET' ? 'bg-green-600/20 text-green-500' :
                                                ep.method === 'POST' ? 'bg-blue-600/20 text-blue-500' :
                                                ep.method === 'PUT' ? 'bg-yellow-600/20 text-yellow-600' :
                                                ep.method === 'DELETE' ? 'bg-red-600/20 text-red-500' :
                                                'bg-purple-600/20 text-purple-500'
                                            }`}>
                                                {ep.method}
                                            </span>
                                            <span className="truncate">{ep.name || 'Untitled'}</span>
                                        </a>
                                    ))}
                                </nav>
                            </div>

                            {/* Main Content */}
                            <div className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`} id="markdown-preview-content">
                                <div className="max-w-4xl mx-auto px-8 py-10" id="printable-content">
                                    {/* Document Header */}
                                    <div className="mb-12 pb-8 border-b border-gray-700/20">
                                        <h1 className={`text-4xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                            {doc?.title || 'API Documentation'}
                                        </h1>
                                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Generated on {new Date().toLocaleDateString('en-US', { 
                                                weekday: 'long', 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </p>
                                    </div>

                                    {/* Endpoints */}
                                    {endpoints.map((ep, idx) => (
                                        <div key={idx} id={`endpoint-${idx}`} className="mb-16 scroll-mt-8">
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                    ep.method === 'GET' ? 'bg-green-600/20 text-green-500' :
                                                    ep.method === 'POST' ? 'bg-blue-600/20 text-blue-500' :
                                                    ep.method === 'PUT' ? 'bg-yellow-600/20 text-yellow-600' :
                                                    ep.method === 'DELETE' ? 'bg-red-600/20 text-red-500' :
                                                    'bg-purple-600/20 text-purple-500'
                                                }`}>
                                                    {ep.method}
                                                </span>
                                                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                    {ep.name || 'Untitled'}
                                                </h2>
                                            </div>

                                            <div className={`px-4 py-3 rounded-lg font-mono text-sm mb-6 ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                                {resolveUrl(ep)}
                                            </div>

                                            {ep.description && (
                                                <p className={`mb-6 text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {resolveAll(ep.description, ep)}
                                                </p>
                                            )}

                                            {/* Headers */}
                                            {ep.headers && ep.headers.length > 0 && ep.headers.some((h: any) => h.key) && (
                                                <div className="mb-6">
                                                    <h3 className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        Headers
                                                    </h3>
                                                    <div className={`rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
                                                        <table className="w-full text-sm">
                                                            <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
                                                                <tr>
                                                                    <th className={`px-4 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Key</th>
                                                                    <th className={`px-4 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Value</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {ep.headers.filter((h: any) => h.key).map((h: any, hidx: number) => (
                                                                    <tr key={hidx} className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                                                        <td className={`px-4 py-2 font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{h.key}</td>
                                                                        <td className={`px-4 py-2 font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{resolveAll(h.value, ep)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Request Body */}
                                            {ep.body?.raw && (
                                                <div className="mb-6">
                                                    <h3 className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        Request Body
                                                    </h3>
                                                    <SyntaxHighlighter
                                                        language="json"
                                                        style={theme === 'dark' ? vscDarkPlus : materialLight}
                                                        customStyle={{
                                                            margin: 0,
                                                            borderRadius: '0.5rem',
                                                            fontSize: '13px',
                                                            padding: '16px'
                                                        }}
                                                    >
                                                        {resolveAll(ep.body.raw, ep)}
                                                    </SyntaxHighlighter>
                                                </div>
                                            )}

                                            {/* Last Response */}
                                            {ep.lastResponse && (
                                                <div className="mb-6">
                                                    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        Response
                                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                                            ep.lastResponse.status >= 200 && ep.lastResponse.status < 300 
                                                                ? 'bg-green-600/20 text-green-500' 
                                                                : 'bg-red-600/20 text-red-500'
                                                        }`}>
                                                            {ep.lastResponse.status}
                                                        </span>
                                                    </h3>
                                                    <SyntaxHighlighter
                                                        language="json"
                                                        style={theme === 'dark' ? vscDarkPlus : materialLight}
                                                        customStyle={{
                                                            margin: 0,
                                                            borderRadius: '0.5rem',
                                                            fontSize: '13px',
                                                            padding: '16px',
                                                            maxHeight: '400px',
                                                            overflow: 'auto'
                                                        }}
                                                    >
                                                        {JSON.stringify(ep.lastResponse.data, null, 2)}
                                                    </SyntaxHighlighter>
                                                </div>
                                            )}

                                            {idx < endpoints.length - 1 && (
                                                <hr className={`my-12 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Endpoint Search Modal */}
            <SearchBar
                endpoints={endpoints}
                isOpen={showSearchModal}
                onClose={() => setShowSearchModal(false)}
                onSelect={(idx) => {
                    setSelectedIdx(idx);
                    setShowSearchModal(false);
                }}
            />

            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsModal
                isOpen={showShortcutsModal}
                onClose={() => setShowShortcutsModal(false)}
            />

            {/* Floating Action Buttons */}
            <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
                <button
                    onClick={() => setShowShortcutsModal(true)}
                    className={`p-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-indigo-400' : 'bg-white text-gray-500 border-gray-200 hover:text-indigo-600'} border rounded-lg shadow-lg hover:shadow-xl transition-all`}
                    title="Keyboard Shortcuts (Ctrl+/)"
                >
                    <Keyboard size={16} />
                </button>
                <button
                    onClick={() => setShowSearchModal(true)}
                    className={`px-3 py-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-600 border-gray-200'} border rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-[11px] font-medium`}
                    title="Search Endpoints (Ctrl+K)"
                >
                    <Search size={14} />
                    <span>Search</span>
                    <kbd className={`ml-1 px-1.5 py-0.5 ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'} rounded text-[9px]`}>
                        Ctrl+K
                    </kbd>
                </button>
            </div>
        </div>
    );
}
