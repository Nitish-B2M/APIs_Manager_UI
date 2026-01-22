'use client';
import { X, Plus, Trash2 } from 'lucide-react';

interface EnvModalProps {
    isOpen: boolean;
    onClose: () => void;
    variables: Record<string, string>;
    setVariables: (vars: Record<string, string>) => void;
}

export default function EnvModal({ isOpen, onClose, variables, setVariables }: EnvModalProps) {
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">Environment Variables</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-gray-600 mb-4">
                        Define variables to be replaced in your requests. Enter the key name (e.g. <code>baseUrl</code>) and refer to it as <code>{`{{baseUrl}}`}</code>.
                    </p>

                    <div className="space-y-3">
                        {Object.entries(variables).map(([key, value], idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input
                                    value={key}
                                    onChange={(e) => handleKeyChange(key, e.target.value, value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                                    placeholder="Variable Key"
                                />
                                <input
                                    value={value}
                                    onChange={(e) => handleValueChange(key, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    placeholder="Value"
                                />
                                <button
                                    onClick={() => deleteVariable(key)}
                                    className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {Object.keys(variables).length === 0 && (
                        <div className="text-center py-8 text-gray-400 italic">
                            No variables defined.
                        </div>
                    )}

                    <button
                        onClick={addVariable}
                        className="mt-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                        <Plus size={16} /> Add Variable
                    </button>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium shadow-sm transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
