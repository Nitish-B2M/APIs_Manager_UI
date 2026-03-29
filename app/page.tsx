'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
    ArrowRight, ArrowUpRight, Terminal, CheckSquare, StickyNote, CalendarClock,
    Code2, GitBranch, Shield, Zap, Globe, Monitor, Users, Layers,
    Search, FileText,
} from 'lucide-react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function Home() {
    const { isLoggedIn } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.contact.submit(formData);
            toast.success('Message sent successfully.');
            setFormData({ name: '', email: '', message: '' });
        } catch { toast.error('Failed to send. Please try again.'); }
        finally { setIsSubmitting(false); }
    };

    return (
        <main className="min-h-screen bg-[#09090b] text-white overflow-hidden">

            {/* ── HERO ──────────────────────────────────────────── */}
            <section className="relative min-h-[90vh] flex items-center justify-center px-6">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#249d9f 0%,transparent 70%)' }} />

                <div className="relative z-10 max-w-4xl text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs tracking-widest uppercase mb-10" style={{ color: '#249d9f' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#249d9f] animate-pulse" />
                        Now in v2.0
                    </div>

                    <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-8">
                        Build, Test &<br />
                        <span className="text-gradient">Document</span> APIs<br />
                        <span className="text-[#71717a]">in one place.</span>
                    </h1>

                    <p className="font-serif text-lg md:text-xl text-[#71717a] max-w-2xl mx-auto leading-relaxed mb-12 italic">
                        The modern workspace for developers — API client, documentation generator, task manager, notes, git integration, and team collaboration.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => router.push(isLoggedIn ? '/dashboard' : '/register')} className="px-8 py-4 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: '#249d9f' }}>
                            {isLoggedIn ? 'Open Workspace' : 'Get Started Free'} <ArrowRight size={16} className="inline ml-2" />
                        </button>
                        <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 rounded-xl font-semibold text-sm text-[#a1a1aa] border border-white/10 hover:border-white/20 hover:text-white transition-all">
                            Explore Features
                        </button>
                    </div>
                </div>
            </section>

            {/* ── STATS ─────────────────────────────────────────── */}
            <section className="px-6 py-20 border-t border-white/[0.04]">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
                    {[{ value: '125+', label: 'Features' }, { value: '80+', label: 'API Endpoints' }, { value: '4', label: 'Protocols' }, { value: '105', label: 'Tests Passing' }].map(s => (
                        <div key={s.label} className="text-center">
                            <p className="font-display text-3xl md:text-4xl font-bold mb-1" style={{ color: '#249d9f' }}>{s.value}</p>
                            <p className="text-xs text-[#71717a] tracking-wide uppercase">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── TOP FEATURES ──────────────────────────────────── */}
            <section id="features" className="px-6 py-24 border-t border-white/[0.04]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#249d9f' }}>Platform</p>
                        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">Everything you need to build</h2>
                        <p className="font-serif text-lg text-[#71717a] max-w-xl mx-auto italic">A unified workspace replacing Postman, GitHub Desktop, Notion, and Jira.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: <Terminal size={22} />, title: 'API Client', desc: 'REST, GraphQL, WebSocket, SSE — send requests, view responses, run assertions, generate code snippets.' },
                            { icon: <FileText size={22} />, title: 'Documentation', desc: 'Auto-generate API docs from collections. Export to OpenAPI, Postman, HTML, or Markdown.' },
                            { icon: <Shield size={22} />, title: 'Authentication', desc: 'Bearer, Basic, API Key, OAuth 2.0 (PKCE, Client Credentials). Encrypted secrets at rest.' },
                            { icon: <Monitor size={22} />, title: 'API Monitoring', desc: 'Cron-based health checks. Email + webhook alerts. Response time tracking with heatmaps.' },
                            { icon: <Code2 size={22} />, title: 'Mock Server', desc: 'Conditional mock responses with rules. Simulate delays. Public mock endpoints for frontend teams.' },
                            { icon: <Zap size={22} />, title: 'Test Runner', desc: 'Server-side assertions: status codes, response time, body content, JSON paths. Collection runner with reports.' },
                            { icon: <Users size={22} />, title: 'Team Workspaces', desc: 'Create teams, invite members, assign roles. Real-time presence tracking and threaded comments.' },
                            { icon: <GitBranch size={22} />, title: 'Git Manager', desc: 'Built-in GitHub Desktop alternative — stage, commit, push, pull, branches. Multi-account switching.' },
                            { icon: <Search size={22} />, title: 'Full-Text Search', desc: 'Search across all collections, requests, and notes instantly with PostgreSQL GIN indexes.' },
                        ].map(f => (
                            <div key={f.title} className="group p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-[#249d9f]/20 hover:bg-[#249d9f]/[0.03] transition-all duration-300">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(36,157,159,0.08)', color: '#249d9f' }}>{f.icon}</div>
                                <h3 className="font-display text-base font-semibold mb-2 tracking-tight">{f.title}</h3>
                                <p className="text-sm text-[#71717a] leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── SERVICES ──────────────────────────────────────── */}
            <section className="px-6 py-24 border-t border-white/[0.04]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#249d9f' }}>Services</p>
                        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">Four tools, one workspace</h2>
                        <p className="font-serif text-lg text-[#71717a] max-w-xl mx-auto italic">No more switching between apps. Everything lives together.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { icon: <Terminal size={28} />, title: 'API Studio', sub: 'Test, document, monitor', desc: 'Full HTTP client with environments, folders, assertions, code generation. Import from Postman, Insomnia, HAR, OpenAPI.', link: '/dashboard', bullets: ['Multi-protocol (REST, GraphQL, WS, SSE)', 'Pre/post request scripts', 'Response schema validation', 'Collection snapshots & versioning'] },
                            { icon: <CheckSquare size={28} />, title: 'Task Board', sub: 'Plan, track, ship', desc: 'Kanban board with priorities, due dates, and soft deletes. Link tasks directly to API endpoints or documentation notes.', link: '/todos', bullets: ['Priority levels (low/medium/high)', 'Reference linking to requests', 'Drag-and-drop reordering', 'Soft delete with restore'] },
                            { icon: <StickyNote size={28} />, title: 'Developer Notes', sub: 'Think, write, share', desc: 'Rich-text TipTap editor with markdown, code blocks, fonts, and pinning. Auto-save with tab-based interface.', link: '/modules/notes', bullets: ['Markdown with syntax highlighting', 'Pin important notes', 'Multiple fonts', 'Reference linking'] },
                            { icon: <CalendarClock size={28} />, title: 'Time Scheduler', sub: 'Block, focus, deliver', desc: 'FullCalendar integration with day/week/month views. Tasks, habits, events. AI-powered schedule optimization.', link: '/scheduler', bullets: ['Time blocking visualization', 'Habit tracking', 'Auto-schedule optimizer', 'Drag to create events'] },
                        ].map(svc => (
                            <div key={svc.title} onClick={() => router.push(svc.link)} className="group p-8 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:border-[#249d9f]/20 transition-all duration-300 cursor-pointer">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(36,157,159,0.1)', color: '#249d9f' }}>{svc.icon}</div>
                                    <ArrowUpRight size={16} className="text-[#3f3f46] group-hover:text-[#249d9f] transition-colors" />
                                </div>
                                <h3 className="font-display text-xl font-bold tracking-tight mb-1">{svc.title}</h3>
                                <p className="text-xs uppercase tracking-widest mb-4" style={{ color: '#249d9f' }}>{svc.sub}</p>
                                <p className="text-sm text-[#71717a] leading-relaxed mb-6">{svc.desc}</p>
                                <ul className="space-y-2">
                                    {svc.bullets.map(b => (
                                        <li key={b} className="flex items-center gap-2 text-xs text-[#52525b]">
                                            <span className="w-1 h-1 rounded-full bg-[#249d9f]" />{b}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── MORE FEATURES TAG CLOUD ───────────────────────── */}
            <section className="px-6 py-16 border-t border-white/[0.04]">
                <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-3">
                    {['OAuth 2.0 Flows','Webhook Retry','Tags & Labels','Request Comments','Notifications','Request Templates','AI Documentation','JUnit Export','PWA','Feature Flags','Swagger UI','CI/CD Pipeline','Onboarding Tour','Virtual Scrolling','Gzip Compression','Migration Framework'].map(t => (
                        <span key={t} className="px-3 py-1.5 rounded-full text-[11px] font-medium border border-white/[0.06] text-[#71717a] bg-white/[0.02]">{t}</span>
                    ))}
                </div>
            </section>

            {/* ── ABOUT US ──────────────────────────────────────── */}
            <section id="about" className="px-6 py-24 border-t border-white/[0.04]">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#249d9f' }}>About</p>
                        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-6">Built by developers,<br />for developers</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                        <div>
                            <p className="font-serif text-lg text-[#a1a1aa] leading-relaxed mb-6">
                                DevManus was born from frustration — too many tabs, too many tools, too much context switching. We wanted one workspace that handles API testing, documentation, project management, and version control.
                            </p>
                            <p className="font-serif text-lg text-[#a1a1aa] leading-relaxed mb-8">
                                Today it's a full-stack platform with 125+ features, built with Next.js, Express, PostgreSQL, and TypeScript. Open-source, self-hostable, and extensible.
                            </p>
                            <button onClick={() => router.push(isLoggedIn ? '/dashboard' : '/register')} className="px-6 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: '#249d9f' }}>
                                Try It Free <ArrowRight size={14} className="inline ml-1" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: 'Mission', text: 'Eliminate context switching for engineering teams by unifying essential dev tools into one workspace.' },
                                { label: 'Stack', text: 'Next.js 16, Express.js, PostgreSQL, TypeScript, Electron, TipTap, FullCalendar, Google Gemini AI.' },
                                { label: 'Security', text: 'AES-256 encryption, JWT refresh tokens, RBAC, helmet.js, rate limiting, account lockout.' },
                            ].map(item => (
                                <div key={item.label} className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                                    <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#249d9f' }}>{item.label}</p>
                                    <p className="text-sm text-[#a1a1aa] leading-relaxed">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CONTACT ───────────────────────────────────────── */}
            <section id="contact" className="px-6 py-24 border-t border-white/[0.04]">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#249d9f' }}>Contact</p>
                        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">Get in touch</h2>
                        <p className="font-serif text-base text-[#71717a] italic">Questions, feedback, or partnership inquiries.</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs text-[#71717a] mb-2">Name</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Your name" className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:outline-none focus:border-[#249d9f]/50 transition-colors placeholder:text-[#3f3f46]" />
                            </div>
                            <div>
                                <label className="block text-xs text-[#71717a] mb-2">Email</label>
                                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="you@email.com" className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:outline-none focus:border-[#249d9f]/50 transition-colors placeholder:text-[#3f3f46]" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-[#71717a] mb-2">Message</label>
                            <textarea required rows={5} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="What's on your mind?" className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:outline-none focus:border-[#249d9f]/50 transition-colors resize-none placeholder:text-[#3f3f46]" />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ background: '#249d9f' }}>
                            {isSubmitting ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>
                </div>
            </section>

            {/* ── FOOTER ────────────────────────────────────────── */}
            <footer className="px-6 py-16 border-t border-white/[0.04]">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
                        <div>
                            <h4 className="font-display text-sm font-semibold mb-4">Product</h4>
                            <ul className="space-y-2.5">
                                {['API Client', 'Documentation', 'Monitoring', 'Mock Server'].map(l => (<li key={l}><Link href="/dashboard" className="text-sm text-[#52525b] hover:text-[#249d9f] transition-colors">{l}</Link></li>))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-display text-sm font-semibold mb-4">Tools</h4>
                            <ul className="space-y-2.5">
                                {['Task Board', 'Notes', 'Scheduler', 'Git Manager'].map(l => (<li key={l}><Link href="/dashboard" className="text-sm text-[#52525b] hover:text-[#249d9f] transition-colors">{l}</Link></li>))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-display text-sm font-semibold mb-4">Developers</h4>
                            <ul className="space-y-2.5">
                                {['API Docs', 'Swagger UI', 'GitHub', 'Changelog'].map(l => (<li key={l}><Link href="/dashboard" className="text-sm text-[#52525b] hover:text-[#249d9f] transition-colors">{l}</Link></li>))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-display text-sm font-semibold mb-4">Company</h4>
                            <ul className="space-y-2.5">
                                <li><a href="#about" className="text-sm text-[#52525b] hover:text-[#249d9f] transition-colors">About</a></li>
                                <li><a href="#contact" className="text-sm text-[#52525b] hover:text-[#249d9f] transition-colors">Contact</a></li>
                                <li><Link href="/admin/features-guide" className="text-sm text-[#52525b] hover:text-[#249d9f] transition-colors">Features Guide</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/[0.04]">
                        <div className="flex items-center gap-3 mb-4 md:mb-0">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#249d9f' }}><Layers size={14} className="text-white" /></div>
                            <span className="font-display text-sm font-semibold">DevManus</span>
                        </div>
                        <p className="text-xs text-[#3f3f46]">&copy; {new Date().getFullYear()} DevManus. Built with Next.js, Express, PostgreSQL.</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
