'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../../utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Layout, FileText, Copy, X, Download, Keyboard, Search, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EnvModal from '../../components/EnvModal';
import { useTheme } from '../../../context/ThemeContext';
import { useKeyboardShortcuts, createCommonShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { SearchBar } from '../../../components/SearchBar';
import { KeyboardShortcutsModal } from '../../../components/KeyboardShortcutsModal';
import { Folder as FolderType } from '../../../types';
import CreateFolderModal from './components/CreateFolderModal';
import { useFolders } from '../../../hooks/useFolders';
import { useEnvironments } from '../../../hooks/useEnvironments';
import { useGlobalEnvironments } from '../../../hooks/useGlobalEnvironments';
import { useRequestOrdering } from '../../../hooks/useRequestOrdering';
import { Sidebar } from './components/Sidebar';
import { RequestUrlBar } from './components/RequestUrlBar';
import { RequestTabs } from './components/RequestTabs';
import { ResponsePanel } from './components/ResponsePanel';
import { DocumentationView } from './components/DocumentationView';
import { ChangelogView } from './components/ChangelogView';
import { RequestTabBar } from './components/RequestTabBar';
import SaveVariableModal from './components/SaveVariableModal';
import { CollectionRunner } from './components/CollectionRunner';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { getThemeClasses } from './utils/theme';
import { useSidebarResize, useHorizontalPanelResize, useVerticalPanelResize } from './hooks/useResizable';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vscDarkPlus, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ProtectedRoute } from '../../../components/AuthGuard';

const deduplicateEndpoints = (eps: any[]) => {
    const seen = new Set();
    return eps.filter(ep => {
        if (!ep.id) return true;
        if (seen.has(ep.id)) return false;
        seen.add(ep.id);
        return true;
    });
};

function ApiClientContent() {
    const { id } = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);

    // Queries & Mutations
    const { data: docRes, isLoading, error } = useQuery<any>({
        queryKey: ['doc', id],
        queryFn: () => api.documentation.getById(id as string),
        retry: false
    });
    const doc = docRes?.data;

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

    const deleteRequestMutation = useMutation({
        mutationFn: (requestId: string) => api.documentation.deleteRequest(requestId)
    });

    const isOwner = me && doc && me.id === (doc as any).userId;
    const canEdit = isOwner;

    // State
    const [endpoints, setEndpoints] = useState<any[]>([]);
    const [selectedIdx, setSelectedIdx] = useState<number>(0);
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [showEnv, setShowEnv] = useState(false);
    const [currentReq, setCurrentReq] = useState<any>(null);
    const [response, setResponse] = useState<any>(null);
    const [reqLoading, setReqLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'auth' | 'body' | 'docs' | 'code'>('params');
    const [activeView, setActiveView] = useState<'client' | 'docs' | 'changelog'>('client');
    const [aiCommand, setAiCommand] = useState('Generate a professional name and a simple, clear description explaining what the request does and what the response means.');

    // UI State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [paneLayout, setPaneLayout] = useState<'horizontal' | 'vertical'>('horizontal');
    const [isViewingHistory, setIsViewingHistory] = useState(false);
    const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isCollectionDirty, setIsCollectionDirty] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showRunner, setShowRunner] = useState(false);

    // Environments hooks
    const { activeEnvironment } = useEnvironments({
        documentationId: id as string,
        enabled: !!id
    });

    const { activeEnvironment: activeGlobalEnvironment } = useGlobalEnvironments({
        enabled: !!id
    });

    // Combined variables (collection overrides global)
    const resolvedVariables = useMemo<Record<string, string>>(() => {
        const globalVars = activeGlobalEnvironment?.variables || {};
        const collectionVars = activeEnvironment?.variables || variables; // fallback to local state if no active env
        return { ...globalVars, ...collectionVars };
    }, [activeGlobalEnvironment, activeEnvironment, variables]);

    // Combined secrets list
    const activeSecrets = useMemo<string[]>(() => {
        const globalSecrets = activeGlobalEnvironment?.secrets || [];
        const collectionSecrets = activeEnvironment?.secrets || [];
        return Array.from(new Set([...globalSecrets, ...collectionSecrets]));
    }, [activeGlobalEnvironment, activeEnvironment]);

    // Helper functions
    const resolveAll = (text: string, ep?: any, maskSecrets = false) => {
        let result = text || '';
        Object.entries(resolvedVariables).forEach(([key, value]) => {
            const isSecret = activeSecrets.includes(key);
            const replacementValue = (maskSecrets && isSecret) ? '••••••••' : String(value);
            result = result.replace(new RegExp(`{{${key.replace(/[{}]/g, '')}}}`, 'g'), replacementValue);
        });
        if (ep?.params) {
            ep.params.forEach((p: any) => {
                if (p.type === 'path' && p.key) {
                    result = result.replace(new RegExp(`:${p.key}`, 'g'), p.value || `:${p.key}`);
                }
            });
        }
        return result;
    };

    const resolveUrl = (ep: any, maskSecrets = false) => {
        let finalUrl = resolveAll(ep.url, ep, maskSecrets);
        const queryParams = (ep.params || []).filter((p: any) => p.type === 'query' && p.key);
        if (queryParams.length > 0) {
            try {
                const [baseUrl, existingQuery = ''] = finalUrl.split('?');
                const searchParams = new URLSearchParams(existingQuery);
                queryParams.forEach((p: any) => searchParams.set(p.key, resolveAll(p.value, ep, maskSecrets)));
                const newQuery = searchParams.toString();
                finalUrl = newQuery ? `${baseUrl}?${newQuery}` : baseUrl;
            } catch (e) { }
        }
        return finalUrl;
    };

    const previewContent = useMemo(() => {
        if (!doc) return '';
        let md = `# ${doc.title}\n\n`;
        endpoints.forEach(ep => {
            const resolvedUrl = resolveUrl(ep, true); // Mask secrets in preview
            md += `## ${ep.name}\n\n**Method:** \`${ep.method}\`  \n**URL:** \`${resolvedUrl}\`\n\n`;
            if (ep.description) md += `### Description\n> ${ep.description.split('\n').join('\n> ')}\n\n`;
            if (ep.headers?.length > 0) {
                md += `### Headers\n| Key | Value |\n|---|---|\n`;
                ep.headers.forEach((h: any) => md += `| ${h.key} | ${resolveAll(h.value, ep, true)} |\n`);
            }
            if (ep.body?.raw) md += `### Request Body\n\`\`\`json\n${resolveAll(ep.body.raw, ep, true)}\n\`\`\`\n\n`;
            if (ep.lastResponse) md += `### Last Response (${ep.lastResponse.status})\n\`\`\`json\n${JSON.stringify(ep.lastResponse.data, null, 2)}\n\`\`\`\n\n`;
            md += `\n---\n\n`;
        });
        return md;
    }, [doc, endpoints, resolvedVariables, activeSecrets]);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    const [urlHistory, setUrlHistory] = useState<string[]>([]);
    const [selectedText, setSelectedText] = useState('');
    const [showSaveVarModal, setShowSaveVarModal] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

    // Multi-Request Tabs State
    const [openTabs, setOpenTabs] = useState<any[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [showViewSwitcher, setShowViewSwitcher] = useState(false);

    // Folder state
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
    const [parentFolderForNew, setParentFolderForNew] = useState<FolderType | null>(null);

    // Delete confirm modal state
    const [pendingDelete, setPendingDelete] = useState<{ type: 'request' | 'folder'; idx?: number; folder?: any; name: string } | null>(null);

    // Resizable hooks
    const { width: sidebarWidth, isResizing: isSidebarResizing, startResizing: startSidebarResize } = useSidebarResize();
    const { ratio: mainSplitRatio, isResizing: isResizingMain, startResizing: startMainResize } = useHorizontalPanelResize(sidebarWidth, isSidebarCollapsed);
    const { ratio: verticalSplitRatio, isResizing: isResizingVertical, startResizing: startVerticalResize } = useVerticalPanelResize();

    // Folders hook
    const { folders, createFolder, updateFolder, deleteFolder, moveRequestToFolder, reorderFolders } = useFolders({
        documentationId: id as string,
        enabled: !!id
    });

    // Sync variables with active environment (historical/local state management)
    useEffect(() => {
        if (activeEnvironment) {
            setVariables(activeEnvironment.variables || {});
            setIsCollectionDirty(false);
        }
    }, [activeEnvironment]);

    // Request ordering hook
    const { handleReorder: onReorderRequests } = useRequestOrdering({
        documentationId: id as string,
        requests: endpoints,
        setRequests: setEndpoints,
        selectedIdx,
        setSelectedIdx,
        onOrderChange: () => setIsCollectionDirty(true),
    });

    // Keyboard shortcuts
    const shortcuts = useMemo(() => createCommonShortcuts({
        onSend: () => { if (currentReq && !reqLoading) handleSendRequest(); },
        onSave: () => { if (canEdit && isDirty) handleSaveSingleRequest(); },
        onNewRequest: () => { if (canEdit) handleAddRequest(); },
        onSearch: () => setShowSearchModal(true),
        onToggleTheme: () => { },
        onShowShortcuts: () => setShowShortcutsModal(true)
    }), [currentReq, reqLoading, canEdit, isDirty]);

    useKeyboardShortcuts({ shortcuts, enabled: !showSearchModal && !showShortcutsModal });

    // Load URL history
    useEffect(() => {
        const saved = localStorage.getItem('urlHistory');
        if (saved) {
            try { setUrlHistory(JSON.parse(saved)); } catch (e) { }
        }
    }, []);

    const addToUrlHistory = useCallback((url: string) => {
        if (!url || url.length < 5) return;
        setUrlHistory(prev => {
            const filtered = prev.filter(u => u !== url);
            const newHistory = [url, ...filtered].slice(0, 20);
            localStorage.setItem('urlHistory', JSON.stringify(newHistory));
            return newHistory;
        });
    }, []);

    // Initialize from doc
    useEffect(() => {
        if (doc) {
            try {
                let eps = (doc as any).requests || [];
                if (eps.length === 0 && doc.content) {
                    let content: any = {};
                    if (typeof doc.content === 'string' && doc.content.trim().startsWith('{')) {
                        content = JSON.parse(doc.content);
                    } else if (typeof doc.content === 'object') {
                        content = doc.content;
                    }
                    eps = content.endpoints || [];
                }
                setEndpoints(deduplicateEndpoints(eps).sort((a: any, b: any) => a.id.localeCompare(b.id)));

                if (!activeEnvironment) {
                    let vars = {};
                    if (doc.content) {
                        let content: any = typeof doc.content === 'string' && doc.content.trim().startsWith('{')
                            ? JSON.parse(doc.content)
                            : doc.content;
                        vars = content?.variables || {};
                    }
                    setVariables(vars);
                }

                setIsCollectionDirty(false);

                if (eps.length > 0 && !currentReq) {
                    setCurrentReq(eps[0]);
                }
            } catch (e) { console.warn("Doc content parsing skipped:", e); }
        }
    }, [doc, activeEnvironment]);

    // Update active tab when selectedIdx changes (for legacy support/initial load)
    useEffect(() => {
        const ep = endpoints[selectedIdx];
        if (ep && !openTabs.find(t => t.id === ep.id)) {
            setOpenTabs(prev => [...prev, ep]);
            setActiveTabId(ep.id);
        } else if (ep) {
            setActiveTabId(ep.id);
        }
    }, [selectedIdx, endpoints.length]);

    // Update currentReq based on activeTabId
    useEffect(() => {
        const tab = openTabs.find(t => t.id === activeTabId);
        if (tab) {
            setCurrentReq({ ...tab });
            setResponse(tab.lastResponse || null);
            setIsDirty(false);

            // Sync selectedIdx for sidebar highlighting
            const idx = endpoints.findIndex(e => e.id === activeTabId);
            if (idx !== -1 && idx !== selectedIdx) {
                setSelectedIdx(idx);
            }
        } else if (openTabs.length === 0) {
            setCurrentReq(null);
            setResponse(null);
        }
    }, [activeTabId, openTabs]);

    // Close menus on click
    useEffect(() => {
        const handleClick = () => {
            setOpenMenuIdx(null);
            setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
        };
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // URL param parsing
    const parseUrlParams = (url: string) => {
        const params: { key: string; value: string; type: 'path' | 'query' }[] = [];
        const pathVars = url.match(/:[a-zA-Z0-9_]+/g);
        if (pathVars) pathVars.forEach(v => params.push({ key: v.slice(1), value: '', type: 'path' }));
        if (url.includes('?')) {
            const queryPart = url.split('?')[1];
            new URLSearchParams(queryPart).forEach((value, key) => params.push({ key, value, type: 'query' }));
        }
        return params;
    };

    // Auto-sync params
    useEffect(() => {
        if (!currentReq) return;
        const detected = parseUrlParams(currentReq.url);
        const existing = currentReq.params || [];
        const pathParams = detected.filter(p => p.type === 'path').map(p => {
            const match = existing.find((e: any) => e.key === p.key && e.type === 'path');
            return match ? { ...p, value: match.value } : p;
        });
        const queryFromUrl = detected.filter(p => p.type === 'query');
        const queryParams = queryFromUrl.map(p => {
            const match = existing.find((e: any) => e.key === p.key && e.type === 'query');
            return match ? { ...match, value: p.value || match.value } : p;
        });
        const manualQuery = existing.filter((e: any) => e.type === 'query' && !queryFromUrl.some(q => q.key === e.key));
        const cleanedParams = [...pathParams, ...queryParams, ...manualQuery];
        if (JSON.stringify(cleanedParams) !== JSON.stringify(existing)) {
            setCurrentReq((prev: any) => ({ ...prev, params: cleanedParams }));
        }
    }, [currentReq?.url]);

    const handleTabClose = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const tabIndex = openTabs.findIndex(t => t.id === id);
        const newTabs = openTabs.filter(t => t.id !== id);
        setOpenTabs(newTabs);

        if (activeTabId === id) {
            if (newTabs.length > 0) {
                const nextTab = newTabs[Math.max(0, tabIndex - 1)];
                setActiveTabId(nextTab.id);
            } else {
                setActiveTabId(null);
            }
        }
    };

    // Handlers
    const handleAddRequest = async (initialData?: any) => {
        try {
            const name = initialData?.name || 'New Request';
            const res = await createRequestMutation.mutateAsync({ id: id as string, name });
            let newReq = res.data;

            if (initialData) {
                const updatePayload = {
                    method: initialData.method || 'GET',
                    url: initialData.url || '',
                    headers: initialData.headers || [],
                    body: initialData.body || { mode: 'raw', raw: '' },
                    name: name
                };

                const updateRes = await updateRequestMutation.mutateAsync({
                    requestId: newReq.id,
                    content: updatePayload
                });
                newReq = { ...newReq, ...updateRes.data };
            }

            const newEps = deduplicateEndpoints([...endpoints, newReq]);
            setEndpoints(newEps);
            setSelectedIdx(newEps.length - 1);
            toast.success('New request added');
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e: any) {
            toast.error(e.message || 'Failed to add request');
        }
    };

    const handleSaveSingleRequest = async () => {
        if (!currentReq?.id) {
            toast.error('Cannot save: Request not yet created on server');
            return;
        }
        try {
            toast.loading('Saving request...', { id: 'save-req' });
            const res = await updateRequestMutation.mutateAsync({
                requestId: currentReq.id,
                content: {
                    name: currentReq.name,
                    method: currentReq.method,
                    url: currentReq.url,
                    description: currentReq.description || '',
                    body: currentReq.body,
                    headers: currentReq.headers,
                    params: currentReq.params,
                    lastResponse: currentReq.lastResponse,
                    history: currentReq.history || []
                }
            });
            toast.success(res.message || 'Request saved!', { id: 'save-req' });
            setIsDirty(false);
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e: any) {
            toast.error(e.message || 'Failed to save request', { id: 'save-req' });
        }
    };

    const handleSaveCollection = async () => {
        const content = typeof doc?.content === 'string' ? JSON.parse(doc.content) : (doc?.content || {});
        const updatedContent = {
            ...content,
            variables,
            endpoints
        };

        try {
            toast.loading('Saving collection...', { id: 'save-coll' });
            await updateMutation.mutateAsync({
                id: id as string,
                content: updatedContent
            });
            toast.success('Collection saved!', { id: 'save-coll' });
            setIsCollectionDirty(false);
            await queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e: any) {
            toast.error(e.message || 'Failed to save collection', { id: 'save-coll' });
        }
    };

    const handleShare = async () => {
        if (!doc) return;
        try {
            const res = await togglePublicMutation.mutateAsync({ id: id as string, isPublic: !doc.isPublic });
            toast.success(res.message || (!doc.isPublic ? 'Collection is now Public' : 'Collection is now Private'));
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
                body: currentReq.body?.text_array,
                response: response?.data?.translate,
                userCommand: aiCommand
            });
            const data = res.data;
            const updatedReq = { ...currentReq, name: data.name || currentReq.name, description: data.description };
            setCurrentReq(updatedReq);
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
            handleRequestChange({ body: { ...currentReq.body, raw: formatted } });
            toast.success('JSON Formatted');
        } catch (e) {
            toast.error('Invalid JSON');
        }
    };

    const handleRequestChange = (updates: Partial<any>) => {
        const updatedReq = { ...currentReq, ...updates };
        setCurrentReq(updatedReq);
        const newEps = [...endpoints];
        newEps[selectedIdx] = updatedReq;
        setEndpoints(newEps);
        setIsDirty(true);
        setIsCollectionDirty(true);
    };

    const handleSendRequest = async () => {
        setReqLoading(true);
        setResponse(null);
        try {
            const processContent = (text: string) => resolveAll(text, currentReq);
            let finalUrl = processContent(currentReq.url);
            const queryParams = (currentReq.params || []).filter((p: any) => p.type === 'query' && p.key);
            if (queryParams.length > 0) {
                const [baseUrl, existingQuery = ''] = finalUrl.split('?');
                const searchParams = new URLSearchParams(existingQuery);
                queryParams.forEach((p: any) => searchParams.set(p.key, processContent(p.value)));
                finalUrl = searchParams.toString() ? `${baseUrl}?${searchParams}` : baseUrl;
            }

            const headers = (currentReq.headers || []).reduce((acc: any, h: any) => {
                if (h.key) acc[h.key] = processContent(h.value);
                return acc;
            }, {});

            const rawBody = currentReq.body?.raw || '';
            const finalBody = rawBody ? processContent(rawBody) : undefined;
            if (finalBody && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

            const startTime = Date.now();
            const res = await fetch(finalUrl, {
                method: currentReq.method,
                headers,
                body: ['GET', 'HEAD'].includes(currentReq.method) ? undefined : finalBody
            });

            const textData = await res.text();
            let responseData;
            try { responseData = JSON.parse(textData); } catch { responseData = textData; }

            const responseObj = {
                status: res.status,
                statusText: res.statusText,
                time: Date.now() - startTime,
                data: responseData,
                timestamp: new Date().toISOString()
            };

            setResponse(responseObj);
            addToUrlHistory(finalUrl);

            const historyItem = { ...currentReq, lastResponse: responseObj, timestamp: responseObj.timestamp };
            const updatedHistory = [historyItem, ...(currentReq.history || [])].slice(0, 10);
            const updatedReq = { ...currentReq, lastResponse: responseObj, history: updatedHistory };
            setCurrentReq(updatedReq);
            const newEps = [...endpoints];
            newEps[selectedIdx] = updatedReq;
            setEndpoints(newEps);
            setIsViewingHistory(false);
        } catch (e: any) {
            setResponse({ error: true, message: e.message });
        } finally {
            setReqLoading(false);
        }
    };

    const getMarkdownForEndpoint = (ep: any) => {
        const resolvedUrl = resolveUrl(ep);
        let md = `## ${ep.name}\n\n**Method:** \`${ep.method}\`  \n**URL:** \`${resolvedUrl}\`\n\n`;
        if (ep.description) md += `### Description\n> ${ep.description.split('\n').join('\n> ')}\n\n`;
        if (ep.headers?.length > 0) {
            md += `### Headers\n| Key | Value |\n|---|---|\n`;
            ep.headers.forEach((h: any) => md += `| ${h.key} | ${resolveAll(h.value, ep)} |\n`);
        }
        if (ep.body?.raw) md += `### Request Body\n\`\`\`json\n${resolveAll(ep.body.raw, ep)}\n\`\`\`\n\n`;
        if (ep.lastResponse) md += `### Last Response (${ep.lastResponse.status})\n\`\`\`json\n${JSON.stringify(ep.lastResponse.data, null, 2)}\n\`\`\`\n\n`;
        return md + `\n---\n\n`;
    };

    const handleCopyMarkdown = (ep: any) => {
        navigator.clipboard.writeText(getMarkdownForEndpoint(ep));
        toast.success('Markdown copied');
    };

    const handleCopyRequest = () => {
        if (currentReq?.body?.raw) {
            navigator.clipboard.writeText(currentReq.body.raw);
            toast.success('Request Body copied');
        }
    };

    const handleGenerateMarkdown = (download = true) => {
        if (!doc) return;
        let md = `# ${doc.title}\n\n`;
        endpoints.forEach(ep => md += getMarkdownForEndpoint(ep));
        if (download) {
            const blob = new Blob([previewContent], { type: 'text/markdown' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${doc.title.replace(/\s+/g, '_')}_docs.md`;
            a.click();
            toast.success('Markdown generated!');
        } else {
            setShowPreview(true);
        }
    };

    const handleDownloadIndividualMarkdown = (ep: any) => {
        const md = getMarkdownForEndpoint(ep);
        const blob = new Blob([md], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${ep.name || 'request'}_${ep.method}.md`;
        a.click();
        toast.success('Markdown downloaded!');
    };

    const handleCopyAsCurl = (ep: any = currentReq) => {
        if (!ep) return;
        let curl = `curl --location '${resolveUrl(ep, true)}' \\\n--request ${ep.method}`;
        (ep.headers || []).forEach((h: any) => {
            if (h.key) curl += ` \\\n--header '${h.key}: ${resolveAll(h.value, ep, true)}'`;
        });
        if (ep.body?.raw && !['GET', 'HEAD'].includes(ep.method)) {
            curl += ` \\\n--data '${resolveAll(ep.body.raw, ep, true)}'`;
        }
        navigator.clipboard.writeText(curl);
        toast.success('cURL copied (secrets masked)');
    };

    const handleCopyAsFetch = (ep: any = currentReq) => {
        if (!ep) return;
        const headers: Record<string, string> = {};
        (ep.headers || []).forEach((h: any) => { if (h.key) headers[h.key] = resolveAll(h.value, ep, true); });
        const options: any = { method: ep.method, headers };
        if (ep.body?.raw && !['GET', 'HEAD'].includes(ep.method)) options.body = resolveAll(ep.body.raw, ep, true);
        navigator.clipboard.writeText(`fetch("${resolveUrl(ep, true)}", ${JSON.stringify(options, null, 2)});`);
        toast.success('Fetch code copied (secrets masked)');
    };

    const deleteRequest = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const requestToDelete = endpoints[idx];
        setPendingDelete({ type: 'request', idx, name: requestToDelete?.name || 'Untitled Request' });
        setOpenMenuIdx(null);
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        if (pendingDelete.type === 'request' && pendingDelete.idx !== undefined) {
            const idx = pendingDelete.idx;
            const requestToDelete = endpoints[idx];
            try {
                if (requestToDelete?.id) {
                    toast.loading('Deleting...', { id: 'delete-loading' });
                    await deleteRequestMutation.mutateAsync(requestToDelete.id);
                    toast.success('Request deleted!', { id: 'delete-loading' });
                }
                const newEps = endpoints.filter((_, i) => i !== idx);
                setEndpoints(newEps);
                if (selectedIdx === idx) {
                    if (newEps.length > 0) setSelectedIdx(Math.max(0, idx - 1));
                    else setCurrentReq(null);
                } else if (idx < selectedIdx) setSelectedIdx(selectedIdx - 1);
                queryClient.invalidateQueries({ queryKey: ['doc', id] });
            } catch (err: any) {
                toast.error(err.message || 'Failed to delete request', { id: 'delete-loading' });
            }
        } else if (pendingDelete.type === 'folder' && pendingDelete.folder) {
            await deleteFolder(pendingDelete.folder.id, true);
        }
        setPendingDelete(null);
    };

    const duplicateRequest = async (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            toast.loading('Duplicating...', { id: 'dup-loading' });
            const reqToDup = endpoints[idx];
            const res = await createRequestMutation.mutateAsync({ id: id as string, name: `${reqToDup.name} (Copy)` });
            const newReqId = res.data.id;
            const finalReq = { ...JSON.parse(JSON.stringify(reqToDup)), id: newReqId, name: `${reqToDup.name} (Copy)` };
            await updateRequestMutation.mutateAsync({ requestId: newReqId, content: finalReq });
            const newEps = [...endpoints];
            newEps.splice(idx + 1, 0, finalReq);
            setEndpoints(deduplicateEndpoints(newEps));
            setSelectedIdx(idx + 1);
            setOpenMenuIdx(null);
            toast.success('Request duplicated!', { id: 'dup-loading' });
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e: any) {
            toast.error(e.message || 'Failed to duplicate request', { id: 'dup-loading' });
        }
    };

    const handleDownloadPdf = async () => {
        if (typeof window === 'undefined') return;
        toast.loading('Preparing PDF...', { id: 'pdf-loading' });

        const resolveUrlForPdf = (url: string, ep: any) => {
            let resolved = url;
            Object.keys(resolvedVariables).forEach(key => {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                resolved = resolved.replace(regex, resolvedVariables[key] || `[${key}]`);
            });
            resolved = resolved.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, param) => `[${param}]`);
            return resolved;
        };

        const docTitle = doc?.title || 'API Documentation';
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
                        <span style="background: ${m.bg}; color: ${m.color}; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${ep.method}</span>
                        <h2 style="margin: 0; font-size: 18px; color: #111827;">${ep.name || 'Untitled'}</h2>
                    </div>
                    <code style="display: block; background: #f3f4f6; padding: 10px; border-radius: 6px; font-size: 12px; color: #374151; margin: 8px 0; white-space: pre-wrap; word-break: break-all;">${resolvedUrl}</code>
                    ${ep.description ? `<p style="margin: 10px 0; color: #4b5563; font-size: 13px;">${ep.description}</p>` : ''}
            `;

            if (ep.headers && ep.headers.length > 0 && ep.headers.some((h: any) => h.key)) {
                content += `<h3 style="font-size: 13px; color: #111827; margin: 14px 0 6px;">Headers</h3>`;
                content += `<table style="width: 100%; border-collapse: collapse; font-size: 12px;"><thead><tr style="background: #f9fafb;"><th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Key</th><th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Value</th></tr></thead><tbody>`;
                ep.headers.filter((h: any) => h.key).forEach((h: any) => {
                    let headerValue = h.value || '';
                    Object.keys(resolvedVariables).forEach(key => {
                        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                        headerValue = headerValue.replace(regex, resolvedVariables[key] || `[${key}]`);
                    });
                    content += `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${h.key}</td><td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${headerValue}</td></tr>`;
                });
                content += `</tbody></table>`;
            }

            if (ep.body?.raw) {
                content += `<h3 style="font-size: 13px; color: #111827; margin: 14px 0 6px;">Request Body</h3>`;
                let bodyContent = ep.body.raw;
                Object.keys(resolvedVariables).forEach(key => {
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                    bodyContent = bodyContent.replace(regex, resolvedVariables[key] || `[${key}]`);
                });
                content += `<pre style="background: #1f2937; color: #e5e7eb; padding: 12px; border-radius: 6px; font-size: 11px;">${bodyContent}</pre>`;
            }

            if (ep.lastResponse) {
                const statusColor = ep.lastResponse.status >= 200 && ep.lastResponse.status < 300 ? '#16a34a' : '#dc2626';
                content += `<h3 style="font-size: 13px; color: #111827; margin: 14px 0 6px;">Response <span style="color: ${statusColor};">${ep.lastResponse.status}</span></h3>`;
                content += `<pre style="background: #1f2937; color: #e5e7eb; padding: 12px; border-radius: 6px; font-size: 11px;">${JSON.stringify(ep.lastResponse.data, null, 2)}</pre>`;
            }
            content += `</div>`;
            if (idx < endpoints.length - 1) content += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">`;
        });

        const printHtml = `<!DOCTYPE html><html><head><title>${docTitle}</title><style>@page { margin: 1.5cm; } body { font-family: sans-serif; }</style></head><body><h1>${docTitle}</h1><hr>${content}</body></html>`;
        let iframe = document.getElementById('pdf-print-iframe') as HTMLIFrameElement;
        if (iframe) document.body.removeChild(iframe);
        iframe = document.createElement('iframe');
        iframe.id = 'pdf-print-iframe';
        iframe.style.position = 'fixed'; iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
            iframeDoc.open(); iframeDoc.write(printHtml); iframeDoc.close();
            setTimeout(() => {
                iframe.contentWindow?.print();
                toast.success('Print dialog opened!', { id: 'pdf-loading' });
                setTimeout(() => iframe.remove(), 1000);
            }, 300);
        } else {
            toast.error('Failed to generate PDF', { id: 'pdf-loading' });
        }
    };

    const handleSelection = useCallback(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (text && text.length > 0) {
            setSelectedText(text);
        } else {
            setSelectedText('');
        }
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (text && text.length > 0) {
            e.preventDefault();
            setSelectedText(text);
            setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
        } else {
            setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
        }
    }, []);

    const handleDragStart = (idx: number) => setDraggedIdx(idx);
    const handleDragEnd = () => setDraggedIdx(null);
    const handleDragOver = (e: React.DragEvent, idx: number) => e.preventDefault();

    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>Loading Client...</div>;
    if (error || !doc) return <div className={`h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-red-500' : 'bg-gray-50 text-red-600'}`}>Failed to load</div>;

    return (
        <div className={`flex h-[calc(100vh-64px)] overflow-hidden font-sans text-xs relative ${theme === 'dark' ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
            <Sidebar
                doc={doc}
                endpoints={endpoints}
                folders={folders}
                selectedIdx={selectedIdx}
                isCollapsed={isSidebarCollapsed}
                width={sidebarWidth}
                isDirty={isCollectionDirty}
                canEdit={canEdit}
                openMenuIdx={openMenuIdx}
                draggedIdx={draggedIdx}
                onSelectEndpoint={(idx) => {
                    setSelectedIdx(idx);
                    setActiveView('client');
                }}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onAddRequest={handleAddRequest}
                onSaveCollection={handleSaveCollection}
                onShare={handleShare}
                onDownloadMarkdown={() => handleGenerateMarkdown(false)}
                onOpenEnvModal={() => setShowEnv(true)}
                onCopyMarkdown={handleCopyMarkdown}
                onCopyAsCurl={handleCopyAsCurl}
                onCopyAsFetch={handleCopyAsFetch}
                onCopyUrl={(ep) => { navigator.clipboard.writeText(resolveUrl(ep)); toast.success('URL copied'); }}
                onDuplicate={duplicateRequest}
                onDelete={deleteRequest}
                onMenuToggle={setOpenMenuIdx}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onReorderRequests={onReorderRequests}
                onAddFolder={() => { setEditingFolder(null); setParentFolderForNew(null); setShowFolderModal(true); }}
                onEditFolder={(folder) => { setEditingFolder(folder); setParentFolderForNew(null); setShowFolderModal(true); }}
                onDeleteFolder={(folder) => { setPendingDelete({ type: 'folder', folder, name: folder.name }); }}
                onAddSubfolder={(parentId) => { setEditingFolder(null); setParentFolderForNew(folders.find(f => f.id === parentId) || null); setShowFolderModal(true); }}
                onMoveRequestToFolder={async (requestIdx, folderId) => {
                    const request = endpoints[requestIdx];
                    if (request?.id) { await moveRequestToFolder(request.id, folderId); queryClient.invalidateQueries({ queryKey: ['doc', id] }); }
                }}
                onReorderFolders={async (draggedId, targetId) => {
                    const draggedFolder = folders.find(f => f.id === draggedId);
                    const targetFolder = folders.find(f => f.id === targetId);
                    if (!draggedFolder || !targetFolder) return;
                    if (draggedFolder.parentId === targetFolder.parentId) {
                        const updates = [{ id: draggedFolder.id, order: targetFolder.order }, { id: targetFolder.id, order: draggedFolder.order }];
                        await reorderFolders(updates);
                    } else {
                        await updateFolder(draggedFolder.id, { parentId: targetFolder.id });
                    }
                    queryClient.invalidateQueries({ queryKey: ['doc', id] });
                }}
                onSlugUpdate={async (slug) => {
                    try {
                        toast.loading('Updating slug...', { id: 'slug-update' });
                        await api.documentation.updateSlug(id as string, slug);
                        toast.success('Slug updated successfully!', { id: 'slug-update' });
                        queryClient.invalidateQueries({ queryKey: ['doc', id] });
                    } catch (e: any) {
                        toast.error(e.message || 'Failed to update slug', { id: 'slug-update' });
                    }
                }}
                onRunCollection={() => setShowRunner(true)}
            />

            <EnvModal
                isOpen={showEnv}
                onClose={() => setShowEnv(false)}
                documentationId={id as string}
                variables={variables}
                setVariables={(v) => { setVariables(v); setIsCollectionDirty(true); }}
            />
            <CreateFolderModal
                isOpen={showFolderModal}
                onClose={() => { setShowFolderModal(false); setEditingFolder(null); setParentFolderForNew(null); }}
                onSubmit={async (data) => { if (editingFolder) await updateFolder(editingFolder.id, data); else await createFolder(data); }}
                parentFolder={parentFolderForNew}
                editingFolder={editingFolder}
            />

            {!isSidebarCollapsed && (
                <div
                    className={`w-1 cursor-col-resize hover:bg-indigo-400 z-30 flex-shrink-0 ${isSidebarResizing ? 'bg-indigo-600' : 'bg-transparent'}`}
                    onMouseDown={startSidebarResize}
                />
            )}

            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* View Switcher Tabs */}
                {showViewSwitcher && (
                    <div className={`flex items-center justify-between py-2 px-4 border-b ${themeClasses.borderCol} ${themeClasses.mainBg}`}>
                        <div className="flex-1 flex justify-center">
                            <div className={`flex p-1 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} shadow-inner`}>
                                {[
                                    { id: 'client', label: 'API Client', icon: <Layout size={14} /> },
                                    { id: 'docs', label: 'Documentation', icon: <FileText size={14} /> },
                                    { id: 'changelog', label: 'Changelog', icon: <Clock size={14} /> }
                                ].map((view) => (
                                    <button
                                        key={view.id}
                                        onClick={() => setActiveView(view.id as any)}
                                        className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${activeView === view.id
                                            ? (theme === 'dark' ? 'bg-gray-700 text-indigo-400 shadow-md transform scale-105' : 'bg-white text-indigo-600 shadow-sm transform scale-105')
                                            : (theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
                                            }`}
                                    >
                                        {view.icon}
                                        {view.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowViewSwitcher(false)}
                            className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 text-gray-400'} transition-colors`}
                            title="Hide switcher"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {!showViewSwitcher && activeView === 'client' && (
                    <div className={`flex items-center justify-end px-4 py-1 border-b ${themeClasses.borderCol} ${themeClasses.mainBg}`}>
                        <button
                            onClick={() => setShowViewSwitcher(true)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold ${theme === 'dark' ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} transition-colors`}
                        >
                            <Layout size={12} /> SHOW VIEWS
                        </button>
                    </div>
                )}

                {activeView === 'client' ? (
                    <>
                        <RequestTabBar
                            openTabs={openTabs}
                            activeTabId={activeTabId}
                            onTabSelect={setActiveTabId}
                            onTabClose={handleTabClose}
                            theme={theme}
                        />
                        {currentReq ? (
                            <>
                                <RequestUrlBar
                                    currentReq={currentReq}
                                    canEdit={canEdit}
                                    isDirty={isDirty}
                                    reqLoading={reqLoading}
                                    variables={variables}
                                    urlHistory={urlHistory}
                                    onMethodChange={(method) => handleRequestChange({ method })}
                                    onUrlChange={(url) => handleRequestChange({ url })}
                                    onSend={handleSendRequest}
                                    onSave={handleSaveSingleRequest}
                                    onCopyUrl={() => { navigator.clipboard.writeText(resolveUrl(currentReq)); toast.success('URL copied'); }}
                                    onCopyMarkdown={() => handleCopyMarkdown(currentReq)}
                                    onDownloadMarkdown={() => handleDownloadIndividualMarkdown(currentReq)}
                                />

                                <div className={`flex-1 overflow-hidden flex ${paneLayout === 'horizontal' ? 'flex-row' : 'flex-col'}`}>
                                    <div className="h-full overflow-hidden" style={paneLayout === 'horizontal' ? { width: `${mainSplitRatio}%` } : { height: `${verticalSplitRatio}%` }}>
                                        <RequestTabs
                                            currentReq={currentReq}
                                            variables={variables}
                                            activeTab={activeTab}
                                            canEdit={canEdit}
                                            aiCommand={aiCommand}
                                            aiLoading={aiMutation.isPending}
                                            onTabChange={setActiveTab}
                                            onRequestChange={handleRequestChange}
                                            onAiCommandChange={setAiCommand}
                                            onAiGenerate={handleAiGenerate}
                                            onFormatJson={handleFormatJson}
                                            onCopyBody={handleCopyRequest}
                                            onCopyMarkdown={() => handleCopyMarkdown(currentReq)}
                                            onSelection={handleSelection}
                                            onContextMenu={handleContextMenu}
                                        />
                                    </div>

                                    {paneLayout === 'horizontal' ? (
                                        <div className={`w-1 cursor-col-resize hover:bg-indigo-500 z-10 flex-shrink-0 ${isResizingMain ? 'bg-indigo-600' : themeClasses.borderCol}`} onMouseDown={startMainResize} />
                                    ) : (
                                        <div className={`h-1 cursor-row-resize hover:bg-indigo-500 z-10 flex-shrink-0 ${isResizingVertical ? 'bg-indigo-600' : themeClasses.borderCol}`} onMouseDown={startVerticalResize} />
                                    )}

                                    <div className="h-full overflow-hidden" style={paneLayout === 'horizontal' ? { width: `${100 - mainSplitRatio}%` } : { height: `${100 - verticalSplitRatio}%` }}>
                                        <ResponsePanel
                                            response={response}
                                            currentReq={currentReq}
                                            reqLoading={reqLoading}
                                            paneLayout={paneLayout}
                                            endpoints={endpoints}
                                            selectedIdx={selectedIdx}
                                            onLayoutChange={setPaneLayout}
                                            onLoadHistory={(item) => { setCurrentReq({ ...item }); setResponse(item.lastResponse); setIsViewingHistory(true); }}
                                            onBackToLatest={() => { const latest = endpoints[selectedIdx]; setCurrentReq({ ...latest }); setResponse(latest.lastResponse || null); setIsViewingHistory(false); }}
                                            isViewingHistory={isViewingHistory}
                                            onSelection={handleSelection}
                                            onContextMenu={handleContextMenu}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <Layout size={48} className="mb-4 opacity-50" />
                                <p>Select a request from the sidebar</p>
                            </div>
                        )
                        }
                    </>
                ) : activeView === 'docs' ? (
                    <DocumentationView
                        doc={doc}
                        endpoints={endpoints}
                        theme={theme}
                        previewContent={previewContent}
                        onCopyMarkdown={() => { navigator.clipboard.writeText(previewContent); toast.success('Markdown copied!'); }}
                        onDownloadMarkdown={() => handleGenerateMarkdown(true)}
                        onDownloadPdf={handleDownloadPdf}
                        resolveUrl={resolveUrl}
                        resolveAll={resolveAll}
                    />
                ) : (
                    <ChangelogView
                        docId={id as string}
                        theme={theme}
                        variables={variables}
                    />
                )}
            </div>

            {
                showPreview && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={(e) => { if (e.target === e.currentTarget) setShowPreview(false); }}>
                        <div className={`${themeClasses.secondaryBg} border ${themeClasses.borderCol} rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden`}>
                            <div className={`px-6 py-4 border-b ${themeClasses.borderCol} flex justify-between items-center`}>
                                <div className="flex items-center gap-3">
                                    <FileText size={20} className="text-indigo-500" />
                                    <div><h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{doc?.title || 'Documentation'}</h3><p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} documented</p></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { navigator.clipboard.writeText(previewContent); toast.success('Markdown copied!'); }} className={`flex items-center gap-2 px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'} rounded-lg text-xs`}>
                                        <Copy size={14} /> Copy MD
                                    </button>
                                    <button onClick={() => handleGenerateMarkdown(true)} className={`flex items-center gap-2 px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'} rounded-lg text-xs`}>
                                        <Download size={14} /> Download MD
                                    </button>
                                    <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs">
                                        <Download size={14} /> Export PDF
                                    </button>
                                    <button onClick={() => setShowPreview(false)} className={`p-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} rounded-lg`}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex overflow-hidden">
                                <div className={`w-56 flex-shrink-0 border-r ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-100 bg-gray-50'} overflow-y-auto p-4`}>
                                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Contents</h4>
                                    <nav className="space-y-1">
                                        {endpoints.map((ep, idx) => (
                                            <a key={idx} href={`#endpoint-${idx}`} onClick={(e) => { e.preventDefault(); document.getElementById(`endpoint-${idx}`)?.scrollIntoView({ behavior: 'smooth' }); }} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${ep.method === 'GET' ? 'bg-green-600/20 text-green-500' : ep.method === 'POST' ? 'bg-blue-600/20 text-blue-500' : 'bg-gray-600/20 text-gray-500'}`}>{ep.method}</span>
                                                <span className="truncate">{ep.name || 'Untitled'}</span>
                                            </a>
                                        ))}
                                    </nav>
                                </div>

                                <div className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                                    <div className="max-w-4xl mx-auto px-8 py-10">
                                        <div className="mb-6 pb-4 border-b border-gray-700/20"><h1 className={`text-4xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{doc?.title || 'API Documentation'}</h1></div>
                                        {endpoints.map((ep, idx) => (
                                            <div key={idx} id={`endpoint-${idx}`} className="mb-6 scroll-mt-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${ep.method === 'GET' ? 'bg-green-600/20 text-green-500' : ep.method === 'POST' ? 'bg-blue-600/20 text-blue-500' : 'bg-gray-600/20 text-gray-500'}`}>{ep.method}</span>
                                                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{ep.name || 'Untitled'}</h2>
                                                </div>
                                                <div className={`px-4 py-3 rounded-lg font-mono text-sm mb-6 ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>{resolveUrl(ep)}</div>
                                                {ep.description && <p className={`mb-6 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{resolveAll(ep.description, ep)}</p>}
                                                {ep.headers && ep.headers.length > 0 && ep.headers.some((h: any) => h.key) && (
                                                    <div className="mb-6">
                                                        <h3 className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Headers</h3>
                                                        <div className={`rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
                                                            <table className="w-full text-sm">
                                                                <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}><tr><th className="px-4 py-2 text-left">Key</th><th className="px-4 py-2 text-left">Value</th></tr></thead>
                                                                <tbody>{ep.headers.filter((h: any) => h.key).map((h: any, hi: number) => (<tr key={hi} className="border-t border-gray-700"><td className="px-4 py-2">{h.key}</td><td className="px-4 py-2">{resolveAll(h.value, ep)}</td></tr>))}</tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                                {ep.body?.raw && (
                                                    <div className="mb-6">
                                                        <h3 className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Request Body</h3>
                                                        <SyntaxHighlighter language="json" style={vscDarkPlus} customStyle={{ padding: '12px', borderRadius: '8px' }}>{resolveAll(ep.body.raw, ep)}</SyntaxHighlighter>
                                                    </div>
                                                )}
                                                {idx < endpoints.length - 1 && <hr className="my-6 border-gray-700" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <SearchBar isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} endpoints={endpoints} onSelect={(idx: number) => { setSelectedIdx(idx); setShowSearchModal(false); }} />
            <KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />

            <SaveVariableModal
                isOpen={showSaveVarModal}
                onClose={() => setShowSaveVarModal(false)}
                selectedValue={selectedText}
                documentationId={id as string}
            />

            {/* Custom Context Menu */}
            {
                contextMenu.visible && (
                    <div
                        className={`fixed z-[100] ${themeClasses.secondaryBg} border ${themeClasses.borderCol} rounded shadow-lg py-1 min-w-[150px] animate-in fade-in zoom-in duration-100`}
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                setShowSaveVarModal(true);
                                setContextMenu({ ...contextMenu, visible: false });
                            }}
                            className={`w-full text-left px-3 py-2 text-[11px] ${themeClasses.textColor} hover:bg-indigo-600 hover:text-white flex items-center gap-2`}
                        >
                            <Copy size={12} /> Set as variable
                        </button>
                    </div>
                )
            }

            <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
                <button onClick={() => setShowShortcutsModal(true)} className={`p-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'} border rounded-lg shadow-lg hover:text-indigo-400 transition-all`} title="Keyboard Shortcuts (Ctrl+/)"><Keyboard size={16} /></button>
                <button onClick={() => setShowSearchModal(true)} className={`px-3 py-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} border rounded-lg shadow-lg flex items-center gap-2 text-[11px] font-medium`} title="Search Endpoints (Ctrl+K)"><Search size={14} /><span>Search</span><kbd className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded text-[9px]">Ctrl+K</kbd></button>
            </div>

            {showRunner && (
                <CollectionRunner
                    endpoints={endpoints}
                    variables={resolvedVariables}
                    onClose={() => setShowRunner(false)}
                />
            )}

            <DeleteConfirmModal
                isOpen={!!pendingDelete}
                itemName={pendingDelete?.name || ''}
                itemType={pendingDelete?.type === 'folder' ? 'folder' : 'request'}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div >
    );
}

export default function ApiClient() {
    return (
        <ProtectedRoute>
            <ApiClientContent />
        </ProtectedRoute>
    );
}
