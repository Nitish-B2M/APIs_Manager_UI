'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, CheckSquare, StickyNote, Calendar, GitBranch, Github, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * MobileNav — hamburger menu for small screens.
 * Renders as a slide-out drawer overlay.
 */
export default function MobileNav() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const { isLoggedIn, user } = useAuth();

    if (!isLoggedIn) return null;

    const links = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/todos', icon: CheckSquare, label: 'Tasks' },
        { href: '/modules/notes', icon: StickyNote, label: 'Notes' },
        { href: '/scheduler', icon: Calendar, label: 'Scheduler' },
        { href: '/git-manager', icon: GitBranch, label: 'Git' },
        { href: '/github-accounts', icon: Github, label: 'GitHub' },
        ...(user?.isAdmin ? [{ href: '/admin/templates', icon: Shield, label: 'Admin' }] : []),
    ];

    return (
        <>
            {/* Hamburger button — only visible on mobile */}
            <button
                onClick={() => setOpen(true)}
                className="md:hidden p-2 rounded-lg text-muted hover:text-heading hover:bg-white/10 transition-all"
                aria-label="Open navigation menu"
            >
                <Menu size={20} />
            </button>

            {/* Overlay */}
            {open && (
                <div className="fixed inset-0 z-[100] md:hidden" onClick={() => setOpen(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Drawer */}
                    <nav
                        className="absolute left-0 top-0 h-full w-64 bg-[var(--bg-primary)] border-r border-[var(--border-primary)] p-4 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-lg font-bold bg-gradient-to-r from-[#249d9f] to-[#249d9f] bg-clip-text text-transparent">DevManus</span>
                            <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-muted hover:text-heading">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-1">
                            {links.map(link => {
                                const Icon = link.icon;
                                const active = pathname === link.href || pathname.startsWith(link.href + '/');
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                            active
                                                ? 'bg-[#249d9f]/10 text-[#2ec4c7] border-l-2 border-[#249d9f]'
                                                : 'text-muted hover:text-heading hover:bg-white/5'
                                        }`}
                                    >
                                        <Icon size={16} />
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>

                        {user && (
                            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-xs font-semibold truncate">{user.name || user.email}</p>
                                <p className="text-[10px] text-muted truncate">{user.email}</p>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </>
    );
}
