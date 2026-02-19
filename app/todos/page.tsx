"use client";

import { useEffect, useState } from 'react';
import TodoBoard from './components/TodoBoard';
import { Toaster } from 'react-hot-toast';

export default function TodosPage() {
    return (
        <div className="flex min-h-[calc(100vh-64px)] flex-col bg-gray-50 dark:bg-gray-900">
            <div className="flex-1 overflow-hidden p-6">
                <div className="mx-auto h-full max-w-7xl">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your daily tasks and projects</p>
                        </div>
                    </div>

                    <TodoBoard />
                </div>
            </div>
        </div>
    );
}
