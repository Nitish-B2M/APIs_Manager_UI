'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Shield, Globe } from 'lucide-react';
import { useEnvironments } from '@/hooks/useEnvironments';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';

interface SaveVariableModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedValue: string;
    documentationId: string;
}

export default function SaveVariableModal({
    isOpen,
    onClose,
    selectedValue,
    documentationId,
}: SaveVariableModalProps) {
    const { theme } = useTheme();
    const { environments, activeEnvironment, updateEnvironment, isUpdating } = useEnvironments({ documentationId });
    const [varName, setVarName] = useState('');
    const [selectedEnvId, setSelectedEnvId] = useState<string>('');

    useEffect(() => {
        if (activeEnvironment) {
            setSelectedEnvId(activeEnvironment.id);
        } else if (environments.length > 0) {
            setSelectedEnvId(environments[0].id);
        }
    }, [activeEnvironment, environments, isOpen]);

    useEffect(() => {
        if (isOpen) {
            // Suggest a generic name or keep empty
            setVarName('');
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!varName.trim()) {
            toast.error('Please enter a variable name');
            return;
        }

        if (!selectedEnvId) {
            toast.error('Please select an environment');
            return;
        }

        const env = environments.find(e => e.id === selectedEnvId);
        if (!env) return;

        const updatedVariables = {
            ...(env.variables || {}),
            [varName.trim()]: selectedValue
        };

        try {
            await updateEnvironment(selectedEnvId, { variables: updatedVariables });
            onClose();
        } catch (e) {
            // Error handled by hook
        }
    };

    if (!isOpen) return null;

    const secondaryBg = theme === 'dark' ? 'bg-gray-900' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-800' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const inputBg = theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={`${secondaryBg} border ${borderCol} rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`px-6 py-4 border-b ${borderCol} flex justify-between items-center bg-opacity-50`}>
                    <h3 className={`font-bold text-lg ${textColor} flex items-center gap-2`}>
                        <Save size={20} className="text-indigo-500" />
                        Save as Variable
                    </h3>
                    <button onClick={onClose} className={`p-2 ${subTextColor} hover:bg-gray-800 rounded-lg transition-colors`}>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className={`block text-[10px] font-bold ${subTextColor} uppercase tracking-wider mb-1.5`}>
                            Selected Value
                        </label>
                        <div className={`px-3 py-2 rounded-lg border ${borderCol} ${inputBg} font-mono text-xs ${textColor} break-all max-h-24 overflow-y-auto`}>
                            {selectedValue}
                        </div>
                    </div>

                    <div>
                        <label className={`block text-[10px] font-bold ${subTextColor} uppercase tracking-wider mb-1.5`}>
                            Variable Name
                        </label>
                        <input
                            type="text"
                            value={varName}
                            onChange={(e) => setVarName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                            placeholder="e.g. auth_token"
                            autoFocus
                            className={`w-full px-4 py-2 rounded-lg border ${borderCol} ${inputBg} ${textColor} outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm`}
                        />
                        <p className={`mt-1.5 text-[10px] ${subTextColor}`}>
                            Only use letters, numbers, and underscores.
                        </p>
                    </div>

                    <div>
                        <label className={`block text-[10px] font-bold ${subTextColor} uppercase tracking-wider mb-1.5`}>
                            Environment
                        </label>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                            {environments.length === 0 && (
                                <p className={`text-[11px] ${subTextColor} italic py-2`}>No environments found. Please create one first.</p>
                            )}
                            {environments.map((env) => (
                                <div
                                    key={env.id}
                                    onClick={() => setSelectedEnvId(env.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedEnvId === env.id
                                            ? 'bg-indigo-600/10 border-indigo-500 shadow-sm'
                                            : `border-transparent ${hoverBg}`
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${env.isActive ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                            {env.isActive ? <Globe size={16} /> : <Shield size={16} />}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${textColor}`}>{env.name}</p>
                                            <p className={`text-[10px] ${subTextColor}`}>{Object.keys(env.variables || {}).length} variables</p>
                                        </div>
                                    </div>
                                    {selectedEnvId === env.id && (
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={`px-6 py-4 border-t ${borderCol} flex gap-3 bg-opacity-50`}>
                    <button
                        onClick={onClose}
                        className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold ${textColor} border ${borderCol} hover:bg-gray-800 transition-all`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isUpdating || !varName.trim() || !selectedEnvId}
                        className="flex-1 px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isUpdating ? 'Saving...' : 'Save Variable'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const hoverBg = 'hover:bg-gray-800/50';
