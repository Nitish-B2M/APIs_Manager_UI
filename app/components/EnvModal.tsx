'use client';
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings, Check, ChevronDown, Edit3, Globe, Eye, EyeOff, Shield, Download, Upload, FileJson, FileText, Save } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useEnvironments } from '../../hooks/useEnvironments';
import { useGlobalEnvironments } from '../../hooks/useGlobalEnvironments';
import { Environment } from '../../types';

interface EnvModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentationId: string;
    // Legacy props for backward compatibility
    variables?: Record<string, string>;
    setVariables?: (vars: Record<string, string>) => void;
}

export default function EnvModal({ isOpen, onClose, documentationId, variables: legacyVariables, setVariables: legacySetVariables }: EnvModalProps) {
    const { theme } = useTheme();
    const [scope, setScope] = useState<'COLLECTION' | 'GLOBAL'>('COLLECTION');

    // Collection environments
    const collEnv = useEnvironments({
        documentationId,
        enabled: isOpen && scope === 'COLLECTION' && !!documentationId
    });

    // Global environments
    const globEnv = useGlobalEnvironments({
        enabled: isOpen && scope === 'GLOBAL'
    });

    // Current active hook based on scope
    const currentEnvHook = scope === 'COLLECTION' ? collEnv : globEnv;
    const {
        environments,
        activeEnvironment,
        createEnvironment,
        updateEnvironment,
        deleteEnvironment,
        setActiveEnvironment,
        isLoading
    } = currentEnvHook;

    // Local state for editing
    const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
    const [editingVariables, setEditingVariables] = useState<Record<string, string>>({});
    const [editingSecrets, setEditingSecrets] = useState<string[]>([]);
    const [editingName, setEditingName] = useState('');
    const [showEnvDropdown, setShowEnvDropdown] = useState(false);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newEnvName, setNewEnvName] = useState('');
    const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
    const [isBulkEdit, setIsBulkEdit] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Sync with environments when scope changes or initial load
    useEffect(() => {
        if (environments.length > 0) {
            const active = environments.find(e => e.isActive) || environments[0];
            setSelectedEnvId(active.id);
            setEditingVariables(active.variables || {});
            setEditingSecrets(active.secrets || []);
            setEditingName(active.name);
        } else {
            setSelectedEnvId(null);
            setEditingVariables({});
            setEditingSecrets([]);
            setEditingName('');
        }
    }, [scope, environments.length]);

    const selectedEnv = environments.find(e => e.id === selectedEnvId);

    useEffect(() => {
        if (selectedEnv) {
            setEditingVariables(selectedEnv.variables || {});
            setEditingSecrets(selectedEnv.secrets || []);
            setEditingName(selectedEnv.name);
        }
    }, [selectedEnv]);

    if (!isOpen) return null;

    const handleKeyChange = (oldKey: string, newKey: string, value: string) => {
        const sanitizedKey = newKey.replace(/[{}]/g, '');
        const newVars = { ...editingVariables };
        delete newVars[oldKey];
        newVars[sanitizedKey] = value;
        setEditingVariables(newVars);

        // Update secrets array if key changed
        if (editingSecrets.includes(oldKey)) {
            setEditingSecrets(editingSecrets.map(k => k === oldKey ? sanitizedKey : k));
        }
    };

    const handleValueChange = (key: string, newValue: string) => {
        setEditingVariables({ ...editingVariables, [key]: newValue });
    };

    const addVariable = () => {
        const newKey = `new_var_${Object.keys(editingVariables).length}`;
        setEditingVariables({ ...editingVariables, [newKey]: '' });
    };

    const deleteVariable = (key: string) => {
        const newVars = { ...editingVariables };
        delete newVars[key];
        setEditingVariables(newVars);
        setEditingSecrets(editingSecrets.filter(k => k !== key));
    };

    const toggleSecret = (key: string) => {
        if (editingSecrets.includes(key)) {
            setEditingSecrets(editingSecrets.filter(k => k !== key));
        } else {
            setEditingSecrets([...editingSecrets, key]);
        }
    };

    const toggleVisibility = (key: string) => {
        setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSaveEnvironment = async () => {
        if (selectedEnvId && selectedEnv) {
            await updateEnvironment(selectedEnvId, {
                name: editingName,
                variables: editingVariables,
                secrets: editingSecrets
            });
        }
    };

    const handleCreateEnvironment = async () => {
        if (!newEnvName.trim()) return;
        const result = await createEnvironment({
            name: newEnvName.trim(),
            variables: {},
            secrets: [],
            isActive: environments.length === 0
        });
        setNewEnvName('');
        setIsCreatingNew(false);
        if (result?.data) {
            setSelectedEnvId(result.data.id);
        }
    };

    const handleDeleteEnvironment = async () => {
        if (!selectedEnvId) return;

        await deleteEnvironment(selectedEnvId);
        setSelectedEnvId(null);
        setEditingVariables({});
        setEditingSecrets([]);
        setEditingName('');
        setShowDeleteConfirm(false);
    };

    const handleSetActive = async (envId: string) => {
        await setActiveEnvironment(envId);
        setShowEnvDropdown(false);
    };

    const handleExport = () => {
        if (!selectedEnv) return;
        const data = {
            name: editingName,
            variables: editingVariables,
            secrets: editingSecrets,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${editingName.replace(/\s+/g, '_')}_env.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            let newVars: Record<string, string> = { ...editingVariables };
            let newSecrets: string[] = [...editingSecrets];

            try {
                if (file.name.endsWith('.env')) {
                    // Parse .env format
                    const lines = content.split(/\r?\n/);
                    lines.forEach(line => {
                        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                        if (match) {
                            const key = match[1];
                            let value = match[2] || '';
                            // Remove quotes if present
                            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                            newVars[key] = value;
                        }
                    });
                } else if (file.name.endsWith('.json')) {
                    // Parse JSON format
                    const data = JSON.parse(content);
                    if (data.variables) {
                        newVars = { ...newVars, ...data.variables };
                    }
                    if (data.secrets && Array.isArray(data.secrets)) {
                        newSecrets = Array.from(new Set([...newSecrets, ...data.secrets]));
                    }
                }

                setEditingVariables(newVars);
                setEditingSecrets(newSecrets);
                // Clear input
                e.target.value = '';
            } catch (err) {
                console.error('Import failed', err);
                alert('Failed to parse file. Please ensure it is a valid .env or JSON file.');
            }
        };
        reader.readAsText(file);
    };

    const toggleBulkEdit = () => {
        if (!isBulkEdit) {
            // Entering bulk mode: Convert object to .env string
            const text = Object.entries(editingVariables)
                .map(([k, v]) => `${k}=${v.includes(' ') || v.includes('"') || v.includes("'") ? `"${v.replace(/"/g, '\\"')}"` : v}`)
                .join('\n');
            setBulkText(text);
        } else {
            // Leaving bulk mode: Parse .env string into object
            const newVars: Record<string, string> = {};
            const lines = bulkText.split(/\r?\n/);
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return;
                const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)?$/);
                if (match) {
                    const key = match[1];
                    let value = match[2] || '';
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
                    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
                    newVars[key] = value;
                }
            });
            setEditingVariables(newVars);
        }
        setIsBulkEdit(!isBulkEdit);
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(bulkText);
        // We could add a toast here, but for now we'll just use the button state if needed
    };

    // Theme-aware styles
    const modalBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const headerBg = theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';
    const footerBg = theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-800';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    const inputBg = theme === 'dark'
        ? 'bg-gray-900 border-gray-600 text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-600'
        : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400';
    const codeStyle = theme === 'dark'
        ? 'bg-gray-900 text-indigo-400 px-1 rounded'
        : 'bg-gray-100 text-indigo-600 px-1 rounded';
    const deleteBtn = theme === 'dark'
        ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
        : 'text-gray-400 hover:text-red-500 hover:bg-red-50';
    const actionBtn = theme === 'dark'
        ? 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10'
        : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50';
    const closeBtn = theme === 'dark'
        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200';
    const saveBtn = theme === 'dark'
        ? 'text-gray-400 hover:text-green-400 hover:bg-green-500/10'
        : 'text-gray-400 hover:text-green-600 hover:bg-green-50';
    const hoverBg = theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`${modalBg} rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${headerBg}`}>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                                <Globe size={18} className="text-indigo-500" />
                            </div>
                            <h2 className={`text-lg font-bold ${textColor}`}>Environments</h2>
                        </div>

                        {/* Scope Tabs */}
                        <div className={`flex p-1 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200/50'}`}>
                            <button
                                onClick={() => setScope('COLLECTION')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${scope === 'COLLECTION'
                                    ? theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Collection
                            </button>
                            <button
                                onClick={() => setScope('GLOBAL')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${scope === 'GLOBAL'
                                    ? theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Global (Shared)
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${closeBtn}`}>
                        <X size={20} />
                    </button>
                </div>

                <div className="flex h-[65vh]">
                    {/* Left Sidebar - Environment List */}
                    <div className={`w-48 border-r ${theme === 'dark' ? 'border-gray-700 bg-gray-850' : 'border-gray-200 bg-gray-50'} flex flex-col`}>
                        <div className="p-3 flex-1 overflow-y-auto">
                            <div className="space-y-1">
                                {environments.map((env) => (
                                    <button
                                        key={env.id}
                                        onClick={() => setSelectedEnvId(env.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${selectedEnvId === env.id
                                            ? theme === 'dark' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                                            : `${textColor} ${hoverBg}`
                                            }`}
                                    >
                                        <span className="flex-1 truncate font-medium">{env.name}</span>
                                        {env.isActive && (
                                            <span className="w-2 h-2 rounded-full bg-green-500" title="Active" />
                                        )}
                                    </button>
                                ))}

                                {environments.length === 0 && !isLoading && (
                                    <div className={`text-center py-10 ${subTextColor} text-xs`}>
                                        <Globe size={32} className="mx-auto mb-3 opacity-20" />
                                        <p>No {scope.toLowerCase()} environments</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Environment */}
                        <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                            {isCreatingNew ? (
                                <div className="space-y-2">
                                    <input
                                        value={newEnvName}
                                        onChange={(e) => setNewEnvName(e.target.value)}
                                        placeholder="Name..."
                                        className={`w-full px-3 py-1.5 text-sm border rounded-lg ${inputBg}`}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreateEnvironment();
                                            if (e.key === 'Escape') setIsCreatingNew(false);
                                        }}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCreateEnvironment}
                                            className="flex-1 px-2 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-bold"
                                        >
                                            Create
                                        </button>
                                        <button
                                            onClick={() => setIsCreatingNew(false)}
                                            className={`px-2 py-1.5 text-xs rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsCreatingNew(true)}
                                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-colors ${theme === 'dark'
                                        ? 'text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/30'
                                        : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
                                        }`}
                                >
                                    <Plus size={14} /> New {scope === 'GLOBAL' ? 'Global' : 'Env'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Variables Editor */}
                    <div className="flex-1 flex flex-col bg-transparent">
                        {selectedEnv ? (
                            <>
                                {/* Environment Header */}
                                <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            className={`text-lg font-bold bg-transparent border-b-2 border-transparent focus:border-indigo-500 outline-none px-1 ${textColor}`}
                                        />
                                        {selectedEnv.isActive && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!selectedEnv.isActive && (
                                            <button
                                                onClick={() => handleSetActive(selectedEnv.id)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 ${theme === 'dark'
                                                    ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                    }`}
                                            >
                                                <Check size={14} /> Set Active
                                            </button>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="file"
                                                id="import-env-file"
                                                className="hidden"
                                                accept=".json,.env"
                                                onChange={handleImport}
                                            />
                                            <label
                                                htmlFor="import-env-file"
                                                className={`p-1.5 rounded-lg cursor-pointer ${actionBtn}`}
                                                title="Import from .env or JSON"
                                            >
                                                <Upload size={18} />
                                            </label>
                                            <button
                                                onClick={handleExport}
                                                className={`p-1.5 rounded-lg ${actionBtn}`}
                                                title="Export as JSON"
                                            >
                                                <Download size={18} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className={`p-1.5 rounded-lg ${deleteBtn}`}
                                            title="Delete environment"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Variables */}
                                <div className="flex-1 p-6 overflow-y-auto">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <p className={`text-sm ${textColor} font-semibold mb-1`}>
                                                Environment Variables
                                            </p>
                                            <p className={`text-xs ${subTextColor}`}>
                                                Use <code className={codeStyle}>{`{{varName}}`}</code> in your requests URL, headers, or body.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className="text-amber-500" />
                                            <span className={`text-xs ${subTextColor}`}>Secrets are masked by default</span>
                                        </div>
                                    </div>

                                    {isBulkEdit ? (
                                        <div className="flex-1 flex flex-col h-full min-h-[300px]">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${subTextColor}`}>Raw .env Format</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={handleCopyToClipboard}
                                                        className={`p-1.5 rounded-lg group ${actionBtn}`}
                                                        title="Copy to clipboard"
                                                    >
                                                        <Check size={14} className="hidden group-active:block" />
                                                        <Download size={14} className="group-active:hidden" />
                                                    </button>
                                                    <button
                                                        onClick={toggleBulkEdit}
                                                        className={`p-1.5 rounded-lg group ${isBulkEdit ? saveBtn : actionBtn}`}
                                                        title="Toggle Bulk Edit"
                                                    >
                                                        <Check size={14} className={isBulkEdit ? "hidden" : ""} />
                                                        <Save size={14} className={isBulkEdit ? "" : "hidden"} />
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                value={bulkText}
                                                onChange={(e) => setBulkText(e.target.value)}
                                                className={`flex-1 w-full p-4 font-mono text-sm border rounded-xl focus:ring-2 outline-none transition-colors resize-none ${inputBg}`}
                                                placeholder="KEY=VALUE"
                                                spellCheck={false}
                                            />
                                            <p className={`mt-3 text-[10px] ${subTextColor}`}>
                                                Each line should be <code className={codeStyle}>KEY=VALUE</code>. Quotes are optional unless the value contains spaces.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {Object.keys(editingVariables).length > 0 && (
                                                <div className={`flex gap-3 mb-3 text-[10px] font-bold uppercase tracking-wider ${subTextColor} px-2`}>
                                                    <span className="w-48">Variable Key</span>
                                                    <span className="flex-1">Value</span>
                                                    <span className="w-12 text-center">Security</span>
                                                    <span className="w-10"></span>
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                {Object.entries(editingVariables).map(([key, value], idx) => (
                                                    <div key={idx} className={`flex gap-3 items-center p-2 rounded-xl transition-all ${theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                                        <input
                                                            value={key}
                                                            onChange={(e) => handleKeyChange(key, e.target.value, value)}
                                                            className={`w-48 px-3 py-2.5 border rounded-lg focus:ring-2 outline-none text-sm font-mono transition-colors ${inputBg}`}
                                                            placeholder="Variable Key"
                                                        />
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type={editingSecrets.includes(key) && !visibleSecrets[key] ? 'password' : 'text'}
                                                                value={value}
                                                                onChange={(e) => handleValueChange(key, e.target.value)}
                                                                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 outline-none text-sm transition-colors ${editingSecrets.includes(key) ? 'border-amber-500/50 pr-10' : inputBg}`}
                                                                placeholder="Value"
                                                            />
                                                            {editingSecrets.includes(key) && (
                                                                <button
                                                                    onClick={() => toggleVisibility(key)}
                                                                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200`}
                                                                >
                                                                    {visibleSecrets[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="w-12 flex justify-center">
                                                            <button
                                                                onClick={() => toggleSecret(key)}
                                                                className={`p-2 rounded-lg transition-all ${editingSecrets.includes(key)
                                                                    ? 'bg-amber-500/20 text-amber-500'
                                                                    : 'text-gray-400 hover:bg-gray-200'
                                                                    }`}
                                                                title={editingSecrets.includes(key) ? "Masked as secret" : "Mark as secret"}
                                                            >
                                                                <Shield size={18} />
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => deleteVariable(key)}
                                                            className={`p-2 rounded-lg transition-colors ${deleteBtn}`}
                                                            title="Delete variable"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {Object.keys(editingVariables).length === 0 && (
                                                <div className={`text-center py-12 ${subTextColor} border-2 border-dashed rounded-2xl ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                                    <Settings size={40} className="mx-auto mb-3 opacity-20" />
                                                    <p className="text-sm font-medium">No variables defined</p>
                                                    <p className="text-xs opacity-60 mt-1">Start by adding your first variable below</p>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={addVariable}
                                                    className={`mt-6 flex items-center gap-2 font-bold text-sm px-4 py-2.5 rounded-xl transition-all ${theme === 'dark'
                                                        ? 'text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/30'
                                                        : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
                                                        }`}
                                                >
                                                    <Plus size={18} /> Add Variable
                                                </button>
                                                <button
                                                    onClick={toggleBulkEdit}
                                                    className={`mt-6 ${subTextColor} flex items-center gap-2 font-bold text-sm px-4 py-2.5 rounded-xl transition-all ${theme === 'dark'
                                                        ? 'text-purple-400 hover:bg-purple-500/10 border border-purple-500/30'
                                                        : 'text-purple-600 hover:bg-purple-50 border border-purple-200'
                                                        }`}
                                                >
                                                    {isBulkEdit ? <Settings size={14} /> : <FileText size={14} />}
                                                    {isBulkEdit ? 'Table View' : 'Bulk Edit'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className={`flex-1 flex items-center justify-center ${subTextColor}`}>
                                <div className="text-center">
                                    <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                        <Globe size={40} className="opacity-20" />
                                    </div>
                                    <p className="text-xl font-bold mb-2">Select an environment</p>
                                    <p className="text-sm opacity-60">Choose from the list or create a new one to manage variables</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${footerBg} flex justify-between items-center px-6`}>
                    <div className="flex items-center gap-4">
                        <div className={`text-xs ${subTextColor}`}>
                            {activeEnvironment ? (
                                <span>Active: <strong className={textColor}>{activeEnvironment.name}</strong></span>
                            ) : (
                                <span>No active environment</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {selectedEnv && (
                            <button
                                onClick={handleSaveEnvironment}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all text-sm"
                            >
                                Save Changes
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all text-sm"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`${modalBg} rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                                    <Trash2 size={24} />
                                </div>
                                <div>
                                    <h3 className={`text-lg font-bold ${textColor}`}>Delete Environment</h3>
                                    <p className={`text-sm ${subTextColor}`}>This action cannot be undone.</p>
                                </div>
                            </div>
                            <p className={`text-sm ${textColor} mb-6`}>
                                Are you sure you want to delete <strong className="text-red-500">"{selectedEnv?.name}"</strong>? All variables and secrets in this environment will be permanently removed.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteEnvironment}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-red-900/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
