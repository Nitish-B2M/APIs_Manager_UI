'use client';
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Sparkles, BookOpen, Zap, Code, GitBranch, Users } from 'lucide-react';

interface OnboardingStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    action?: { label: string; href: string };
}

const STEPS: OnboardingStep[] = [
    {
        title: 'Create Your First Collection',
        description: 'Collections organize your API endpoints. Click "+ New Collection" on the dashboard to get started.',
        icon: <BookOpen size={24} />,
        action: { label: 'Go to Dashboard', href: '/dashboard' },
    },
    {
        title: 'Add API Requests',
        description: 'Inside a collection, add requests with HTTP methods, headers, body, and test assertions.',
        icon: <Zap size={24} />,
    },
    {
        title: 'Generate Code Snippets',
        description: 'Click the "Code" tab to auto-generate curl, JavaScript, Python, Go, and PHP snippets.',
        icon: <Code size={24} />,
    },
    {
        title: 'Collaborate with Your Team',
        description: 'Share collections with team members. Set roles: Viewer, Editor, or Admin.',
        icon: <Users size={24} />,
    },
    {
        title: 'Connect GitHub',
        description: 'Link your GitHub accounts to switch git identities when pushing code.',
        icon: <GitBranch size={24} />,
        action: { label: 'Connect GitHub', href: '/github-accounts' },
    },
];

const STORAGE_KEY = 'devmanus_onboarding_completed';

/**
 * Onboarding — guided tour for new users.
 * Shows on first login, can be dismissed or completed.
 */
export default function Onboarding() {
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const completed = localStorage.getItem(STORAGE_KEY);
        if (!completed) setVisible(true);
    }, []);

    const dismiss = () => {
        setVisible(false);
        localStorage.setItem(STORAGE_KEY, 'true');
    };

    const nextStep = () => {
        if (step < STEPS.length - 1) setStep(step + 1);
        else dismiss();
    };

    if (!visible) return null;

    const current = STEPS[step];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

            {/* Card */}
            <div className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl overflow-hidden">
                {/* Progress */}
                <div className="flex gap-1 p-3">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-[#249d9f]' : 'bg-white/10'}`}
                        />
                    ))}
                </div>

                {/* Close */}
                <button onClick={dismiss} className="absolute top-3 right-3 p-1 rounded-lg text-muted hover:text-heading hover:bg-white/10 transition-all">
                    <X size={16} />
                </button>

                {/* Content */}
                <div className="px-8 pb-8 pt-4 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#249d9f] to-[#1a7a7c] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#249d9f]/30">
                        {current.icon}
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Sparkles size={14} className="text-amber-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Step {step + 1} of {STEPS.length}</span>
                    </div>

                    <h2 className="text-xl font-bold mb-2">{current.title}</h2>
                    <p className="text-sm text-muted mb-6 leading-relaxed">{current.description}</p>

                    <div className="flex gap-3">
                        <button
                            onClick={dismiss}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-heading border border-white/10 hover:bg-white/5 transition-all"
                        >
                            Skip Tour
                        </button>
                        <button
                            onClick={nextStep}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#1a7a7c] hover:bg-[#1a7a7c] text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#249d9f]/20"
                        >
                            {step < STEPS.length - 1 ? 'Next' : 'Get Started'} <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Reset onboarding — allows user to see the tour again.
 */
export function resetOnboarding() {
    localStorage.removeItem(STORAGE_KEY);
}
