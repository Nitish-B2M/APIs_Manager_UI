'use client';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight } from 'lucide-react';
import { PremiumButton, TextGradient } from '../../components/UIComponents';

export const DemoOverlay = ({ title, description }: { title: string, description: string }) => {
    const router = useRouter();

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-background/40 backdrop-blur-xl">
            <div className="max-w-md w-full bg-black/60 dark:bg-white/10 border border-glass-border p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden group">
                {/* Ambience */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                <div className="w-16 h-16 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner relative z-10">
                    <Lock size={28} className="text-slate-300" />
                </div>

                <h2 className="text-3xl font-black text-heading mb-3 relative z-10">
                    Unlock <TextGradient>{title}</TextGradient>
                </h2>

                <p className="text-muted text-sm leading-relaxed mb-8 relative z-10 font-medium">
                    {description} Sign in or create a free DevManus account to get full access to your personalized workspace.
                </p>

                <div className="space-y-3 relative z-10">
                    <PremiumButton onClick={() => router.push('/login')} className="w-full py-4 text-sm group flex justify-center items-center gap-2">
                        Sign In Now <ArrowRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </PremiumButton>
                    <button onClick={() => router.push('/register')} className="w-full py-4 text-sm font-bold text-muted hover:text-white transition-colors">
                        Create Free Account
                    </button>
                </div>
            </div>
        </div>
    );
};
