'use client';

import React from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    noteTitle: string;
    onClose: () => void;
    onConfirm: () => void;
}

export default function DeleteConfirmationModal({ isOpen, noteTitle, onClose, onConfirm }: DeleteConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="notes-modal-backdrop">
            <div className="notes-modal">
                <div className="notes-modal-header">
                    <h3 className="flex items-center gap-2" style={{ color: 'var(--notes-danger)', fontWeight: 600 }}>
                        <AlertTriangle size={20} />
                        Delete Note
                    </h3>
                    <button className="notes-icon-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>
                <div className="notes-modal-body">
                    <p style={{ marginBottom: '16px', color: 'var(--notes-text)' }}>
                        Are you sure you want to delete <strong style={{ color: 'var(--notes-text)' }}>"{noteTitle}"</strong>?
                    </p>
                    <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: 'var(--notes-surface)',
                        border: '1px solid var(--notes-border)',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: 'var(--notes-text-secondary)'
                    }}>
                        This note will be moved to trash and can be recovered by an administrator.
                    </div>
                </div>
                <div className="notes-modal-footer">
                    <button className="notes-btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="notes-btn-danger"
                        onClick={onConfirm}
                        style={{
                            background: 'var(--notes-danger)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
