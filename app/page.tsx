'use client';
import Link from 'next/link';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, Zap, Shield, Layout } from 'lucide-react';

export default function Home() {
  const { theme } = useTheme();
  const { isLoggedIn } = useAuth();

  const mainBg = theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-gray-900 border-gray-800 hover:border-indigo-500/50' : 'bg-white border-gray-200 hover:border-indigo-500 shadow-sm';
  const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
  const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  return (
    <main className={`flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-6 ${mainBg} transition-colors duration-300 relative overflow-hidden`}>
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-indigo-500/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="z-10 max-w-4xl w-full flex flex-col items-center text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs font-bold uppercase tracking-widest animate-pulse">
          <Sparkles size={14} /> New Version 2.0 Live
        </div>

        <h1 className={`text-5xl md:text-7xl font-black ${textColor} tracking-tight leading-none`}>
          Beautiful API Docs <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
            In Seconds.
          </span>
        </h1>

        <p className={`${subTextColor} text-lg md:text-xl max-w-2xl font-medium leading-relaxed`}>
          Import your Postman collections and generate stunning, interactive documentation globally accessible with search, variable resolution, and code snippets.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 group"
            >
              Go to Dashboard <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 group"
              >
                Get Started Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className={`px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border ${theme === 'dark' ? 'bg-gray-900 border-gray-800 text-white hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'} active:scale-95`}
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-16">
          <div className={`${cardBg} p-6 rounded-2xl border transition-all flex flex-col items-center text-center`}>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 mb-4">
              <Zap size={24} />
            </div>
            <h3 className={`font-bold mb-2 ${textColor}`}>Instant Import</h3>
            <p className={`text-sm ${subTextColor}`}>Drop your Postman JSON and see magic happen instantly.</p>
          </div>

          <div className={`${cardBg} p-6 rounded-2xl border transition-all flex flex-col items-center text-center`}>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 mb-4">
              <Shield size={24} />
            </div>
            <h3 className={`font-bold mb-2 ${textColor}`}>Private Access</h3>
            <p className={`text-sm ${subTextColor}`}>Secure your docs with user-based authentication easily.</p>
          </div>

          <div className={`${cardBg} p-6 rounded-2xl border transition-all flex flex-col items-center text-center`}>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500 mb-4">
              <Layout size={24} />
            </div>
            <h3 className={`font-bold mb-2 ${textColor}`}>Interactive UI</h3>
            <p className={`text-sm ${subTextColor}`}>Built-in API runner to test endpoints directly in docs.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
