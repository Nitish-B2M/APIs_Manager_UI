'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Settings, Users, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard, TextGradient } from '../../components/UIComponents';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const navItems = [
        { label: 'Overview', href: '/admin', icon: <LayoutDashboard size={18} /> },
        { label: 'Templates', href: '/admin/templates', icon: <FileText size={18} /> },
        { label: 'Contacts & Inquiries', href: '/admin/contacts', icon: <MessageSquare size={18} /> },
        { label: 'Users', href: '/admin/users', icon: <Users size={18} /> },
        { label: 'Settings', href: '/admin/settings', icon: <Settings size={18} /> },
    ];

    return (
        <div className="flex min-h-[calc(100vh-64px)] bg-background">
            {/* Sidebar */}
            <aside className={`relative transition-all duration-300 border-r border-glass-border bg-black/10 dark:bg-white/[0.02] backdrop-blur-xl flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="flex items-center justify-between p-4 border-b border-glass-border h-16">
                    {isSidebarOpen && (
                        <div className="text-sm font-bold tracking-widest uppercase text-muted">
                            Admin <TextGradient>Portal</TextGradient>
                        </div>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-foreground transition-colors mx-auto"
                    >
                        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-muted hover:text-foreground hover:bg-white/5'}`}
                                title={!isSidebarOpen ? item.label : undefined}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                )}
                                <div className={`${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-foreground'} transition-colors ${!isSidebarOpen && 'mx-auto'}`}>
                                    {item.icon}
                                </div>
                                {isSidebarOpen && (
                                    <span className="truncate">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] pointer-events-none rounded-full" />
                {children}
            </main>
        </div>
    );
}
