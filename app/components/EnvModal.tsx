'use client';
import { X, Plus, Trash2, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface EnvModalProps {
    isOpen: boolean;
    onClose: () => void;
    variables: Record<string, string>;
    setVariables: (vars: Record<string, string>) => void;
}

export default function EnvModal({ isOpen, onClose, variables, setVariables }: EnvModalProps) {
    const { theme } = useTheme();
    
    if (!isOpen) return null;

    const handleKeyChange = (oldKey: string, newKey: string, value: string) => {
        const sanitizedKey = newKey.replace(/[{}]/g, '');
        const newVars = { ...variables };
        delete newVars[oldKey];
        newVars[sanitizedKey] = value;
        setVariables(newVars);
    };

    const handleValueChange = (key: string, newValue: string) => {
        setVariables({ ...variables, [key]: newValue });
    };

    const addVariable = () => {
        setVariables({ ...variables, [`new_var_${Object.keys(variables).length}`]: '' });
    };

    const deleteVariable = (key: string) => {
        const newVars = { ...variables };
        delete newVars[key];
        setVariables(newVars);
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className={`${modalBg} rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                            <Settings size={18} className="text-indigo-500" />
                        </div>
                        <h2 className={`text-lg font-bold ${textColor}`}>Environment Variables</h2>
                    </div>
                    <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${closeBtn}`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <p className={`text-sm ${subTextColor} mb-4`}>
                        Define variables to be replaced in your requests. Enter the key name (e.g. <code className={codeStyle}>baseUrl</code>) and refer to it as <code className={codeStyle}>{`{{baseUrl}}`}</code>.
                    </p>

                    {/* Variables Table Header */}
                    {Object.keys(variables).length > 0 && (
                        <div className={`flex gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider ${subTextColor}`}>
                            <span className="flex-1 px-3">Variable Key</span>
                            <span className="flex-1 px-3">Value</span>
                            <span className="w-10"></span>
                        </div>
                    )}

                    <div className="space-y-2">
                        {Object.entries(variables).map(([key, value], idx) => (
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

                    {Object.keys(variables).length === 0 && (
                        <div className={`text-center py-10 ${subTextColor} border-2 border-dashed rounded-xl ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                            <Settings size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No variables defined yet.</p>
                            <p className="text-xs opacity-60 mt-1">Click below to add your first variable</p>
                        </div>
                    )}

                    <button
                        onClick={addVariable}
                        className={`mt-4 flex items-center gap-2 font-medium text-sm px-3 py-2 rounded-lg transition-colors ${
                            theme === 'dark' 
                                ? 'text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/30' 
                                : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
                        }`}
                    >
                        <Plus size={16} /> Add Variable
                    </button>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${footerBg} flex justify-end`}>
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg transition-colors text-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
