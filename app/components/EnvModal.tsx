'use client';
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings, Check, ChevronDown, Edit3, Globe } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useEnvironments } from '../../hooks/useEnvironments';
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
    const {
        environments,
        activeEnvironment,
        createEnvironment,
        updateEnvironment,
        deleteEnvironment,
        setActiveEnvironment,
        isLoading
    } = useEnvironments({ documentationId, enabled: isOpen && !!documentationId });

    // Local state for editing
    const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
    const [editingVariables, setEditingVariables] = useState<Record<string, string>>({});
    const [editingName, setEditingName] = useState('');
    const [showEnvDropdown, setShowEnvDropdown] = useState(false);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newEnvName, setNewEnvName] = useState('');

    // Sync with active environment
    useEffect(() => {
        if (activeEnvironment && !selectedEnvId) {
            setSelectedEnvId(activeEnvironment.id);
            setEditingVariables(activeEnvironment.variables || {});
            setEditingName(activeEnvironment.name);
        }
    }, [activeEnvironment, selectedEnvId]);



    const selectedEnv = environments.find(e => e.id === selectedEnvId);

    useEffect(() => {
        if (selectedEnv) {
            setEditingVariables(selectedEnv.variables || {});
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
    };

    const handleValueChange = (key: string, newValue: string) => {
        setEditingVariables({ ...editingVariables, [key]: newValue });
    };

    const addVariable = () => {
        setEditingVariables({ ...editingVariables, [`new_var_${Object.keys(editingVariables).length}`]: '' });
    };

    const deleteVariable = (key: string) => {
        const newVars = { ...editingVariables };
        delete newVars[key];
        setEditingVariables(newVars);
    };

    const handleSaveEnvironment = async () => {
        if (selectedEnvId && selectedEnv) {
            await updateEnvironment(selectedEnvId, {
                name: editingName,
                variables: editingVariables
            });
            // Note: We don't call legacySetVariables here because the 
            // page.tsx useEffect will catch the activeEnvironment update 
            // from the server and sync automatically with isCollectionDirty: false
        }
    };

    const handleCreateEnvironment = async () => {
        if (!newEnvName.trim()) return;
        const result = await createEnvironment({
            name: newEnvName.trim(),
            variables: {},
            isActive: environments.length === 0 // Make active if first environment
        });
        setNewEnvName('');
        setIsCreatingNew(false);
        if (result?.data) {
            setSelectedEnvId(result.data.id);
        }
    };

    const handleDeleteEnvironment = async () => {
        if (!selectedEnvId) return;
        if (!confirm(`Delete environment "${selectedEnv?.name}"?`)) return;

        await deleteEnvironment(selectedEnvId);
        setSelectedEnvId(null);
        setEditingVariables({});
        setEditingName('');
    };

    const handleSetActive = async (envId: string) => {
        await setActiveEnvironment(envId);
        setShowEnvDropdown(false);
    };

    // Theme-aware styles
    const modalBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const headerBg = theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';
    const footerBg = theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-800';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    const inputBg = theme === 'dark'
        ? 'bg-gray-900 border-gray-600 text-gray-100 focus:ring-indigo-500 focus:border-indigo-500'
        : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500';
    const codeStyle = theme === 'dark'
        ? 'bg-gray-900 text-indigo-400 px-1 rounded'
        : 'bg-gray-100 text-indigo-600 px-1 rounded';
    const deleteBtn = theme === 'dark'
        ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
        : 'text-gray-400 hover:text-red-500 hover:bg-red-50';
    const closeBtn = theme === 'dark'
        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200';
    const dropdownBg = theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200';
    const hoverBg = theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className={`${modalBg} rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                            <Globe size={18} className="text-indigo-500" />
                        </div>
                        <h2 className={`text-lg font-bold ${textColor}`}>Environments</h2>
                    </div>
                    <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${closeBtn}`}>
                        <X size={20} />
                    </button>
                </div>

                <div className="flex h-[60vh]">
                    {/* Left Sidebar - Environment List */}
                    <div className={`w-56 border-r ${theme === 'dark' ? 'border-gray-700 bg-gray-850' : 'border-gray-200 bg-gray-50'} flex flex-col`}>
                        <div className="p-3 flex-1 overflow-y-auto">
                            <div className="space-y-1">
                                {environments.map((env) => (
                                    <button
                                        key={env.id}
                                        onClick={() => {
                                            setSelectedEnvId(env.id);
                                            setEditingVariables(env.variables || {});
                                            setEditingName(env.name);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${selectedEnvId === env.id
                                            ? theme === 'dark' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                                            : `${textColor} ${hoverBg}`
                                            }`}
                                    >
                                        <span className="flex-1 truncate">{env.name}</span>
                                        {env.isActive && (
                                            <span className="w-2 h-2 rounded-full bg-green-500" title="Active" />
                                        )}
                                    </button>
                                ))}

                                {environments.length === 0 && !isLoading && (
                                    <div className={`text-center py-6 ${subTextColor} text-xs`}>
                                        <Globe size={24} className="mx-auto mb-2 opacity-30" />
                                        <p>No environments yet</p>
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
                                        placeholder="Environment name..."
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
                                            className="flex-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg"
                                        >
                                            Create
                                        </button>
                                        <button
                                            onClick={() => setIsCreatingNew(false)}
                                            className={`px-2 py-1 text-xs rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsCreatingNew(true)}
                                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${theme === 'dark'
                                        ? 'text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/30'
                                        : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
                                        }`}
                                >
                                    <Plus size={14} /> New Environment
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Variables Editor */}
                    <div className="flex-1 flex flex-col">
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
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!selectedEnv.isActive && (
                                            <button
                                                onClick={() => handleSetActive(selectedEnv.id)}
                                                className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${theme === 'dark'
                                                    ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                    }`}
                                            >
                                                <Check size={12} /> Set Active
                                            </button>
                                        )}
                                        <button
                                            onClick={handleDeleteEnvironment}
                                            className={`p-1.5 rounded-lg ${deleteBtn}`}
                                            title="Delete environment"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Variables */}
                                <div className="flex-1 p-4 overflow-y-auto">
                                    <p className={`text-sm ${subTextColor} mb-4`}>
                                        Define variables for this environment. Use <code className={codeStyle}>{`{{varName}}`}</code> in your requests.
                                    </p>

                                    {Object.keys(editingVariables).length > 0 && (
                                        <div className={`flex gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider ${subTextColor}`}>
                                            <span className="flex-1 px-3">Variable Key</span>
                                            <span className="flex-1 px-3">Value</span>
                                            <span className="w-10"></span>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {Object.entries(editingVariables).map(([key, value], idx) => (
                                            <div key={idx} className="flex gap-2 items-center group">
                                                <input
                                                    value={key}
                                                    onChange={(e) => handleKeyChange(key, e.target.value, value)}
                                                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm font-mono transition-colors ${inputBg}`}
                                                    placeholder="Variable Key"
                                                />
                                                <input
                                                    value={value}
                                                    onChange={(e) => handleValueChange(key, e.target.value)}
                                                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm transition-colors ${inputBg}`}
                                                    placeholder="Value"
                                                />
                                                <button
                                                    onClick={() => deleteVariable(key)}
                                                    className={`p-2 rounded-lg transition-colors ${deleteBtn}`}
                                                    title="Delete variable"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {Object.keys(editingVariables).length === 0 && (
                                        <div className={`text-center py-10 ${subTextColor} border-2 border-dashed rounded-xl ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                            <Settings size={32} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">No variables defined yet.</p>
                                            <p className="text-xs opacity-60 mt-1">Click below to add your first variable</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={addVariable}
                                        className={`mt-4 flex items-center gap-2 font-medium text-sm px-3 py-2 rounded-lg transition-colors ${theme === 'dark'
                                            ? 'text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/30'
                                            : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
                                            }`}
                                    >
                                        <Plus size={16} /> Add Variable
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className={`flex-1 flex items-center justify-center ${subTextColor}`}>
                                <div className="text-center">
                                    <Globe size={48} className="mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium">Select an environment</p>
                                    <p className="text-sm opacity-60 mt-1">or create a new one to get started</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${footerBg} flex justify-between items-center`}>
                    <div className={`text-xs ${subTextColor}`}>
                        {activeEnvironment && (
                            <span>Active: <strong className={textColor}>{activeEnvironment.name}</strong></span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {selectedEnv && (
                            <button
                                onClick={handleSaveEnvironment}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-lg transition-colors text-sm"
                            >
                                Save Changes
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg transition-colors text-sm"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
