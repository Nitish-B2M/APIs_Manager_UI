'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Terminal, CheckSquare, StickyNote, CalendarClock, ChevronRight, Code2, Cpu, Globe, Lock, Zap, Mail, User, MessageSquare, Send } from 'lucide-react';
import { GlassCard, PremiumButton, TextGradient } from '../components/UIComponents';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

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
      toast.success('Message sent! We will get back to you shortly.');
      setFormData({ name: '', email: '', message: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-64px)] flex-col items-center bg-background text-foreground relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-500/20 via-purple-500/5 to-transparent blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute -left-64 top-64 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute -right-64 top-96 w-[500px] h-[500px] bg-violet-500/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl w-full flex flex-col items-center text-center px-6 pt-32 pb-24">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest animate-pulse mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.2)]">
          <Cpu size={14} /> DevManus v2.0 is Live
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-heading tracking-tighter leading-[1.1] mb-8">
          The Unified <br className="hidden md:block" />
          <TextGradient>Workspace</TextGradient> for Builders.
        </h1>

        <p className="text-secondary text-lg md:text-xl max-w-2xl font-medium leading-relaxed mb-12 uppercase tracking-tight">
          The ultimate engineering hub for APIs, Tasks, Notes, and Time. DevManus brings your entire development ecosystem into a single, high-performance glass canvas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
          {isLoggedIn ? (
            <PremiumButton onClick={() => router.push('/dashboard')} className="px-10 py-5 text-lg group w-full sm:w-auto flex items-center gap-2">
              Enter Workspace <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </PremiumButton>
          ) : (
            <>
              <PremiumButton onClick={() => router.push('/register')} className="px-10 py-5 text-lg group w-full sm:w-auto flex items-center gap-2">
                Start Building Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </PremiumButton>
              <PremiumButton variant="outline" onClick={() => router.push('/login')} className="px-10 py-5 text-lg border-glass-border hover:bg-black/10 dark:hover:bg-white/10 backdrop-blur-md w-full sm:w-auto flex items-center gap-2">
                Sign In to Account
              </PremiumButton>
            </>
          )}
        </div>
      </section>

      {/* Status Indicators / Tech Specs */}
      <section className="relative z-10 w-full border-y border-glass-border bg-black/5 dark:bg-white/[0.02] py-16 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-glass-border">
          <div className="flex flex-col items-center justify-center gap-2 border-none">
            <Code2 size={24} className="text-secondary mb-2" />
            <span className="text-3xl font-black text-heading">100%</span>
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Type Safe</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-2">
            <Lock size={24} className="text-secondary mb-2" />
            <span className="text-3xl font-black text-heading">E2E</span>
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Secure</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-2">
            <Globe size={24} className="text-secondary mb-2" />
            <span className="text-3xl font-black text-heading">Edge</span>
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Global DB</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-2">
            <Zap size={24} className="text-secondary mb-2" />
            <span className="text-3xl font-black text-heading">&lt;50ms</span>
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Latency</span>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="relative z-10 w-full max-w-7xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-heading tracking-tight mb-4 leading-tight">Everything you need. <br /><span className="text-slate-500">Nothing you don't.</span></h2>
          <p className="text-secondary font-bold uppercase tracking-widest text-sm max-w-2xl mx-auto">Interconnected workflows for modern engineering teams.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* API Studio */}
          <div className="group relative p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent hover:from-blue-500/30 transition-all duration-500">
            <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 rounded-3xl" />
            <div className="relative h-full bg-background rounded-[23px] border border-glass-border p-8 md:p-10 overflow-hidden flex flex-col">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                <Terminal size={32} />
              </div>
              <h3 className="text-2xl font-bold text-heading mb-4 leading-tight">API Studio</h3>
              <p className="text-secondary leading-relaxed mb-8 flex-1 text-sm font-medium">Test endpoints, generate beautiful documentation, and manage collections with built-in proxies. Postman-compatible and lives right next to your code.</p>
              <div className="inline-flex items-center text-blue-500 font-bold text-xs tracking-[0.2em] uppercase group-hover:translate-x-2 transition-transform cursor-pointer" onClick={() => router.push('/dashboard')}>
                Explore API Hub <ChevronRight size={16} className="ml-1" />
              </div>
            </div>
          </div>

          {/* Task Board */}
          <div className="group relative p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent hover:from-emerald-500/30 transition-all duration-500">
            <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 rounded-3xl" />
            <div className="relative h-full bg-background rounded-[23px] border border-glass-border p-8 md:p-10 overflow-hidden flex flex-col">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                <CheckSquare size={32} />
              </div>
              <h3 className="text-2xl font-bold text-heading mb-4 leading-tight">Task Board</h3>
              <p className="text-secondary leading-relaxed mb-8 flex-1 text-sm font-medium">Immersive Kanban boards and lists. Link tasks directly to API endpoints or notes. Keep your development sprints organized without leaving the platform.</p>
              <div className="inline-flex items-center text-emerald-500 font-bold text-xs tracking-[0.2em] uppercase group-hover:translate-x-2 transition-transform cursor-pointer" onClick={() => router.push('/todos')}>
                View Kanban <ChevronRight size={16} className="ml-1" />
              </div>
            </div>
          </div>

          {/* Dev Notes */}
          <div className="group relative p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent hover:from-amber-500/30 transition-all duration-500">
            <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 rounded-3xl" />
            <div className="relative h-full bg-background rounded-[23px] border border-glass-border p-8 md:p-10 overflow-hidden flex flex-col">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                <StickyNote size={32} />
              </div>
              <h3 className="text-2xl font-bold text-heading mb-4 leading-tight">Developer Notes</h3>
              <p className="text-secondary leading-relaxed mb-8 flex-1 text-sm font-medium">Rich-text markdown editor for system architecture, meeting notes, and internal wikis. Experience a distraction-free, minimalist glass canvas.</p>
              <div className="inline-flex items-center text-amber-500 font-bold text-xs tracking-[0.2em] uppercase group-hover:translate-x-2 transition-transform cursor-pointer" onClick={() => router.push('/modules/notes')}>
                Start Writing <ChevronRight size={16} className="ml-1" />
              </div>
            </div>
          </div>

          {/* Time Sync */}
          <div className="group relative p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent hover:from-fuchsia-500/30 transition-all duration-500">
            <div className="absolute inset-0 bg-fuchsia-500/10 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 rounded-3xl" />
            <div className="relative h-full bg-background rounded-[23px] border border-glass-border p-8 md:p-10 overflow-hidden flex flex-col">
              <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                <CalendarClock size={32} />
              </div>
              <h3 className="text-2xl font-bold text-heading mb-4 leading-tight">Time Sync</h3>
              <p className="text-secondary leading-relaxed mb-8 flex-1 text-sm font-medium">Full-screen scheduling and time blocking. Visualize your day, set reminders for API deployments, and never miss a meeting again.</p>
              <div className="inline-flex items-center text-fuchsia-400 font-bold text-xs tracking-[0.2em] uppercase group-hover:translate-x-2 transition-transform cursor-pointer" onClick={() => router.push('/scheduler')}>
                Open Calendar <ChevronRight size={16} className="ml-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-heading tracking-tight mb-6 leading-tight">
              Let's <TextGradient>Connect</TextGradient>
            </h2>
            <p className="text-secondary font-bold uppercase tracking-widest text-sm mb-8 leading-relaxed">
              Inquiries, feedback, or strategic support? <br /> Our engineering team is here for you.
            </p>
            <div className="space-y-6">
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Mail size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-1">Email Support</div>
                  <div className="text-heading font-bold">support@devmanus.io</div>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Globe size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-1">Global Scale</div>
                  <div className="text-heading font-bold">Distributed Workspace</div>
                </div>
              </div>
            </div>
          </div>

          <GlassCard className="p-8 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-heading uppercase tracking-[0.2em] flex items-center gap-2">
                  <User size={12} className="text-indigo-400" /> Your Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border border-glass-border rounded-xl px-4 py-3 text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-muted text-sm"
                  placeholder="How should we call you?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-heading uppercase tracking-[0.2em] flex items-center gap-2">
                  <Mail size={12} className="text-purple-400" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border border-glass-border rounded-xl px-4 py-3 text-heading focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-muted text-sm"
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-heading uppercase tracking-[0.2em] flex items-center gap-2">
                  <MessageSquare size={12} className="text-pink-400" /> Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border border-glass-border rounded-xl px-4 py-3 text-heading focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all resize-none placeholder:text-muted text-sm"
                  placeholder="What's on your mind?"
                />
              </div>
              <PremiumButton
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 group shadow-lg shadow-indigo-500/20"
              >
                {isSubmitting ? 'TRANSMITTING...' : 'SEND INQUIRY'}
                {!isSubmitting && <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </PremiumButton>
            </form>
          </GlassCard>
        </div>
      </section>

      {/* Peak-End CTA */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-6 py-32 text-center">
        <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] pointer-events-none rounded-full" />
        <h2 className="text-4xl md:text-6xl font-black text-heading tracking-tight mb-8">Ready to evolve your workflow?</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {isLoggedIn ? (
            <PremiumButton onClick={() => router.push('/dashboard')} className="px-12 py-6 text-xl shadow-[0_0_40px_rgba(99,102,241,0.4)] group w-full sm:w-auto flex items-center gap-2">
              Open Your Workspace <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
            </PremiumButton>
          ) : (
            <>
              <PremiumButton onClick={() => router.push('/register')} className="px-12 py-6 text-xl shadow-[0_0_40px_rgba(99,102,241,0.4)] group w-full sm:w-auto flex items-center gap-2">
                Create Free Account <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
              </PremiumButton>
              <PremiumButton variant="outline" onClick={() => router.push('/login')} className="px-12 py-6 text-xl border-glass-border hover:bg-black/10 dark:hover:bg-white/10 backdrop-blur-md w-full sm:w-auto flex items-center gap-2">
                Sign In
              </PremiumButton>
            </>
          )}
        </div>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-secondary font-black text-[10px] uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-2 group mx-auto mt-12 py-4">
          Back to Top <Zap size={14} className="text-amber-400 group-hover:scale-125 transition-transform" />
        </button>
      </section>
    </main>
  );
}
