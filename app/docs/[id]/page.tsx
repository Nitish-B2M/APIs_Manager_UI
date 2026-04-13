'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../../../utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
    Layout, FileText, Copy, X, Download, Keyboard, Search, Clock,
    Activity, Shield, Users, Trash2, ExternalLink, Plus, AlertTriangle,
    AlertCircle, Database, HelpCircle, Mail, User, Check, RotateCcw, Sparkles,
    Settings2, Terminal, Zap, Columns2, Rows2, Save, Globe, ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GlassCard, PremiumButton } from '@/components/UIComponents';
import EnvModal from '../../components/EnvModal';
import { useTheme } from '../../../context/ThemeContext';
import { useKeyboardShortcuts, createCommonShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { SearchBar } from '../../../components/SearchBar';
import { KeyboardShortcutsModal } from '../../../components/KeyboardShortcutsModal';
import { Folder as FolderType, Endpoint } from '../../../types';
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
import { detectJsonPath, toVariableName } from '../../../utils/jsonPath';
import { CollectionRunner } from './components/CollectionRunner';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SnapshotModal } from './components/SnapshotModal';
import { MonitorDashboard } from './components/MonitorDashboard';
import { WebhooksTab } from './components/WebhooksTab';
import { CollaboratorModal } from './components/CollaboratorModal';
import { getThemeClasses } from './utils/theme';
import { useSidebarResize, useHorizontalPanelResize, useVerticalPanelResize } from './hooks/useResizable';
import dynamic from 'next/dynamic';
import { ProtectedRoute } from '../../../components/AuthGuard';
import { useWebSocket } from './hooks/useWebSocket';
import { useSSE } from './hooks/useSSE';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import { OfflineBanner } from '../../../components/OfflineBanner';
import { cacheCollection, getCachedCollection } from '../../../utils/offlineCache';

const deduplicateEndpoints = (eps: any[]) => {
    const seen = new Set();
    return eps.filter(ep => {
        if (!ep.id) return true;
        if (seen.has(ep.id)) return false;
        seen.add(ep.id);
        return true;
    });
};

const EMPTY_ARRAY: any[] = [];

/** Toolbar icon button — 32×32, Surface 2 on hover, tooltip */
function ToolbarBtn({ icon, tooltip, onClick, active }: { icon: React.ReactNode; tooltip: string; onClick: () => void; active?: boolean }) {
    return (
        <button
            onClick={onClick}
            title={tooltip}
            style={{
                width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none',
                color: active ? '#249d9f' : '#8B949E', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1C2128'; e.currentTarget.style.color = '#E6EDF3'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = active ? '#249d9f' : '#8B949E'; }}
        >
            {icon}
        </button>
    );
}

function ApiClientContent() {
    const { id } = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);

    // State
    const [endpoints, setEndpoints] = useState<any[]>([]);
    const [selectedIdx, setSelectedIdx] = useState<number>(0);
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [showEnv, setShowEnv] = useState(false);
    const [currentReq, setCurrentReq] = useState<any>(null);
    const [response, setResponse] = useState<any>(null);
    const [reqLoading, setReqLoading] = useState(false);
    const [lastPreScriptResult, setLastPreScriptResult] = useState<any>(null);
    const [lastPostScriptResult, setLastPostScriptResult] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'auth' | 'body' | 'tests' | 'schema' | 'docs' | 'code' | 'mocking' | 'notes' | 'scripts'>('params');
    const [activeView, setActiveView] = useState<'client' | 'docs' | 'changelog' | 'monitoring' | 'webhooks'>('client');
    const [aiCommand, setAiCommand] = useState('Generate a professional name and a simple, clear description explaining what the request does and what the response means.');
    const [aiEnabled, setAiEnabled] = useState<boolean>(true);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [paneLayout, setPaneLayout] = useState<'horizontal' | 'vertical'>('horizontal');
    const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isCollectionDirty, setIsCollectionDirty] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showRunner, setShowRunner] = useState(false);
    const [showSnapshots, setShowSnapshots] = useState(false);
    const [showCollaborators, setShowCollaborators] = useState(false);
    const [showAiBuilder, setShowAiBuilder] = useState(false);
    const [aiBuilderPrompt, setAiBuilderPrompt] = useState('');
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
    const [parentFolderForNew, setParentFolderForNew] = useState<FolderType | null>(null);
    const [pendingDelete, setPendingDelete] = useState<{ type: 'request' | 'folder'; idx?: number; folder?: any; name: string } | null>(null);
    const [openTabs, setOpenTabs] = useState<any[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const [showSaveVarModal, setShowSaveVarModal] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean; source: 'request-body' | 'response-body' | 'other' }>({ x: 0, y: 0, visible: false, source: 'other' });
    const [saveVarSuggestedName, setSaveVarSuggestedName] = useState<string>('');
    const [saveVarExtractMode, setSaveVarExtractMode] = useState(false);
    const [isViewingHistory, setIsViewingHistory] = useState(false);
    const latestResponseRef = useRef<any>(null);
    const [urlHistory, setUrlHistory] = useState<string[]>([]);

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

    const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || undefined) : undefined;
    const { isOnline, queueLength, isSyncing, queueMutation } = useOfflineSync(id as string, token);

    const updateMutation = useMutation({
        mutationFn: (data: { id: string, content: any }) => api.documentation.update(data.id, data.content)
    });
    const togglePublicMutation = useMutation({
        mutationFn: (data: { id: string, isPublic: boolean }) => api.documentation.togglePublic(data.id, data.isPublic)
    });
    const aiMutation = useMutation({
        mutationFn: (data: any) => api.ai.generateDocs(data)
    });
    const aiGenerateTestsMutation = useMutation({
        mutationFn: (data: { method: string; url: string; response: any }) => api.ai.generateTests(data)
    });
    const aiGenerateRequestMutation = useMutation({
        mutationFn: (prompt: string) => api.ai.generateRequest(prompt)
    });
    const aiExplainErrorMutation = useMutation({
        mutationFn: (data: { method: string; url: string; error: any }) => api.ai.explainError(data)
    });
    const aiGenerateReadmeMutation = useMutation({
        mutationFn: (data: { title: string; endpoints: any[] }) => api.ai.generateReadme(data)
    });
    const updateRequestMutation = useMutation({
        mutationFn: (data: { requestId: string, content: any }) => api.documentation.updateRequest(data.requestId, data.content)
    });
    const updateSlugMutation = useMutation({
        mutationFn: (data: { id: string, slug: string }) => api.documentation.updateSlug(data.id, data.slug)
    });
    const createRequestMutation = useMutation({
        mutationFn: (data: { id: string, name?: string }) => api.documentation.createRequest(data.id, data)
    });
    const deleteRequestMutation = useMutation({
        mutationFn: (requestId: string) => api.documentation.deleteRequest(requestId)
    });
    const bulkDeleteMutation = useMutation({
        mutationFn: (requestIds: string[]) => api.documentation.bulkDeleteRequests(requestIds)
    });
    const bulkMoveMutation = useMutation({
        mutationFn: (data: { requestIds: string[], folderId: string | null }) => api.documentation.bulkMoveRequests(data.requestIds, data.folderId)
    });

    const userRole = doc?.role || (me && doc && me.id === (doc as any).userId ? 'OWNER' : 'VIEWER');
    const canEdit = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'EDITOR';
    const canAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
    const shouldCopySingleLine = me?.settings?.copySingleLine === true;

    const { activeEnvironment } = useEnvironments({ documentationId: id as string, enabled: !!id });
    const { activeEnvironment: activeGlobalEnvironment } = useGlobalEnvironments({ enabled: !!id });

    const resolvedVariables = useMemo(() => ({ ...activeGlobalEnvironment?.variables, ...activeEnvironment?.variables, ...variables }), [activeGlobalEnvironment, activeEnvironment, variables]);
    const activeSecrets = useMemo(() => Array.from(new Set([...(activeGlobalEnvironment?.secrets || []), ...(activeEnvironment?.secrets || [])])), [activeGlobalEnvironment, activeEnvironment]);

    const resolveAll = useCallback((text: string, ep?: any, maskSecrets = false) => {
        let result = text || '';
        const dynamicVars: Record<string, () => string> = {
            '$timestamp': () => String(Math.floor(Date.now() / 1000)),
            '$isoTimestamp': () => new Date().toISOString(),
            '$randomUUID': () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? (Math.random() * 16 | 0) : (Math.random() * 16 | 0 & 0x3 | 0x8)).toString(16)),
        };
        Object.entries(dynamicVars).forEach(([key, gen]) => result = result.replace(new RegExp(`{{\\${key}}}`, 'g'), gen()));
        Object.entries(resolvedVariables).forEach(([key, value]) => {
            const isSecret = activeSecrets.includes(key);
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), (maskSecrets && isSecret) ? '••••••••' : String(value));
        });
        if (ep?.params) ep.params.forEach((p: any) => { if (p.type === 'path' && p.key) result = result.replace(new RegExp(`:${p.key}`, 'g'), p.value || `:${p.key}`); });
        return result;
    }, [resolvedVariables, activeSecrets]);

    const resolveUrl = useCallback((ep: any, maskSecrets = false) => {
        let finalUrl = resolveAll(ep.url, ep, maskSecrets);
        const queryParams = (ep.params || []).filter((p: any) => p.type === 'query' && p.key);
        if (queryParams.length > 0) {
            const searchParams = new URLSearchParams();
            queryParams.forEach((p: any) => searchParams.set(p.key, resolveAll(p.value, ep, maskSecrets)));
            finalUrl = finalUrl.includes('?') ? `${finalUrl}&${searchParams}` : `${finalUrl}?${searchParams}`;
        }
        return finalUrl;
    }, [resolveAll]);

    const { folders, createFolder, updateFolder, deleteFolder, moveRequestToFolder, reorderFolders } = useFolders({ documentationId: id as string, enabled: !!id });
    const { handleReorder: onReorderRequests } = useRequestOrdering({ documentationId: id as string, requests: endpoints, setRequests: setEndpoints, selectedIdx, setSelectedIdx, onOrderChange: () => setIsCollectionDirty(true) });

    const { width: sidebarResWidth, isResizing: isSidebarResizing, startResizing: startSidebarResize } = useSidebarResize();
    const { ratio: mainSplitRatio, isResizing: isResizingMain, startResizing: startMainResize } = useHorizontalPanelResize(sidebarResWidth, isSidebarCollapsed);
    const { ratio: verticalSplitRatio, isResizing: isResizingVertical, startResizing: startVerticalResize } = useVerticalPanelResize();

    const { messages: wsMessages, status: wsStatus, connect: wsConnect, disconnect: wsDisconnect, sendMessage: wsSendMessage, clearMessages: wsClearMessages } = useWebSocket(EMPTY_ARRAY);
    const { messages: sseMessages, status: sseStatus, connect: sseConnect, disconnect: sseDisconnect, clearMessages: sseClearMessages } = useSSE(EMPTY_ARRAY);

    // Choose which socket to use based on active request protocol
    const isSSE = currentReq?.protocol === 'SSE';
    const socketMessages = isSSE ? sseMessages : wsMessages;
    const socketStatus = isSSE ? sseStatus : wsStatus;
    const socketMode: 'ws' | 'sse' = isSSE ? 'sse' : 'ws';
    const handleSocketConnect = useCallback(() => {
        if (!currentReq) return;
        const url = resolveUrl(currentReq);
        if (isSSE) sseConnect(url); else wsConnect(url);
    }, [currentReq, isSSE, resolveUrl, sseConnect, wsConnect]);
    const handleSocketDisconnect = useCallback(() => {
        if (isSSE) sseDisconnect(); else wsDisconnect();
    }, [isSSE, sseDisconnect, wsDisconnect]);
    const handleSocketSendMessage = useCallback((data: string) => {
        if (!isSSE) wsSendMessage(data);
    }, [isSSE, wsSendMessage]);
    const handleSocketClearMessages = useCallback(() => {
        if (isSSE) sseClearMessages(); else wsClearMessages();
    }, [isSSE, sseClearMessages, wsClearMessages]);

    const handleTabClose = useCallback((tid: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const tabIndex = openTabs.findIndex(t => t.id === tid);
        const newTabs = openTabs.filter(t => t.id !== tid);
        setOpenTabs(newTabs);
        if (activeTabId === tid) {
            if (newTabs.length > 0) {
                const nextTab = newTabs[Math.max(0, tabIndex - 1)];
                setActiveTabId(nextTab.id);
                const newIdx = endpoints.findIndex(e => e.id === nextTab.id);
                if (newIdx !== -1) setSelectedIdx(newIdx);
            } else {
                setActiveTabId(null);
                setCurrentReq(null);
            }
        }
    }, [openTabs, activeTabId, endpoints]);

    const handleRequestChange = useCallback((updates: Partial<any>) => {
        if (!currentReq) return;
        const base = {
            body: currentReq.body || { mode: 'raw', raw: '' },
            headers: currentReq.headers || [],
            params: currentReq.params || [],
            assertions: currentReq.assertions || []
        };
        const updatedReq = { ...currentReq, ...base, ...updates };
        setCurrentReq(updatedReq);
        setEndpoints(prev => prev.map(e => e.id === updatedReq.id ? updatedReq : e));
        setOpenTabs(prev => prev.map(t => t.id === updatedReq.id ? updatedReq : t));
        setIsDirty(true); setIsCollectionDirty(true);
    }, [currentReq]);

    const handleSendRequest = useCallback(async () => {
        if (!currentReq) return;
        setReqLoading(true); setResponse(null);
        setLastPreScriptResult(null); setLastPostScriptResult(null);
        try {
            const url = resolveUrl(currentReq);
            const method = (currentReq.method || 'GET').toUpperCase();
            const headers = (currentReq.headers || []).reduce((acc: any, h: any) => { if (h.key) acc[h.key] = resolveAll(h.value, currentReq); return acc; }, {});
            const canHaveBody = !['GET', 'HEAD', 'OPTIONS'].includes(method);
            const rawBody = canHaveBody && currentReq.body?.raw ? resolveAll(currentReq.body.raw, currentReq) : undefined;

            // Auto-set Content-Type if body exists and user didn't specify one
            if (rawBody && !Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) {
                headers['Content-Type'] = 'application/json';
            }

            const hasScripts = !!(currentReq.pre_script?.trim() || currentReq.post_script?.trim());
            const isGraphQL = currentReq.protocol === 'GRAPHQL';
            let newResponse: any;

            if (hasScripts || isGraphQL) {
                // Route through server execute API for scripts or GraphQL
                const graphqlPayload = isGraphQL && currentReq.body?.graphql ? {
                    query: resolveAll(currentReq.body.graphql.query || '', currentReq),
                    variables: currentReq.body.graphql.variables ? resolveAll(currentReq.body.graphql.variables, currentReq) : undefined,
                    operationName: currentReq.body.graphql.operationName,
                } : undefined;

                const execRes = await api.execute.run({
                    url, method, headers,
                    body: isGraphQL ? undefined : rawBody,
                    protocol: currentReq.protocol || 'REST',
                    graphql: graphqlPayload,
                    preScript: currentReq.pre_script || undefined,
                    postScript: currentReq.post_script || undefined,
                    variables: resolvedVariables,
                    assertions: currentReq.assertions,
                });
                const execData = execRes.data;
                newResponse = {
                    status: execData.status, statusText: execData.statusText || '',
                    time: execData.time, data: execData.body, headers: execData.headers,
                    timestamp: new Date().toISOString(), size: execData.size || 0,
                };
                if (execData.preScriptResult) setLastPreScriptResult(execData.preScriptResult);
                if (execData.postScriptResult) setLastPostScriptResult(execData.postScriptResult);
            } else {
                // Direct fetch (no scripts needed)
                const start = Date.now();
                const res = await fetch(url, { method, headers, body: rawBody });
                const data = await res.json().catch(() => res.text());
                newResponse = { status: res.status, statusText: res.statusText, time: Date.now() - start, data, timestamp: new Date().toISOString(), size: 0 };
            }

            setResponse(newResponse);
            latestResponseRef.current = newResponse;
            setIsViewingHistory(false);

            // Auto-persist response to DB (fire-and-forget)
            if (currentReq.id) {
                const prevHistory = Array.isArray(currentReq.history) ? currentReq.history : [];
                const updatedHistory = [{ lastResponse: newResponse, timestamp: newResponse.timestamp }, ...prevHistory].slice(0, 50);
                const updated = { ...currentReq, lastResponse: newResponse, history: updatedHistory };
                setCurrentReq(updated);
                updateRequestMutation.mutateAsync({ requestId: currentReq.id, content: updated }).catch(() => {});
            }
        } catch (e: any) { setResponse({ error: true, message: e.message }); }
        finally { setReqLoading(false); }
    }, [currentReq, resolveUrl, resolveAll, updateRequestMutation, resolvedVariables]);

    const handleSaveSingleRequest = useCallback(async () => {
        if (!currentReq?.id) return;
        try {
            await updateRequestMutation.mutateAsync({ requestId: currentReq.id, content: currentReq });
            setIsDirty(false); queryClient.invalidateQueries({ queryKey: ['doc', id] });
            toast.success('Request saved');
        } catch (e) { toast.error('Failed to save'); }
    }, [id, currentReq, updateRequestMutation, queryClient]);

    const handleAddRequest = useCallback(async (data?: any) => {
        try {
            const res = await createRequestMutation.mutateAsync({ id: id as string, name: data?.name || 'New Request' });
            const initializedReq = { ...res.data, body: res.data.body || { mode: 'raw', raw: '' }, headers: res.data.headers || [], params: res.data.params || [], assertions: res.data.assertions || [] };
            setEndpoints(prev => [...prev, initializedReq]);
            setSelectedIdx(endpoints.length);
            setCurrentReq(initializedReq);
            setOpenTabs(prev => [...prev, initializedReq]);
            setActiveTabId(initializedReq.id);
            return initializedReq;
        } catch (e) { toast.error('Failed to add'); return null; }
    }, [id, endpoints.length, createRequestMutation]);

    const getMarkdownForEndpoint = useCallback((ep: any) => {
        const resolvedUrl = resolveUrl(ep);
        return `## ${ep.name}\n**${ep.method}** ${resolvedUrl}\n\n`;
    }, [resolveUrl]);

    const handleGenerateMarkdown = useCallback((download = true) => {
        if (!doc) return;
        let md = `# ${doc.title}\n\n`;
        endpoints.forEach(ep => md += getMarkdownForEndpoint(ep));
        if (download) {
            const blob = new Blob([md], { type: 'text/markdown' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${doc.title.replace(/\s+/g, '_')}_docs.md`;
            a.click();
            toast.success('Markdown downloaded');
        } else setActiveView('docs');
    }, [doc, endpoints, getMarkdownForEndpoint]);

    const handleCopyMarkdown = useCallback((ep: any) => {
        navigator.clipboard.writeText(getMarkdownForEndpoint(ep));
        toast.success('Copied');
    }, [getMarkdownForEndpoint]);

    const handleAiGenerate = useCallback(async () => {
        if (!currentReq) return;
        try {
            const res = await aiMutation.mutateAsync({ method: currentReq.method, url: currentReq.url, body: currentReq.body, response: response?.data, userCommand: aiCommand });
            handleRequestChange({ name: res.data.name, description: res.data.description });
            toast.success('Generated with AI');
        } catch (e) { toast.error('AI failed'); }
    }, [currentReq, response, aiCommand, aiMutation, handleRequestChange]);

    const handleAiGenerateTests = useCallback(async () => {
        if (!currentReq || !currentReq.lastResponse || !currentReq.lastResponse.data) {
            toast.error('No response data found to generate tests from');
            return;
        }
        try {
            toast.loading('AI is generating tests...', { id: 'ai-tests' });
            const result = await aiGenerateTestsMutation.mutateAsync({ method: currentReq.method, url: currentReq.url, response: currentReq.lastResponse.data });
            if (result.status && Array.isArray(result.data)) {
                handleRequestChange({ assertions: [...(currentReq.assertions || []), ...result.data] });
                toast.success(`Generated ${result.data.length} tests`, { id: 'ai-tests' });
            }
        } catch (error: any) { toast.error('Failed to generate tests', { id: 'ai-tests' }); }
    }, [currentReq, handleRequestChange, aiGenerateTestsMutation]);

    const handleAiGenerateRequest = useCallback(async (prompt: string) => {
        try {
            toast.loading('AI is building new request...', { id: 'ai-request' });
            const newReq = await handleAddRequest({ name: 'AI Generated Request' });
            if (!newReq) { toast.error('Failed to initialize', { id: 'ai-request' }); return; }
            const result = await aiGenerateRequestMutation.mutateAsync(prompt);
            if (result.status && result.data) {
                const updatedReq = { ...newReq, ...result.data };
                setCurrentReq(updatedReq);
                setEndpoints(prev => prev.map(e => e.id === updatedReq.id ? updatedReq : e));
                setOpenTabs(prev => prev.map(t => t.id === updatedReq.id ? updatedReq : t));
                await api.documentation.updateRequest(updatedReq.id, updatedReq);
                toast.success('AI Request Built!', { id: 'ai-request' });
            }
        } catch (error: any) { toast.error('Failed', { id: 'ai-request' }); }
    }, [handleAddRequest, aiGenerateRequestMutation]);

    const handleCopyAsCurl = useCallback((ep: any) => {
        if (!ep) return;
        let curl = `curl --location '${resolveUrl(ep)}' \\\n--request ${ep.method}`;
        (ep.headers || []).forEach((h: any) => {
            if (h.key) curl += ` \\\n--header '${h.key}: ${resolveAll(h.value, ep)}'`;
        });
        if (ep.body?.raw && !['GET', 'HEAD'].includes(ep.method)) {
            curl += ` \\\n--data '${resolveAll(ep.body.raw, ep)}'`;
        }
        navigator.clipboard.writeText(curl);
        toast.success('cURL copied');
    }, [resolveUrl, resolveAll]);

    const handleCopyAsFetch = useCallback((ep: any) => {
        if (!ep) return;
        const headers: Record<string, string> = {};
        (ep.headers || []).forEach((h: any) => { if (h.key) headers[h.key] = resolveAll(h.value, ep); });
        const options: any = { method: ep.method, headers };
        if (ep.body?.raw && !['GET', 'HEAD'].includes(ep.method)) options.body = resolveAll(ep.body.raw, ep);
        const code = `fetch("${resolveUrl(ep)}", ${JSON.stringify(options, null, 2)});`;
        navigator.clipboard.writeText(code);
        toast.success('Fetch code copied');
    }, [resolveUrl, resolveAll]);

    const handleAiExplainError = useCallback(async (error: any) => {
        if (!currentReq) return null;
        try {
            const result = await aiExplainErrorMutation.mutateAsync({ method: currentReq.method, url: currentReq.url, error });
            return result.status ? result.data : null;
        } catch (e: any) { return null; }
    }, [currentReq, aiExplainErrorMutation]);

    const handleGenerateAiReadme = useCallback(async () => {
        if (!doc) return;
        try {
            toast.loading('AI is generating README...', { id: 'ai-readme' });
            const result = await aiGenerateReadmeMutation.mutateAsync({ title: doc.title, endpoints });
            if (result.status && result.data) {
                const blob = new Blob([result.data], { type: 'text/markdown' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `README_AI_${doc.title}.md`; a.click();
                toast.success('AI README Generated!', { id: 'ai-readme' });
            }
        } catch (error: any) { toast.error('Failed to generate README', { id: 'ai-readme' }); }
    }, [doc, endpoints, aiGenerateReadmeMutation]);

    const handleShare = useCallback(async () => {
        if (!doc) return;
        try {
            const res = await togglePublicMutation.mutateAsync({ id: id as string, isPublic: !doc.isPublic });
            toast.success(res.message || 'Updated');
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e: any) { toast.error('Error'); }
    }, [doc, id, togglePublicMutation, queryClient]);

    const handleExportPostman = useCallback(async () => {
        if (!doc) return;
        try {
            toast.loading('Preparing Postman Collection...', { id: 'export-loading' });
            const blob = await api.documentation.exportPostman(doc.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.title.replace(/\s+/g, '_')}_collection.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Postman Collection Downloaded', { id: 'export-loading' });
        } catch (e) { toast.error('Export failed', { id: 'export-loading' }); }
    }, [doc]);

    const handleExportOpenApi = useCallback(async () => {
        if (!doc) return;
        try {
            toast.loading('Preparing OpenAPI Spec...', { id: 'export-loading' });
            const blob = await api.documentation.exportOpenApi(doc.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.title.replace(/\s+/g, '_')}_openapi.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('OpenAPI Specification Downloaded', { id: 'export-loading' });
        } catch (e) { toast.error('Export failed', { id: 'export-loading' }); }
    }, [doc]);

    const handleUpdateSlug = useCallback(async (newSlug: string) => {
        try {
            await updateSlugMutation.mutateAsync({ id: id as string, slug: newSlug });
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e: any) {
            toast.error(e.message || 'Failed to update URL');
        }
    }, [id, updateSlugMutation, queryClient]);

    const lastPresenceUpdateRef = useRef<number>(0);
    const handlePresenceUpdate = useCallback(async (metadata: any) => {
        if (!doc?.id || !isOnline || me?.settings?.enableLivePresence === false) return;

        // Performance guard: check if shared
        const isShared = doc.isPublic || (doc as any).collaborators?.length > 1;
        if (!isShared) return;

        // Throttle: max once every 1000ms
        const now = Date.now();
        if (now - lastPresenceUpdateRef.current < 1000) return;

        lastPresenceUpdateRef.current = now;
        try {
            await api.collaboration.updatePresence(doc.id, metadata);
        } catch (err) {
            // Ignore presence update errors
        }
    }, [doc, isOnline, me?.settings?.enableLivePresence]);

    const handleBulkDelete = useCallback(async (requestIds: string[]) => {
        try {
            toast.loading('Deleting multiple requests...', { id: 'bulk-delete' });
            await bulkDeleteMutation.mutateAsync(requestIds);
            setEndpoints(prev => prev.filter(e => !requestIds.includes(e.id)));
            setOpenTabs(prev => prev.filter(t => !requestIds.includes(t.id)));
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
            toast.success('Requests deleted!', { id: 'bulk-delete' });
        } catch (e: any) {
            toast.error(e.message || 'Bulk delete failed', { id: 'bulk-delete' });
        }
    }, [id, bulkDeleteMutation, queryClient]);

    const handleBulkMove = useCallback(async (requestIds: string[], folderId: string | null) => {
        try {
            toast.loading('Moving requests...', { id: 'bulk-move' });
            await bulkMoveMutation.mutateAsync({ requestIds, folderId });
            setEndpoints(prev => prev.map(e => requestIds.includes(e.id) ? { ...e, folderId } : e));
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
            toast.success('Requests moved!', { id: 'bulk-move' });
        } catch (e: any) {
            toast.error(e.message || 'Bulk move failed', { id: 'bulk-move' });
        }
    }, [id, bulkMoveMutation, queryClient]);

    const duplicateRequest = useCallback(async (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            toast.loading('Duplicating...', { id: 'dup-loading' });
            const reqToDup = endpoints[idx];
            const res = await createRequestMutation.mutateAsync({ id: id as string, name: `${reqToDup.name} (Copy)` });
            const newReqId = res.data.id;
            const finalReq = { ...JSON.parse(JSON.stringify(reqToDup)), id: newReqId, name: `${reqToDup.name} (Copy)` };
            await updateRequestMutation.mutateAsync({ requestId: newReqId, content: finalReq });
            setEndpoints(prev => {
                const newList = [...prev];
                newList.splice(idx + 1, 0, finalReq);
                return newList;
            });
            setSelectedIdx(idx + 1);
            setOpenMenuIdx(null);
            toast.success('Request duplicated!', { id: 'dup-loading' });
            queryClient.invalidateQueries({ queryKey: ['doc', id] });
        } catch (e: any) {
            toast.error('Failed to duplicate', { id: 'dup-loading' });
        }
    }, [endpoints, id, createRequestMutation, updateRequestMutation, queryClient]);

    const lastActiveTabRef = useRef<string | null>(null);
    useEffect(() => {
        if (activeTabId === lastActiveTabRef.current) return;
        const tab = openTabs.find(t => t.id === activeTabId);
        if (tab) {
            setCurrentReq({ ...tab }); setResponse(tab.lastResponse || null); setIsDirty(false); setIsViewingHistory(false); latestResponseRef.current = tab.lastResponse || null;
            lastActiveTabRef.current = activeTabId;
            const idx = endpoints.findIndex(e => e.id === activeTabId);
            if (idx !== -1 && idx !== selectedIdx) setSelectedIdx(idx);
        } else if (openTabs.length === 0) {
            setCurrentReq(null); setResponse(null); lastActiveTabRef.current = null;
        }
    }, [activeTabId, openTabs, endpoints, selectedIdx]);

    useEffect(() => {
        const ep = endpoints[selectedIdx];
        if (ep && !openTabs.find(t => t.id === ep.id)) {
            setOpenTabs(prev => [...prev, ep]); setActiveTabId(ep.id);
        } else if (ep) setActiveTabId(ep.id);
    }, [selectedIdx, endpoints]);

    const handleSelection = useCallback(() => { const s = window.getSelection()?.toString().trim(); if (s) setSelectedText(s); else setSelectedText(''); }, []);
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const s = window.getSelection()?.toString().trim();
        if (s) {
            e.preventDefault();
            setSelectedText(s);
            // Detect whether selection is in request or response body by walking up the DOM
            const target = e.target as HTMLElement | null;
            const container = target?.closest('[data-selection-source]') as HTMLElement | null;
            const source = (container?.dataset.selectionSource || 'other') as any;
            setContextMenu({ x: e.clientX, y: e.clientY, visible: true, source });
        }
        else setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    }, []);

    // Close context menu on click anywhere
    useEffect(() => {
        if (!contextMenu.visible) return;
        const handler = () => setContextMenu(p => ({ ...p, visible: false }));
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [contextMenu.visible]);

    const previewContent = useMemo(() => {
        if (!doc) return '';
        let md = `# ${doc.title}\n\n`;
        endpoints.forEach(ep => md += `## ${ep.name}\n**${ep.method}** ${resolveUrl(ep)}\n\n`);
        return md;
    }, [doc, endpoints, resolveUrl]);

    useEffect(() => {
        if (doc && endpoints.length === 0) {
            const eps = doc.requests || [];
            const deduped = deduplicateEndpoints(eps).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setEndpoints(deduped);
            if (deduped.length > 0 && !currentReq) {
                const first = deduped[0];
                setCurrentReq(first);
                setOpenTabs([first]);
                setActiveTabId(first.id);
            }
        }
    }, [doc]);

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white font-black tracking-widest animate-pulse">LOADING WORKSPACE...</div>;
    if (error || !doc) return <div className="h-screen flex items-center justify-center bg-gray-900 text-red-500">Failed to load documentation</div>;

    const navItems = [
        { id: 'client', label: 'API Client', icon: Zap, color: 'text-amber-400' },
        { id: 'docs', label: 'Documentation', icon: FileText, color: 'text-blue-400' },
        { id: 'monitoring', label: 'Monitoring', icon: Activity, color: 'text-emerald-400' },
        { id: 'webhooks', label: 'Webhooks', icon: Database, color: 'text-orange-400' },
        { id: 'changelog', label: 'Changelog', icon: Clock, color: 'text-[#2ec4c7]' },
    ];

    return (
        <div className={`flex h-[calc(100vh-64px)] overflow-hidden font-sans text-xs relative ${theme === 'dark' ? 'bg-[#0D1117] text-[#E6EDF3]' : 'bg-gray-50 text-gray-700'}`}>
            <OfflineBanner isOnline={isOnline} queueLength={queueLength} isSyncing={isSyncing} />
            <Sidebar
                doc={doc} endpoints={endpoints} folders={folders} selectedIdx={selectedIdx} isCollapsed={isSidebarCollapsed} width={sidebarWidth} isDirty={isCollectionDirty} canEdit={canEdit} canAdmin={canAdmin} openMenuIdx={openMenuIdx} draggedIdx={draggedIdx}
                onSelectEndpoint={(idx) => {
                    setSelectedIdx(idx); setActiveView('client');
                    const ep = endpoints[idx];
                    if (ep) {
                        setOpenTabs(prev => prev.find(t => t.id === ep.id) ? prev : [...prev, ep]);
                        setActiveTabId(ep.id);
                        setCurrentReq(ep);
                    }
                }}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onAddRequest={handleAddRequest} onShare={() => setShowCollaborators(true)} onDownloadMarkdown={() => handleGenerateMarkdown(false)}
                onOpenEnvModal={() => setShowEnv(true)} onCopyMarkdown={handleCopyMarkdown} onCopyAsCurl={handleCopyAsCurl} onCopyAsFetch={handleCopyAsFetch}
                onCopyUrl={(ep) => { navigator.clipboard.writeText(resolveUrl(ep)); toast.success('Copied'); }}
                onDuplicate={duplicateRequest} onDelete={(idx) => setPendingDelete({ type: 'request', idx, name: endpoints[idx].name })} onMenuToggle={setOpenMenuIdx} onDragStart={() => { }} onDragOver={(e) => e.preventDefault()} onDragEnd={() => { }}
                onReorderRequests={onReorderRequests} aiEnabled={aiEnabled} onAiToggle={setAiEnabled}
                onBulkDelete={handleBulkDelete} onBulkMove={handleBulkMove}
                onAddFolder={() => { setEditingFolder(null); setShowFolderModal(true); }}
                onEditFolder={(f) => { setEditingFolder(f); setShowFolderModal(true); }}
                onDeleteFolder={(f) => setPendingDelete({ type: 'folder', folder: f, name: f.name })}
                onMoveRequestToFolder={async (ri, fi) => {
                    const r = endpoints[ri];
                    if (!r?.id) return;
                    // Optimistic update
                    setEndpoints(prev => prev.map((ep, i) => i === ri ? { ...ep, folderId: fi } : ep));
                    try {
                        await moveRequestToFolder(r.id, fi);
                        queryClient.invalidateQueries({ queryKey: ['doc', id] });
                    } catch {
                        // Revert on failure
                        setEndpoints(prev => prev.map((ep, i) => i === ri ? { ...ep, folderId: r.folderId } : ep));
                    }
                }}
                onRunCollection={() => setShowRunner(true)} onShowSnapshots={() => setShowSnapshots(true)} activeView={activeView} onViewChange={setActiveView}
                onExportPostman={handleExportPostman} onExportOpenApi={handleExportOpenApi}
            />

            {!isSidebarCollapsed && (
                <div
                    className={`w-1 h-full cursor-col-resize hover:bg-[#249d9f]/50 transition-colors z-30 ${isSidebarResizing ? 'bg-[#249d9f]' : 'bg-transparent'}`}
                    onMouseDown={startSidebarResize}
                />
            )}

            <div className="flex-1 flex flex-col h-full min-w-0" style={{ background: 'var(--bg-primary)' }}>
                <div className={`flex items-center justify-between px-4 py-2.5 border-b ${themeClasses.borderCol} ${themeClasses.secondaryBg} z-20 shadow-sm`}>
                    <div className="flex items-center gap-1.5">
                        {/* Sidebar expand button when collapsed */}
                        {isSidebarCollapsed && (
                            <button
                                onClick={() => setIsSidebarCollapsed(false)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-[#2ec4c7] hover:bg-white/5 transition-all mr-1"
                                title="Expand sidebar"
                            >
                                <ChevronRight size={16} />
                            </button>
                        )}
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveView(item.id as any)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === item.id
                                    ? 'bg-[#1a7a7c] text-white shadow-lg shadow-indigo-900/40'
                                    : `text-gray-500 hover:text-gray-200 hover:bg-white/5`}`}
                            >
                                <item.icon size={13} className={activeView === item.id ? 'text-white' : item.color} />
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Toolbar: grouped icons with dividers */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {/* AI Copilot toggle — glow ring when enabled */}
                        <button
                            onClick={() => setAiEnabled(!aiEnabled)}
                            title="AI Copilot"
                            style={{
                                width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'transparent', border: 'none',
                                color: aiEnabled ? '#249d9f' : '#6E7681',
                                boxShadow: aiEnabled ? '0 0 0 2px rgba(36,157,159,0.3), 0 0 12px rgba(36,157,159,0.15)' : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Sparkles size={16} />
                        </button>

                        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />

                        {/* Group 1: Builder + Runner + Snapshots */}
                        <ToolbarBtn icon={<Sparkles size={15} />} tooltip="AI Builder" onClick={() => setShowAiBuilder(true)} />
                        <ToolbarBtn icon={<Zap size={15} />} tooltip="Run Collection" onClick={() => setShowRunner(true)} />
                        <ToolbarBtn icon={<Clock size={15} />} tooltip="Snapshots" onClick={() => setShowSnapshots(true)} />

                        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

                        {/* Group 2: Export + Share */}
                        <ToolbarBtn icon={<Download size={15} />} tooltip="Download Markdown" onClick={() => handleGenerateMarkdown(true)} />
                        <ToolbarBtn icon={<Download size={15} />} tooltip="Export Postman" onClick={handleExportPostman} />
                        <ToolbarBtn icon={<Download size={15} />} tooltip="Export OpenAPI" onClick={handleExportOpenApi} />
                        {userRole === 'OWNER' && (
                            <ToolbarBtn
                                icon={doc.isPublic ? <Globe size={15} /> : <Users size={15} />}
                                tooltip={doc.isPublic ? "Public Access" : "Share & Team"}
                                onClick={() => setShowCollaborators(true)}
                                active={doc.isPublic}
                            />
                        )}
                        {userRole === 'OWNER' && doc.isPublic && doc.slug && (
                            <ToolbarBtn icon={<Copy size={14} />} tooltip="Copy Public URL" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/public/${doc.slug}`); toast.success('Link copied'); }} />
                        )}

                        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

                        {/* Group 3: Layout */}
                        <ToolbarBtn
                            icon={paneLayout === 'horizontal' ? <Rows2 size={15} /> : <Columns2 size={15} />}
                            tooltip={paneLayout === 'horizontal' ? 'Vertical Layout' : 'Horizontal Layout'}
                            onClick={() => setPaneLayout(paneLayout === 'horizontal' ? 'vertical' : 'horizontal')}
                        />

                        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

                        {/* ENV pill — outlined style */}
                        <button
                            onClick={() => setShowEnv(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: '1px solid #249d9f', background: 'transparent', color: '#249d9f', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}
                        >
                            <Settings2 size={13} /> ENV
                        </button>
                    </div>
                </div>

                {activeView === 'client' ? (
                    <>
                        <RequestTabBar openTabs={openTabs} activeTabId={activeTabId} onTabSelect={(tid) => { setActiveTabId(tid); setCurrentReq(openTabs.find(t => t.id === tid)); }} onTabClose={handleTabClose} theme={theme} />
                        {currentReq ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <RequestUrlBar currentReq={currentReq} canEdit={canEdit} isDirty={isDirty} reqLoading={reqLoading} variables={resolvedVariables} urlHistory={urlHistory} onMethodChange={(m) => handleRequestChange({ method: m })} onProtocolChange={(p) => handleRequestChange({ protocol: p })} onUrlChange={(u) => handleRequestChange({ url: u })} onSend={handleSendRequest} onSave={handleSaveSingleRequest} onCopyUrl={() => { }} onCopyMarkdown={() => { }} onDownloadMarkdown={() => { }} onFocus={(field) => handlePresenceUpdate({ field, requestId: currentReq.id })} />
                                <div className={`flex-1 overflow-hidden flex ${paneLayout === 'vertical' ? 'flex-col' : 'flex-row'}`}>
                                    <div className="overflow-hidden" style={paneLayout === 'vertical' ? { height: `${verticalSplitRatio}%` } : { width: `${mainSplitRatio}%` }}>
                                        <RequestTabs currentReq={currentReq} variables={resolvedVariables} activeTab={activeTab} canEdit={canEdit} aiCommand={aiCommand} aiLoading={aiMutation.isPending} aiEnabled={aiEnabled} onTabChange={setActiveTab} onRequestChange={handleRequestChange} onAiCommandChange={setAiCommand} onAiGenerate={handleAiGenerate} onAiGenerateTests={handleAiGenerateTests} onFormatJson={() => { }} onCopyBody={() => { }} onCopyTitle={() => { }} onCopyMarkdown={() => { }} onSelection={handleSelection} onContextMenu={handleContextMenu} lastPreScriptResult={lastPreScriptResult} lastPostScriptResult={lastPostScriptResult} />
                                    </div>
                                    <div className={`bg-[#1a7a7c]/10 hover:bg-[#1a7a7c]/50 transition-colors z-10 ${paneLayout === 'vertical' ? 'h-1 w-full cursor-row-resize' : 'w-1 h-full cursor-col-resize'} ${isResizingMain || isResizingVertical ? 'bg-[#1a7a7c]' : ''}`} onMouseDown={paneLayout === 'vertical' ? startVerticalResize : startMainResize} />
                                    <div className="flex-1 h-full overflow-hidden">
                                        <ResponsePanel response={response} currentReq={currentReq} reqLoading={reqLoading} paneLayout={paneLayout} endpoints={endpoints} selectedIdx={selectedIdx} onLayoutChange={setPaneLayout} onLoadHistory={(item: any) => {
                                            // Save current response as latest if not already saved
                                            if (!isViewingHistory && response) latestResponseRef.current = response;
                                            // Show the history item's response
                                            setResponse(item.lastResponse || { status: item.lastResponse?.status, data: item.lastResponse?.data, time: item.lastResponse?.time, timestamp: item.timestamp });
                                            setIsViewingHistory(true);
                                        }}
                                        onBackToLatest={() => {
                                            // Restore the latest live response
                                            if (latestResponseRef.current) setResponse(latestResponseRef.current);
                                            setIsViewingHistory(false);
                                        }}
                                        isViewingHistory={isViewingHistory} onSelection={handleSelection} onContextMenu={handleContextMenu} shouldCopySingleLine={shouldCopySingleLine} aiEnabled={aiEnabled} onExplainError={handleAiExplainError} wsMessages={socketMessages} wsStatus={socketStatus} socketMode={socketMode} onWsConnect={handleSocketConnect} onWsDisconnect={handleSocketDisconnect} onWsSendMessage={handleSocketSendMessage} onWsClearMessages={handleSocketClearMessages} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center opacity-30 flex-col gap-4"><FileText size={64} /><p className="text-xl font-bold uppercase tracking-widest">Select a request to begin</p></div>
                        )}
                    </>
                ) : activeView === 'docs' ? <DocumentationView doc={doc} endpoints={endpoints} theme={theme} previewContent={previewContent} onCopyMarkdown={() => { }} onDownloadMarkdown={() => handleGenerateMarkdown(false)} onDownloadPdf={() => { }} onGenerateAiReadme={handleGenerateAiReadme} resolveUrl={resolveUrl} resolveAll={resolveAll} publicSlug={doc.slug} onExportPostman={handleExportPostman} onExportOpenApi={handleExportOpenApi} />
                    : activeView === 'monitoring' ? <MonitorDashboard documentationId={id as string} isPublic={doc.isPublic} slug={doc.slug} />
                        : activeView === 'webhooks' ? <WebhooksTab documentationId={id as string} canAdmin={canAdmin} />
                            : <ChangelogView docId={id as string} theme={theme} />
                }
            </div>

            <EnvModal isOpen={showEnv} onClose={() => setShowEnv(false)} documentationId={id as string} variables={variables} setVariables={(v) => { setVariables(v); setIsCollectionDirty(true); }} />
            {showAiBuilder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`w-full max-w-lg rounded-3xl border ${themeClasses.borderCol} ${theme === 'dark' ? 'bg-[#1a1b26]' : 'bg-white'} shadow-2xl p-6 flex flex-col gap-6 animate-in zoom-in-95 duration-200`}>
                        <div><h2 className={`text-xl font-black tracking-tight ${themeClasses.textColor} flex items-center gap-2`}><Sparkles className="text-[#2ec4c7] animate-pulse" /> AI Request Builder</h2><p className="text-xs text-gray-500">Describe the API request you want to create (e.g., "Create a POST request for user registration with name and email fields")</p></div>
                        <div className="space-y-4"><textarea value={aiBuilderPrompt} onChange={(e) => setAiBuilderPrompt(e.target.value)} className={`w-full h-32 p-4 rounded-2xl border ${themeClasses.borderCol} ${themeClasses.inputBg} ${themeClasses.textColor} text-sm outline-none focus:ring-2 focus:ring-[#249d9f]/20 focus:border-[#249d9f] transition-all resize-none`} placeholder="What kind of request should I build?" autoFocus /></div>
                        <div className="flex gap-3"><button onClick={() => setShowAiBuilder(false)} className={`flex-1 px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all`}>CANCEL</button><button onClick={() => { if (aiBuilderPrompt.trim()) { handleAiGenerateRequest(aiBuilderPrompt); setShowAiBuilder(false); setAiBuilderPrompt(''); } }} disabled={!aiBuilderPrompt.trim()} className="flex-1 px-4 py-2.5 rounded-xl bg-[#1a7a7c] text-white text-sm font-bold hover:bg-[#249d9f] transition-all disabled:opacity-50 flex items-center justify-center gap-2"><Zap size={16} /> BUILD REQUEST</button></div>
                    </div>
                </div>
            )}
            {/* Right-click context menu */}
            {contextMenu.visible && selectedText && (
                <div
                    style={{
                        position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 200,
                        background: '#161B22', border: '1px solid #30363D', borderRadius: 10,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 220, overflow: 'hidden',
                    }}
                    onClick={() => setContextMenu(p => ({ ...p, visible: false }))}
                >
                    <button
                        onClick={() => { navigator.clipboard.writeText(selectedText); toast.success('Copied'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', color: '#E6EDF3', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #21262D' }}
                        className="hover:bg-white/5"
                    >
                        Copy
                    </button>
                    <button
                        onClick={() => {
                            // Auto-detect JSON path from whichever body the selection came from
                            const sourceText = contextMenu.source === 'request-body'
                                ? (currentReq?.body?.raw || '')
                                : contextMenu.source === 'response-body'
                                    ? (typeof response?.data === 'string' ? response.data : JSON.stringify(response?.data || ''))
                                    : '';
                            const path = detectJsonPath(sourceText, selectedText);
                            setSaveVarSuggestedName(path ? toVariableName(path) : '');
                            setSaveVarExtractMode(false);
                            setShowSaveVarModal(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', color: '#249d9f', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', borderBottom: contextMenu.source === 'request-body' ? '1px solid #21262D' : 'none' }}
                        className="hover:bg-white/5"
                    >
                        Save as Variable
                    </button>
                    {contextMenu.source === 'request-body' && (
                        <button
                            onClick={() => {
                                const path = detectJsonPath(currentReq?.body?.raw || '', selectedText);
                                setSaveVarSuggestedName(path ? toVariableName(path) : '');
                                setSaveVarExtractMode(true);
                                setShowSaveVarModal(true);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', color: '#D29922', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                            className="hover:bg-white/5"
                        >
                            Extract to Variable
                            <span style={{ fontSize: 10, color: '#6E7681', marginLeft: 'auto', fontWeight: 400 }}>→ replace in body</span>
                        </button>
                    )}
                </div>
            )}

            <CreateFolderModal isOpen={showFolderModal} onClose={() => setShowFolderModal(false)} onSubmit={async (data) => { if (editingFolder) await updateFolder(editingFolder.id, data); else await createFolder(data); }} parentFolder={parentFolderForNew} editingFolder={editingFolder} />
            <CollaboratorModal isOpen={showCollaborators} onClose={() => setShowCollaborators(false)} documentationId={id as string} isPublic={doc.isPublic} slug={doc.slug} onTogglePublic={handleShare} onSlugUpdate={handleUpdateSlug} userRole={userRole as any} />
            <SnapshotModal isOpen={showSnapshots} onClose={() => setShowSnapshots(false)} documentationId={id as string} />
            {showRunner && <CollectionRunner endpoints={endpoints} variables={resolvedVariables} onClose={() => setShowRunner(false)} />}
            <DeleteConfirmModal isOpen={!!pendingDelete} itemName={pendingDelete?.name || ''} itemType={pendingDelete?.type === 'folder' ? 'folder' : 'request'} onConfirm={async () => { if (pendingDelete?.type === 'request' && pendingDelete.idx !== undefined) { const rid = endpoints[pendingDelete.idx].id; if (rid) await deleteRequestMutation.mutateAsync(rid); queryClient.invalidateQueries({ queryKey: ['doc', id] }); setEndpoints(prev => prev.filter((_, i) => !pendingDelete || i !== pendingDelete.idx)); } else if (pendingDelete?.type === 'folder') await deleteFolder(pendingDelete.folder.id, true); setPendingDelete(null); }} onCancel={() => setPendingDelete(null)} />
            <SaveVariableModal
                isOpen={showSaveVarModal}
                onClose={() => { setShowSaveVarModal(false); setSaveVarExtractMode(false); setSaveVarSuggestedName(''); }}
                selectedValue={selectedText}
                documentationId={id as string}
                suggestedName={saveVarSuggestedName}
                extractMode={saveVarExtractMode}
                onExtract={(varName) => {
                    // Replace selectedText in request body with {{varName}}
                    if (!currentReq || !saveVarExtractMode) return;
                    const currentBody = currentReq.body?.raw || '';
                    const updated = currentBody.split(selectedText).join(`{{${varName}}}`);
                    const updatedReq = { ...currentReq, body: { ...currentReq.body, raw: updated } };
                    setCurrentReq(updatedReq);
                    setIsDirty(true);
                    toast.success(`Replaced with {{${varName}}}`);
                }}
            />
        </div>
    );
}

export default function ApiClient() {
    return (
        <ProtectedRoute>
            <ApiClientContent />
        </ProtectedRoute>
    );
}
