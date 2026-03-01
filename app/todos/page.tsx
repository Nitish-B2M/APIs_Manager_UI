"use client";

import { useEffect, useState } from 'react';
import TodoBoard from './components/TodoBoard';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { DemoOverlay } from '../components/DemoOverlay';

export default function TodosPage() {
    const { isLoggedIn } = useAuth();

    return (
        <div className="relative flex min-h-[calc(100vh-64px)] flex-col bg-[#0B0A0F] text-white">
            {!isLoggedIn && (
                <DemoOverlay
                    title="Task Board"
                    description="Organize your sprints with high-priority boards and seamless task management."
                />
            )}

            <div className={`flex-1 overflow-hidden p-8 transition-all duration-300 ${!isLoggedIn ? 'blur-md pointer-events-none opacity-50' : ''}`}>
                <div className="mx-auto h-full max-w-7xl">
                    <div className="mb-10 flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-white mb-2">
                                Project <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Tasks</span>
                            </h1>
                            <p className="text-sm font-medium text-slate-400 tracking-tight">Streamline your workflow with high-priority activity tracking.</p>
                        </div>
                    </div>

                    <TodoBoard />
                </div>
            </div>
        </div>
    );
}
