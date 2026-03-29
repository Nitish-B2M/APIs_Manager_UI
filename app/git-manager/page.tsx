'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    GitBranch, GitCommit, GitPullRequest, FolderOpen, Plus, Trash2, RefreshCw,
    ArrowUp, ArrowDown, Check, X, ChevronDown, File, FilePlus, FileX, FileEdit,
    AlertTriangle, Loader2, ArrowLeft, Eye, RotateCcw, Archive, Clock, Merge,
    FolderGit2, Terminal, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useGithubAccounts } from '../../context/GithubAccountContext';
import { ProtectedRoute } from '../../components/AuthGuard';
import { api } from '../../utils/api';

interface FileChange {
    path: string;
    status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflict';
    staged: boolean;
    statusCode: string;
}

interface RepoData {
    id: string;
    name: string;
    path: string;
    valid: boolean;
    branch: string | null;
    remote: string | null;
    lastCommit: { hash: string; message: string; author: string; timeAgo: string } | null;
}

interface CommitLog {
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    email: string;
    date: string;
    timeAgo: string;
}

interface BranchInfo {
    name: string;
    current: boolean;
    remote: boolean;
    lastCommit?: string;
}

type Tab = 'changes' | 'history' | 'branches' | 'stash';

export default function GitManagerPage() {
    const { theme } = useTheme();
    const { isLoggedIn } = useAuth();
    const { activeAccount } = useGithubAccounts();

    // State
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [repos, setRepos] = useState<RepoData[]>([]);
    const [activeRepo, setActiveRepo] = useState<RepoData | null>(null);
    const [files, setFiles] = useState<FileChange[]>([]);
    const [branch, setBranch] = useState<string | null>(null);
    const [ahead, setAhead] = useState(0);
    const [behind, setBehind] = useState(0);
    const [selectedFile, setSelectedFile] = useState<FileChange | null>(null);
    const [diff, setDiff] = useState('');
    const [commitMsg, setCommitMsg] = useState('');
    const [loading, setLoading] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('changes');
    const [history, setHistory] = useState<CommitLog[]>([]);
    const [branches, setBranches] = useState<BranchInfo[]>([]);
    const [stashes, setStashes] = useState<string[]>([]);
    const [newRepoPath, setNewRepoPath] = useState('');
    const [showAddRepo, setShowAddRepo] = useState(false);
    const [newBranchName, setNewBranchName] = useState('');
    const [showBranchCreate, setShowBranchCreate] = useState(false);

    const dark = theme === 'dark';
    const cardBg = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm';
    const inputBg = dark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';
    const sub = dark ? 'text-gray-400' : 'text-gray-500';

    // ─── Data Fetching ───────────────────────────────────────────────

    const fetchRepos = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const res = await api.git.listRepos();
            setRepos(res.data || []);
        } catch { /* ignore */ }
    }, [isLoggedIn]);

    const fetchStatus = useCallback(async (repoPath: string) => {
        try {
            const res = await api.git.status(repoPath);
            setFiles(res.data.files || []);
            setBranch(res.data.branch);
            setAhead(res.data.ahead || 0);
            setBehind(res.data.behind || 0);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch status');
        }
    }, []);

    const fetchDiff = useCallback(async (repoPath: string, file: FileChange) => {
        try {
            const res = await api.git.diff(repoPath, file.path, file.staged);
            setDiff(res.data.diff || '(no changes)');
        } catch {
            setDiff('Failed to load diff');
        }
    }, []);

    const fetchHistory = useCallback(async (repoPath: string) => {
        try {
            const res = await api.git.log(repoPath);
            setHistory(res.data || []);
        } catch { /* ignore */ }
    }, []);

    const fetchBranches = useCallback(async (repoPath: string) => {
        try {
            const res = await api.git.branches(repoPath);
            setBranches(res.data || []);
        } catch { /* ignore */ }
    }, []);

    const fetchStashes = useCallback(async (repoPath: string) => {
        try {
            const res = await api.git.stashList(repoPath);
            setStashes(res.data || []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { fetchRepos(); }, [fetchRepos]);

    useEffect(() => {
        if (!activeRepo) return;
        fetchStatus(activeRepo.path);
        if (tab === 'history') fetchHistory(activeRepo.path);
        if (tab === 'branches') fetchBranches(activeRepo.path);
        if (tab === 'stash') fetchStashes(activeRepo.path);
    }, [activeRepo, tab, fetchStatus, fetchHistory, fetchBranches, fetchStashes]);

    const refreshAll = () => {
        if (!activeRepo) return;
        fetchStatus(activeRepo.path);
        if (tab === 'history') fetchHistory(activeRepo.path);
        if (tab === 'branches') fetchBranches(activeRepo.path);
        setSelectedFile(null);
        setDiff('');
    };

    // ─── Actions ─────────────────────────────────────────────────────

    const addRepo = async () => {
        if (!newRepoPath.trim()) return;
        try {
            setLoading('addRepo');
            await api.git.addRepo(newRepoPath.trim());
            await fetchRepos();
            setNewRepoPath('');
            setShowAddRepo(false);
            toast.success('Repository added');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(null);
        }
    };

    const removeRepo = async (id: string) => {
        try {
            await api.git.removeRepo(id);
            if (activeRepo?.id === id) { setActiveRepo(null); setFiles([]); }
            await fetchRepos();
            toast.success('Repository removed');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const doStage = async (filePaths: string[]) => {
        if (!activeRepo) return;
        try {
            await api.git.stage(activeRepo.path, filePaths);
            await fetchStatus(activeRepo.path);
            toast.success('Staged');
        } catch (err: any) { toast.error(err.message); }
    };

    const doUnstage = async (filePaths: string[]) => {
        if (!activeRepo) return;
        try {
            await api.git.unstage(activeRepo.path, filePaths);
            await fetchStatus(activeRepo.path);
            toast.success('Unstaged');
        } catch (err: any) { toast.error(err.message); }
    };

    const doStageAll = async () => {
        if (!activeRepo) return;
        try {
            await api.git.stage(activeRepo.path, undefined, true);
            await fetchStatus(activeRepo.path);
            toast.success('All files staged');
        } catch (err: any) { toast.error(err.message); }
    };

    const doUnstageAll = async () => {
        if (!activeRepo) return;
        if (stagedFiles.length === 0) { toast.error('No staged files to unstage'); return; }
        try {
            await api.git.unstage(activeRepo.path, undefined, true);
            await fetchStatus(activeRepo.path);
            toast.success(`Unstaged ${stagedFiles.length} file${stagedFiles.length !== 1 ? 's' : ''}`);
        } catch (err: any) { toast.error(err.message); }
    };

    const doDiscard = async (filePaths: string[]) => {
        if (!activeRepo) return;
        if (!confirm(`Discard changes to ${filePaths.length} file(s)? This cannot be undone.`)) return;
        try {
            await api.git.discard(activeRepo.path, filePaths);
            await fetchStatus(activeRepo.path);
            toast.success('Changes discarded');
        } catch (err: any) { toast.error(err.message); }
    };

    const doCommit = async () => {
        if (!activeRepo || !commitMsg.trim()) return;
        try {
            setLoading('commit');
            await api.git.commit(activeRepo.path, commitMsg.trim());
            setCommitMsg('');
            await fetchStatus(activeRepo.path);
            toast.success('Committed!');
        } catch (err: any) { toast.error(err.message); }
        finally { setLoading(null); }
    };

    const doPush = async () => {
        if (!activeRepo) return;
        try {
            setLoading('push');
            await api.git.push(activeRepo.path);
            await fetchStatus(activeRepo.path);
            toast.success('Pushed!');
        } catch (err: any) { toast.error(err.message); }
        finally { setLoading(null); }
    };

    const doPull = async () => {
        if (!activeRepo) return;
        try {
            setLoading('pull');
            await api.git.pull(activeRepo.path);
            await fetchStatus(activeRepo.path);
            toast.success('Pulled!');
        } catch (err: any) { toast.error(err.message); }
        finally { setLoading(null); }
    };

    const doSwitchBranch = async (branchName: string) => {
        if (!activeRepo) return;
        try {
            setLoading('branch');
            await api.git.switchBranch(activeRepo.path, branchName);
            await fetchStatus(activeRepo.path);
            await fetchBranches(activeRepo.path);
            toast.success(`Switched to ${branchName}`);
        } catch (err: any) {
            // If switch fails due to uncommitted changes, offer to stash first
            const msg = err.message || '';
            if (msg.includes('overwritten by checkout') || msg.includes('commit your changes or stash')) {
                if (confirm(`You have uncommitted changes. Stash them and switch to "${branchName}"?`)) {
                    try {
                        await api.git.stash(activeRepo.path, `Auto-stash before switching to ${branchName}`);
                        await api.git.switchBranch(activeRepo.path, branchName);
                        await fetchStatus(activeRepo.path);
                        await fetchBranches(activeRepo.path);
                        toast.success(`Stashed changes and switched to ${branchName}`);
                    } catch (stashErr: any) {
                        toast.error(stashErr.message || 'Failed to stash and switch');
                    }
                }
            } else {
                toast.error(msg);
            }
        } finally { setLoading(null); }
    };

    const doCreateBranch = async () => {
        if (!activeRepo || !newBranchName.trim()) return;
        try {
            await api.git.createBranch(activeRepo.path, newBranchName.trim());
            setNewBranchName('');
            setShowBranchCreate(false);
            await fetchStatus(activeRepo.path);
            await fetchBranches(activeRepo.path);
            toast.success(`Branch created: ${newBranchName.trim()}`);
        } catch (err: any) { toast.error(err.message); }
    };

    const doDeleteBranch = async (branchName: string) => {
        if (!activeRepo) return;
        if (!confirm(`Delete branch "${branchName}"?`)) return;
        try {
            await api.git.deleteBranch(activeRepo.path, branchName);
            await fetchBranches(activeRepo.path);
            toast.success(`Deleted branch: ${branchName}`);
        } catch (err: any) { toast.error(err.message); }
    };

    const doStash = async () => {
        if (!activeRepo) return;
        try {
            await api.git.stash(activeRepo.path);
            await fetchStatus(activeRepo.path);
            await fetchStashes(activeRepo.path);
            toast.success('Changes stashed');
        } catch (err: any) { toast.error(err.message); }
    };

    const doStashPop = async () => {
        if (!activeRepo) return;
        try {
            await api.git.stashPop(activeRepo.path);
            await fetchStatus(activeRepo.path);
            await fetchStashes(activeRepo.path);
            toast.success('Stash popped');
        } catch (err: any) { toast.error(err.message); }
    };

    // ─── Derived Data ────────────────────────────────────────────────

    const stagedFiles = files.filter(f => f.staged);
    const unstagedFiles = files.filter(f => !f.staged);

    const statusIcon = (status: string) => {
        switch (status) {
            case 'modified': return <FileEdit size={14} className="text-amber-400" />;
            case 'added': case 'untracked': return <FilePlus size={14} className="text-green-400" />;
            case 'deleted': return <FileX size={14} className="text-red-400" />;
            case 'conflict': return <AlertTriangle size={14} className="text-red-500" />;
            default: return <File size={14} className="text-gray-400" />;
        }
    };

    // ─── Render ──────────────────────────────────────────────────────

    return (
        <ProtectedRoute>
            <div className={`min-h-[calc(100vh-64px)] ${dark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors`}>
                <div className="flex h-[calc(100vh-64px)]">

                    {/* ── Left Sidebar: Repos (collapsible) ── */}
                    {sidebarOpen && (
                        <div className={`w-64 flex-shrink-0 border-r ${dark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'} flex flex-col`}>
                            {/* GitHub User */}
                            {activeAccount && (
                                <div className={`px-3 py-2.5 border-b ${dark ? 'border-gray-700' : 'border-gray-200'} flex items-center gap-2.5`}>
                                    <img
                                        src={activeAccount.avatarUrl}
                                        alt={activeAccount.login}
                                        className="w-7 h-7 rounded-full border border-white/10"
                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${activeAccount.login}&background=6366f1&color=fff&size=28`; }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate">{activeAccount.name || activeAccount.login}</p>
                                        <p className={`text-[10px] ${sub} truncate`}>{activeAccount.email || `@${activeAccount.login}`}</p>
                                    </div>
                                </div>
                            )}

                            {/* Repos Header */}
                            <div className="p-3 border-b border-inherit flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FolderGit2 size={16} className="text-indigo-400" />
                                    <span className="text-sm font-bold">Repositories</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setShowAddRepo(!showAddRepo)} className="p-1 rounded hover:bg-white/10 text-muted hover:text-heading transition-all" title="Add repository">
                                        <Plus size={16} />
                                    </button>
                                    <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-white/10 text-muted hover:text-heading transition-all" title="Collapse sidebar">
                                        <PanelLeftClose size={16} />
                                    </button>
                                </div>
                            </div>

                            {showAddRepo && (
                                <div className="p-3 border-b border-inherit space-y-2">
                                    <input
                                        value={newRepoPath}
                                        onChange={e => setNewRepoPath(e.target.value)}
                                        placeholder="D:\projects\my-repo"
                                        className={`w-full text-xs rounded-lg px-3 py-2 border ${inputBg}`}
                                        onKeyDown={e => e.key === 'Enter' && addRepo()}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={addRepo} disabled={loading === 'addRepo'} className="flex-1 text-xs py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50">
                                            {loading === 'addRepo' ? 'Adding...' : 'Add'}
                                        </button>
                                        <button onClick={() => setShowAddRepo(false)} className="text-xs py-1.5 px-3 rounded-lg text-muted hover:text-heading">Cancel</button>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto">
                                {repos.length === 0 && (
                                    <div className="p-6 text-center">
                                        <FolderOpen size={24} className={`mx-auto mb-2 ${sub} opacity-30`} />
                                        <p className={`text-xs ${sub}`}>No repositories added</p>
                                    </div>
                                )}
                                {repos.map(repo => (
                                    <div
                                        key={repo.id}
                                        onClick={() => { setActiveRepo(repo); setSelectedFile(null); setDiff(''); setTab('changes'); }}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={e => { if (e.key === 'Enter') { setActiveRepo(repo); setSelectedFile(null); setDiff(''); setTab('changes'); }}}
                                        className={`w-full text-left px-3 py-2.5 border-b border-inherit transition-all group cursor-pointer ${
                                            activeRepo?.id === repo.id
                                                ? (dark ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'bg-indigo-50 border-l-2 border-l-indigo-500')
                                                : 'hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold truncate">{repo.name}</span>
                                            <button onClick={e => { e.stopPropagation(); removeRepo(repo.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted hover:text-red-400 transition-all">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        {repo.branch && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <GitBranch size={10} className="text-indigo-400" />
                                                <span className={`text-[10px] ${sub}`}>{repo.branch}</span>
                                            </div>
                                        )}
                                        <p className={`text-[10px] ${sub} truncate mt-0.5`}>{repo.path}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Main Content ── */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Sidebar expand button when collapsed */}
                        {!sidebarOpen && (
                            <div className={`flex items-center gap-2 px-2 py-1.5 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                                <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-heading transition-all" title="Expand sidebar">
                                    <PanelLeftOpen size={16} />
                                </button>
                                {activeAccount && (
                                    <div className="flex items-center gap-2">
                                        <img src={activeAccount.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                                        <span className={`text-xs font-medium ${sub}`}>{activeAccount.login}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {!activeRepo ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <FolderGit2 size={48} className={`mx-auto mb-3 ${sub} opacity-20`} />
                                    <p className={`font-medium mb-1`}>Select a repository</p>
                                    <p className={`text-sm ${sub}`}>{sidebarOpen ? 'Add a repo from the sidebar or select an existing one' : 'Open the sidebar to select a repo'}</p>
                                    {!sidebarOpen && (
                                        <button onClick={() => setSidebarOpen(true)} className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Open Sidebar</button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Top Bar: Branch + Push/Pull */}
                                <div className={`px-4 py-2.5 border-b flex items-center justify-between ${dark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                            <GitBranch size={14} className="text-indigo-400" />
                                            <span className="text-sm font-bold text-indigo-400">{branch || 'detached'}</span>
                                        </div>
                                        {ahead > 0 && <span className="text-xs text-green-400 flex items-center gap-1"><ArrowUp size={12} />{ahead}</span>}
                                        {behind > 0 && <span className="text-xs text-amber-400 flex items-center gap-1"><ArrowDown size={12} />{behind}</span>}
                                        <span className={`text-xs ${sub}`}>{activeRepo.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={doPull} disabled={!!loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-50">
                                            {loading === 'pull' ? <Loader2 size={12} className="animate-spin" /> : <ArrowDown size={12} />} Pull
                                        </button>
                                        <button onClick={doPush} disabled={!!loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50">
                                            {loading === 'push' ? <Loader2 size={12} className="animate-spin" /> : <ArrowUp size={12} />} Push
                                        </button>
                                        <button onClick={refreshAll} className="p-1.5 rounded-lg text-muted hover:text-heading hover:bg-white/5 transition-all">
                                            <RefreshCw size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className={`flex border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                                    {([['changes', 'Changes', GitCommit], ['history', 'History', Clock], ['branches', 'Branches', GitBranch], ['stash', 'Stash', Archive]] as const).map(([id, label, Icon]) => (
                                        <button
                                            key={id}
                                            onClick={() => setTab(id as Tab)}
                                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
                                                tab === id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted hover:text-heading'
                                            }`}
                                        >
                                            <Icon size={13} />{label}
                                            {id === 'changes' && files.length > 0 && (
                                                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400">{files.length}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="flex-1 flex overflow-hidden">
                                    {tab === 'changes' && (
                                        <>
                                            {/* File List + Commit — flex column with commit pinned to bottom */}
                                            <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%', borderRight: `1px solid ${dark ? '#374151' : '#e5e7eb'}` }}>
                                                {/* Scrollable file list */}
                                                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                                    {/* Staged */}
                                                    {stagedFiles.length > 0 && (
                                                        <div>
                                                            <div className={`px-3 py-1.5 flex items-center justify-between sticky top-0 z-10 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#4ade80' }}>Staged ({stagedFiles.length})</span>
                                                                <button onClick={doUnstageAll} className={`text-[10px] ${sub} hover:text-heading`}>Unstage All</button>
                                                            </div>
                                                            {stagedFiles.map(f => (
                                                                <div
                                                                    key={`s-${f.path}`}
                                                                    onClick={() => { setSelectedFile(f); fetchDiff(activeRepo.path, f); }}
                                                                    className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all text-xs group ${
                                                                        selectedFile?.path === f.path && selectedFile?.staged === f.staged ? (dark ? 'bg-indigo-500/10' : 'bg-indigo-50') : 'hover:bg-white/5'
                                                                    }`}
                                                                >
                                                                    {statusIcon(f.status)}
                                                                    <span className="flex-1 truncate" title={f.path}>{f.path}</span>
                                                                    <button onClick={e => { e.stopPropagation(); doUnstage([f.path]); }} className="opacity-0 group-hover:opacity-100 text-muted hover:text-amber-400" title="Unstage">
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Unstaged / Changes */}
                                                    <div>
                                                        <div className={`px-3 py-1.5 flex items-center justify-between sticky top-0 z-10 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fbbf24' }}>Changes ({unstagedFiles.length})</span>
                                                            <button onClick={doStageAll} className={`text-[10px] ${sub} hover:text-heading`}>Stage All</button>
                                                        </div>
                                                        {unstagedFiles.length === 0 && stagedFiles.length === 0 && (
                                                            <div className={`p-6 text-center text-xs ${sub}`}>
                                                                <Check size={20} className="mx-auto mb-1 text-green-400 opacity-50" />
                                                                No changes
                                                            </div>
                                                        )}
                                                        {unstagedFiles.map(f => (
                                                            <div
                                                                key={`u-${f.path}`}
                                                                onClick={() => { setSelectedFile(f); fetchDiff(activeRepo.path, f); }}
                                                                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all text-xs group ${
                                                                    selectedFile?.path === f.path && selectedFile?.staged === f.staged ? (dark ? 'bg-indigo-500/10' : 'bg-indigo-50') : 'hover:bg-white/5'
                                                                }`}
                                                            >
                                                                {statusIcon(f.status)}
                                                                <span className="flex-1 truncate" title={f.path}>{f.path}</span>
                                                                <button onClick={e => { e.stopPropagation(); doDiscard([f.path]); }} className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400" title="Discard">
                                                                    <RotateCcw size={11} />
                                                                </button>
                                                                <button onClick={e => { e.stopPropagation(); doStage([f.path]); }} className="opacity-0 group-hover:opacity-100 text-muted hover:text-green-400" title="Stage">
                                                                    <Plus size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Commit Box — always at bottom */}
                                                <div style={{ flexShrink: 0, borderTop: `1px solid ${dark ? '#374151' : '#e5e7eb'}`, padding: 12 }}>
                                                    <textarea
                                                        value={commitMsg}
                                                        onChange={e => setCommitMsg(e.target.value)}
                                                        placeholder="Commit message..."
                                                        className={`w-full text-xs rounded-lg px-3 py-2 border resize-none ${inputBg}`}
                                                        style={{ height: 72 }}
                                                    />
                                                    <button
                                                        onClick={doCommit}
                                                        disabled={!commitMsg.trim() || stagedFiles.length === 0 || !!loading}
                                                        className="w-full mt-2 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        {loading === 'commit' ? <Loader2 size={12} className="animate-spin" /> : <GitCommit size={13} />}
                                                        Commit ({stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''})
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Diff Viewer */}
                                            <div className="flex-1 overflow-auto">
                                                {!selectedFile ? (
                                                    <div className={`flex-1 flex items-center justify-center h-full ${sub}`}>
                                                        <div className="text-center">
                                                            <Eye size={24} className="mx-auto mb-2 opacity-30" />
                                                            <p className="text-xs">Select a file to view diff</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className={`px-4 py-2 border-b flex items-center gap-2 ${dark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                                                            {statusIcon(selectedFile.status)}
                                                            <span className="text-xs font-semibold">{selectedFile.path}</span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${selectedFile.staged ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                                {selectedFile.staged ? 'staged' : selectedFile.status}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', background: dark ? '#0d1117' : '#fff' }}>
                                                            {diff.split('\n').map((line, i) => {
                                                                const isAdd = line.startsWith('+') && !line.startsWith('+++');
                                                                const isDel = line.startsWith('-') && !line.startsWith('---');
                                                                const isHunk = line.startsWith('@@');
                                                                const isMeta = line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++');

                                                                let rowStyle: React.CSSProperties = { display: 'flex' };
                                                                let textStyle: React.CSSProperties = { flex: 1, padding: '1px 12px', whiteSpace: 'pre' };
                                                                let gutterExtra: React.CSSProperties = {};

                                                                if (isAdd) {
                                                                    rowStyle.background = dark ? 'rgba(46, 160, 67, 0.15)' : '#dafbe1';
                                                                    rowStyle.borderLeft = '3px solid #3fb950';
                                                                    textStyle.color = dark ? '#7ee787' : '#116329';
                                                                    gutterExtra.background = dark ? 'rgba(46, 160, 67, 0.1)' : '#ccffd8';
                                                                    gutterExtra.color = dark ? '#7ee787' : '#116329';
                                                                } else if (isDel) {
                                                                    rowStyle.background = dark ? 'rgba(248, 81, 73, 0.15)' : '#ffeef0';
                                                                    rowStyle.borderLeft = '3px solid #f85149';
                                                                    textStyle.color = dark ? '#ffa198' : '#b31d28';
                                                                    gutterExtra.background = dark ? 'rgba(248, 81, 73, 0.1)' : '#ffdce0';
                                                                    gutterExtra.color = dark ? '#ffa198' : '#b31d28';
                                                                } else if (isHunk) {
                                                                    rowStyle.background = dark ? 'rgba(56, 139, 253, 0.1)' : '#f1f8ff';
                                                                    textStyle.color = dark ? '#79c0ff' : '#0366d6';
                                                                    textStyle.fontWeight = 600;
                                                                    rowStyle.borderLeft = '3px solid transparent';
                                                                } else if (isMeta) {
                                                                    textStyle.color = dark ? '#8b949e' : '#959da5';
                                                                    textStyle.fontWeight = 600;
                                                                    rowStyle.borderLeft = '3px solid transparent';
                                                                } else {
                                                                    rowStyle.borderLeft = '3px solid transparent';
                                                                }

                                                                const gutterStyle: React.CSSProperties = {
                                                                    width: 44,
                                                                    flexShrink: 0,
                                                                    textAlign: 'right',
                                                                    paddingRight: 8,
                                                                    userSelect: 'none',
                                                                    color: dark ? '#484f58' : '#bbb',
                                                                    background: dark ? '#161b22' : '#fafbfc',
                                                                    borderRight: `1px solid ${dark ? '#30363d' : '#e1e4e8'}`,
                                                                    ...gutterExtra,
                                                                };

                                                                return (
                                                                    <div key={i} style={rowStyle}>
                                                                        <span style={gutterStyle}>
                                                                            {!isMeta && !isHunk ? i + 1 : ''}
                                                                        </span>
                                                                        <span style={textStyle}>
                                                                            {(isAdd || isDel) ? line.substring(1) : line || ' '}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {tab === 'history' && (
                                        <div className="flex-1 overflow-y-auto">
                                            {history.length === 0 ? (
                                                <div className={`p-12 text-center ${sub}`}>
                                                    <Clock size={24} className="mx-auto mb-2 opacity-30" />
                                                    <p className="text-xs">No commit history</p>
                                                </div>
                                            ) : history.map(c => (
                                                <div key={c.hash} className={`px-4 py-3 border-b transition-all hover:bg-white/5 ${dark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-1">
                                                            <GitCommit size={14} className="text-indigo-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{c.message}</p>
                                                            <div className={`flex items-center gap-2 mt-0.5 text-[11px] ${sub}`}>
                                                                <span className="font-semibold">{c.author}</span>
                                                                <span>&middot;</span>
                                                                <span>{c.timeAgo}</span>
                                                                <span>&middot;</span>
                                                                <code className={`px-1 py-0.5 rounded text-[10px] ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>{c.shortHash}</code>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {tab === 'branches' && (
                                        <div className="flex-1 overflow-y-auto">
                                            <div className={`px-4 py-2.5 border-b flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                                                <span className={`text-xs font-bold ${sub}`}>LOCAL & REMOTE BRANCHES</span>
                                                <button onClick={() => setShowBranchCreate(!showBranchCreate)} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1">
                                                    <Plus size={12} /> New Branch
                                                </button>
                                            </div>
                                            {showBranchCreate && (
                                                <div className={`px-4 py-3 border-b flex gap-2 ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                                                    <input
                                                        value={newBranchName}
                                                        onChange={e => setNewBranchName(e.target.value)}
                                                        placeholder="branch-name"
                                                        className={`flex-1 text-xs rounded-lg px-3 py-2 border ${inputBg}`}
                                                        onKeyDown={e => e.key === 'Enter' && doCreateBranch()}
                                                    />
                                                    <button onClick={doCreateBranch} className="text-xs px-3 py-2 rounded-lg bg-indigo-600 text-white font-medium">Create</button>
                                                    <button onClick={() => setShowBranchCreate(false)} className="text-xs px-2 text-muted">Cancel</button>
                                                </div>
                                            )}
                                            {branches.filter(b => !b.remote).map(b => (
                                                <div key={b.name} className={`px-4 py-2.5 border-b flex items-center gap-3 transition-all hover:bg-white/5 ${dark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                                                    <GitBranch size={14} className={b.current ? 'text-green-400' : 'text-muted'} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-medium ${b.current ? 'text-green-400' : ''}`}>{b.name}</span>
                                                            {b.current && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">current</span>}
                                                        </div>
                                                        {b.lastCommit && <p className={`text-[11px] ${sub} truncate`}>{b.lastCommit}</p>}
                                                    </div>
                                                    {!b.current && (
                                                        <div className="flex gap-1">
                                                            <button onClick={() => doSwitchBranch(b.name)} className="text-[10px] px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 font-medium">Switch</button>
                                                            <button onClick={() => doDeleteBranch(b.name)} className="text-[10px] px-2 py-1 rounded text-red-400 hover:bg-red-500/10">Delete</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {branches.filter(b => b.remote).length > 0 && (
                                                <>
                                                    <div className={`px-4 py-1.5 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>Remote</span>
                                                    </div>
                                                    {branches.filter(b => b.remote).map(b => (
                                                        <div key={b.name} className={`px-4 py-2 border-b flex items-center gap-3 ${dark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                                                            <GitBranch size={12} className="text-muted" />
                                                            <span className={`text-xs ${sub}`}>{b.name}</span>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {tab === 'stash' && (
                                        <div className="flex-1 overflow-y-auto">
                                            <div className={`px-4 py-2.5 border-b flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                                                <span className={`text-xs font-bold ${sub}`}>STASH</span>
                                                <div className="flex gap-2">
                                                    <button onClick={doStash} disabled={files.length === 0} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1 disabled:opacity-40">
                                                        <Archive size={12} /> Stash Changes
                                                    </button>
                                                    {stashes.length > 0 && (
                                                        <button onClick={doStashPop} className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-medium flex items-center gap-1">
                                                            <RotateCcw size={12} /> Pop
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {stashes.length === 0 ? (
                                                <div className={`p-12 text-center ${sub}`}>
                                                    <Archive size={24} className="mx-auto mb-2 opacity-30" />
                                                    <p className="text-xs">No stashed changes</p>
                                                </div>
                                            ) : stashes.map((s, i) => (
                                                <div key={i} className={`px-4 py-2.5 border-b flex items-center gap-3 ${dark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                                                    <Archive size={14} className="text-indigo-400" />
                                                    <span className="text-xs flex-1">{s}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
