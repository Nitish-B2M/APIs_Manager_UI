'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ClipboardList, LayoutDashboard, Database, Sun, Moon, CheckSquare, StickyNote, Shield, Beaker, Search, Command, User, Calendar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useBetaMode } from '../../context/BetaModeContext';
import toast from 'react-hot-toast';
import { FlipClock } from './FlipClock';
import { GlassCard, TextGradient, PremiumButton } from '../../components/UIComponents';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { isLoggedIn, logout, user } = useAuth();
    const { isBeta } = useBetaMode();

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
    };

    return (
        <header className="sticky top-0 z-50 transition-all duration-300 border-b border-glass-border bg-background/50 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-2 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="text-xl font-bold transition-all flex items-center gap-2.5 hover:opacity-90 group relative">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl rotate-45 opacity-20 blur-md group-hover:opacity-50 transition-all duration-500 group-hover:rotate-90" />
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)] relative z-10 overflow-hidden transition-transform duration-300 group-hover:scale-110">
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30 mix-blend-overlay"></div>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white relative z-20">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                    <path d="M2 17l10 5 10-5" />
                                    <path d="M2 12l10 5 10-5" />
                                </svg>
                            </div>
                        </div>
                        <TextGradient className="text-2xl tracking-tighter">DevManus</TextGradient>
                        {isBeta && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-400 shadow-sm animate-pulse">
                                <Beaker size={10} /> Beta
                            </span>
                        )}
                    </Link>
                    {isLoggedIn && (
                        <nav className="hidden md:flex gap-4 text-sm font-medium">
                            <NavLink href="/dashboard" icon={<LayoutDashboard size={14} />} active={pathname === '/dashboard'} label="Dashboard" />
                            <NavLink href="/todos" icon={<CheckSquare size={14} />} active={pathname === '/todos'} label="Tasks" />
                            <NavLink href="/modules/notes" icon={<StickyNote size={14} />} active={pathname === '/modules/notes'} label="Notes" />
                            <NavLink href="/scheduler" icon={<Calendar size={14} />} active={pathname === '/scheduler'} label="Scheduler" />
                            <NavLink href="/changelog" icon={<Calendar size={14} />} active={pathname === '/changelog'} label="Changelog" />
                            {user?.isAdmin && (
                                <NavLink href="/admin/templates" icon={<Shield size={14} />} active={pathname.startsWith('/admin')} label="Admin" />
                            )}
                        </nav>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {isBeta && user?.settings?.showFlipClock && (
                        <FlipClock />
                    )}

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-xl transition-all hover:bg-white/5 text-secondary hover:text-white"
                        title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                    >
                        {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-400" />}
                    </button>

                    {isLoggedIn ? (
                        <div className="flex items-center gap-3">
                            <Link href="/profile" className="flex items-center gap-2 group p-1 pr-3 rounded-full bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white/10 shadow-inner flex items-center justify-center overflow-hidden">
                                    <User size={18} className="text-white" />
                                </div>
                                <span className="text-xs font-semibold text-secondary group-hover:text-white transition-colors">{user?.name || 'Profile'}</span>
                            </Link>
                            {/* <Link href="/#contact" className="hidden md:block text-muted hover:text-foreground transition-colors text-xs font-bold tracking-wider mr-2">
                                Contact Us
                            </Link> */}
                            <button
                                onClick={handleLogout}
                                className="p-2 text-secondary hover:text-red-400 hover:bg-red-400/10 transition-all rounded-xl"
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link href="/#contact" className="hidden md:block text-muted hover:text-foreground transition-colors text-xs font-bold tracking-wider">
                                Contact Us
                            </Link>
                            <PremiumButton onClick={() => router.push('/login')} className="text-xs px-4 py-1.5">
                                Login
                            </PremiumButton>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function NavLink({ href, icon, active, label }: { href: string, icon: React.ReactNode, active: boolean, label: string }) {
    return (
        <Link
            href={href}
            className={twMerge(
                "flex items-center gap-2 transition-all duration-300 text-muted hover:text-foreground relative py-1",
                active && "text-heading font-bold"
            )}
        >
            {icon}
            {label}
            {active && (
                <span className="absolute -bottom-[21px] left-0 w-full h-0.5 bg-gradient-premium rounded-full shadow-[0_0_8px_rgba(140,43,238,0.5)]" />
            )}
        </Link>
    );
}

const twMerge = (...args: any[]) => args.filter(Boolean).join(' ');
