'use client';
import { useState, useEffect } from 'react';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <main className="flex min-h-[calc(100vh-64px)] flex-col items-center bg-[#050505] text-foreground relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-purple-500/20 via-blue-500/5 to-transparent blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute -left-64 top-64 w-[600px] h-[600px] bg-fuchsia-500/10 blur-[150px] pointer-events-none rounded-full animate-pulse" />
      <div className="absolute -right-64 top-96 w-[600px] h-[600px] bg-cyan-500/10 blur-[150px] pointer-events-none rounded-full animate-pulse delay-700" />

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl w-full flex flex-col items-center text-center px-6 pt-32 pb-24">
        {/* Floating Background Icons */}
        <div className="absolute top-20 left-10 text-purple-500/20 animate-bounce delay-100 opacity-50 blur-[1px]">
          <Code2 size={48} />
        </div>
        <div className="absolute top-40 right-10 text-cyan-500/20 animate-bounce delay-500 opacity-50 blur-[1px]">
          <Terminal size={48} />
        </div>
        <div className="absolute bottom-20 left-1/4 text-fuchsia-500/20 animate-pulse opacity-50 blur-[1px]">
          <Zap size={32} />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#D946EF] text-[14px] font-mono uppercase tracking-[0.3em] mb-8 backdrop-blur-md">
          <Cpu size={18} className="animate-pulse" /> DEVMANUS V2.0.0 IS LIVE
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-[90px] font-black text-white tracking-[-0.02em] leading-[0.9] mb-10">
          The Unified <br className="hidden md:block" />
          <TextGradient from="from-[#A855F7]" to="to-[#D946EF]" className="drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]">Workspace</TextGradient> <br className="md:hidden" /> for Builders.
        </h1>

        <p className="text-[#94A3B8] text-sm md:text-base max-w-2xl font-bold leading-relaxed mb-12 uppercase tracking-[0.1em] opacity-90 px-4">
          The ultimate engineering hub for APIs, Tasks, Notes, and Time. <br className="hidden md:block" />
          Bringing your entire development ecosystem into a single, high-performance glass canvas.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 w-full justify-center items-center">
          <PremiumButton variant="solid-purple" onClick={() => router.push(isLoggedIn ? '/dashboard' : '/register')} className="px-14 py-7 text-xs group w-full sm:w-auto flex items-center gap-3 tracking-[0.3em] font-black uppercase ring-1 ring-white/10">
            {isLoggedIn ? 'Enter Workspace' : 'Get Started'} <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
          </PremiumButton>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative z-10 w-full px-6 py-12">
        <div className="max-w-6xl mx-auto glass-effect rounded-3xl p-8 bg-white/[0.02] border border-white/5 backdrop-blur-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 divide-x-0 md:divide-x divide-white/10">
            <div className="flex items-center justify-center gap-4 px-6 py-2">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <CheckSquare size={18} />
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-white tracking-tighter">100%</div>
                <div className="text-[8px] font-black text-[#94A3B8] uppercase tracking-[0.3em]">Type Safe</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 px-6 py-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Lock size={18} />
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-white tracking-tighter">E2E</div>
                <div className="text-[8px] font-black text-[#94A3B8] uppercase tracking-[0.3em]">Encrypted</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 px-6 py-2">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Globe size={18} />
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-white tracking-tighter">Edge</div>
                <div className="text-[8px] font-black text-[#94A3B8] uppercase tracking-[0.3em]">Global DB</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 px-6 py-2">
              <div className="w-10 h-10 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                <Zap size={18} />
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-white tracking-tighter">&lt;50ms</div>
                <div className="text-[8px] font-black text-[#94A3B8] uppercase tracking-[0.3em]">Latency</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="relative z-10 w-full max-w-7xl px-6 py-24">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4 leading-none uppercase">Everything you need. <br /><span className="text-[#94A3B8]">Nothing you don't.</span></h2>
          <p className="text-[#A855F7] font-black uppercase tracking-[0.3em] text-[10px] max-w-2xl mx-auto opacity-80">Interconnected workflows for modern engineering teams.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* API Studio */}
          <GlassCard variant="blue" className="group flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-8 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Terminal size={24} />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase">API Studio</h3>
            <p className="text-[#94A3B8] leading-relaxed mb-10 flex-1 text-sm font-bold opacity-80">Test endpoints, generate beautiful documentation, and manage collections with built-in proxies. DevManus-compatible and lives right next to your code.</p>
            <div className="inline-flex items-center text-blue-500 font-black text-[10px] tracking-[0.4em] uppercase group-hover:translate-x-2 transition-transform cursor-pointer" onClick={() => router.push('/dashboard')}>
              Explore API Hub <ChevronRight size={14} className="ml-2" />
            </div>
          </GlassCard>

          {/* Task Board */}
          <GlassCard variant="green" className="group flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-8 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckSquare size={24} />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase">Task Board</h3>
            <p className="text-[#94A3B8] leading-relaxed mb-10 flex-1 text-sm font-bold opacity-80">Immersive Kanban boards and lists. Link tasks directly to API endpoints or notes. Keep your development sprints organized without leaving the platform.</p>
            <div className="inline-flex items-center text-emerald-500 font-black text-[10px] tracking-[0.4em] uppercase group-hover:translate-x-2 transition-transform cursor-pointer" onClick={() => router.push('/todos')}>
              View Kanban <ChevronRight size={14} className="ml-2" />
            </div>
          </GlassCard>

          {/* Dev Notes */}
          <GlassCard variant="amber" className="group flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-8 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <StickyNote size={24} />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase">Developer Notes</h3>
            <p className="text-[#94A3B8] leading-relaxed mb-10 flex-1 text-sm font-bold opacity-80">Rich-text markdown editor for architecture, meeting notes, and internal wikis. Experience a distraction-free, minimalist glass canvas.</p>
            <div className="inline-flex items-center text-amber-500 font-black text-[10px] tracking-[0.4em] uppercase group-hover:translate-x-2 transition-transform cursor-pointer" onClick={() => router.push('/modules/notes')}>
              Start Writing <ChevronRight size={14} className="ml-2" />
            </div>
          </GlassCard>

          {/* Time Sync */}
          <GlassCard variant="purple" className="group flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 mb-8 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(217,70,239,0.2)]">
              <CalendarClock size={24} />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase">Time Sync</h3>
            <p className="text-[#94A3B8] leading-relaxed mb-10 flex-1 text-sm font-bold opacity-80">Full-screen scheduling and time blocking. Visualize your day, set reminders for API deployments, and never miss a meeting again.</p>
            <div className="inline-flex items-center text-fuchsia-400 font-black text-[10px] tracking-[0.4em] uppercase group-hover:translate-x-2 transition-transform cursor-pointer" onClick={() => router.push('/scheduler')}>
              Open Calendar <ChevronRight size={14} className="ml-2" />
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative z-10 w-full max-w-4xl mx-auto px-6 py-32 text-center">
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6 leading-tight uppercase">
          Let's <TextGradient from="from-[#A855F7]" to="to-[#D946EF]">Connect</TextGradient>
        </h2>
        <p className="text-[#94A3B8] font-black uppercase tracking-[0.2em] text-[10px] mb-16 max-w-xl mx-auto opacity-70">
          Inquiries, feedback, or strategic support? <br /> Our engineering team is here for you.
        </p>

        <GlassCard className="max-w-2xl mx-auto p-12 border-white/5 bg-[#050505]/60 backdrop-blur-3xl relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#A855F7]/10 via-transparent to-[#3B82F6]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-[2.5rem]" />
          <form onSubmit={handleSubmit} className="relative z-10 space-y-8 text-left">
            <div className="space-y-3" suppressHydrationWarning>
              <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.4em] ml-1">Your Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-1 focus:ring-[#A855F7]/50 transition-all placeholder:text-white/10 text-xs font-bold"
                placeholder="How should we call you?"
              />
            </div>
            <div className="space-y-3" suppressHydrationWarning>
              <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.4em] ml-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/50 transition-all placeholder:text-white/10 text-xs font-bold"
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.4em] ml-1">Message</label>
              <textarea
                required
                rows={4}
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-1 focus:ring-[#D946EF]/50 transition-all resize-none placeholder:text-white/10 text-xs font-bold"
                placeholder="What's on your mind?"
              />
            </div>
            <PremiumButton
              type="submit"
              variant="solid-purple"
              disabled={isSubmitting}
              className="w-full py-6 text-xs font-black uppercase tracking-[0.4em] shadow-[0_0_50px_rgba(168,85,247,0.2)]"
            >
              {isSubmitting ? 'TRANSMITTING...' : 'SEND INQUIRY'}
            </PremiumButton>
          </form>
        </GlassCard>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-6 py-40 text-center">
        <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-14 uppercase leading-none">Ready to evolve your <br /> workflow?</h2>
        <div className="mb-24">
          <PremiumButton variant="neon-blue" onClick={() => router.push(isLoggedIn ? '/dashboard' : '/register')} className="px-16 py-8 text-xs tracking-[0.4em] font-black uppercase group flex items-center gap-3 mx-auto shadow-[0_0_60px_rgba(59,130,246,0.25)]">
            {isLoggedIn ? 'Open Workspace' : 'Get Started Now'} <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
          </PremiumButton>
        </div>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-[#94A3B8] font-black text-[9px] uppercase tracking-[0.5em] hover:text-white transition-colors flex flex-col items-center gap-6 mx-auto group">
          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-colors">
            <ArrowRight size={18} className="rotate-[-90deg]" />
          </div>
          <span className="opacity-50 group-hover:opacity-100 transition-opacity">Back to Top</span>
        </button>
      </section>
    </main>
  );
}
