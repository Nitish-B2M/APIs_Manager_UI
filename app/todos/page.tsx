"use client";

import { useEffect, useState } from 'react';
import TodoBoard from './components/TodoBoard';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { DemoOverlay } from '../components/DemoOverlay';

export default function TodosPage() {
    const { isLoggedIn } = useAuth();

    return (
        <div className="relative flex min-h-[calc(100vh-64px)] flex-col bg-[#FFFCE8] text-[#2D3436] font-sans overflow-x-hidden">
            {/* Background Doodles */}
            <div className="absolute top-20 left-10 opacity-20 pointer-events-none select-none">
                <svg width="200" height="120" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse">
                    <path d="M40 80C20 80 10 65 10 50C10 35 25 20 45 20C55 10 75 5 95 15C110 5 135 10 145 25C170 20 190 35 190 55C190 75 175 90 155 90H40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>
            <div className="absolute bottom-40 right-10 opacity-20 pointer-events-none select-none">
                <svg width="150" height="100" viewBox="0 0 150 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse delay-700">
                    <path d="M30 60C15 60 8 49 8 38C8 26 19 15 34 15C41 8 56 4 71 11C82 4 101 8 109 19C128 15 142 26 142 41C142 56 131 68 116 68H30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>

            {!isLoggedIn && (
                <DemoOverlay
                    title="Task Board"
                    description="Organize your sprints with high-priority boards and seamless task management."
                />
            )}

            <div className={`flex-1 overflow-hidden p-8 transition-all duration-300 ${!isLoggedIn ? 'blur-md pointer-events-none opacity-50' : ''}`}>
                <div className="mx-auto h-full max-w-7xl relative z-10">
                    <div className="text-center my-16 relative">
                        {/* Doodle Sparkles */}
                        <div className="absolute -top-6 left-1/2 -translate-x-[220px] text-[#2D3436] opacity-30">
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 5V10M20 30V35M5 20H10M30 20H35M10 10L14 14M26 26L30 30M10 30L14 26M26 14L30 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                        </div>
                        <div className="absolute -top-10 right-1/2 translate-x-[240px] text-[#2D3436] opacity-30 rotate-12">
                            <svg width="50" height="50" viewBox="0 0 50 50" fill="none"><path d="M10 10Q25 5 40 10M10 40Q25 45 40 40M10 10Q5 25 10 40M40 10Q45 25 40 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                        </div>

                        <h1 className="text-4xl md:text-7xl font-black text-[#2D3436] mb-4 relative inline-block">
                            Playful Builder's <span className="relative">Task Board
                                <div className="absolute -inset-1 bg-[#D1E8FF] -z-10 rounded-lg rotate-[-1deg] border-[2.5px] border-[#2D3436]"></div>
                            </span>
                        </h1>
                        <p className="text-lg font-bold text-[#2D3436] opacity-80 mt-2">Unlock Your Creativity! Craft Awesome Projects Here!</p>
                    </div>

                    <TodoBoard />
                </div>
            </div>
        </div>
    );
}
