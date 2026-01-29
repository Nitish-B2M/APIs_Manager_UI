'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ClipboardList, LayoutDashboard, Database, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();

    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        setIsLoggedIn(!!localStorage.getItem('token'));
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        toast.success('Logged out successfully');
        router.push('/login');
    };

    return (
        <header className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border-b sticky top-0 z-50 transition-colors duration-300`}>
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href={isLoggedIn ? "/dashboard" : "/"} className={`text-xl font-bold transition-all ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2 hover:opacity-80`}>
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs">P</div>
                        PostmanClone
                    </Link>
                    {isLoggedIn && (
                        <nav className="hidden md:flex gap-6 text-sm font-medium">
                            <Link href="/dashboard" className={`flex items-center gap-2 transition-all ${pathname === '/dashboard' ? 'text-indigo-500 font-bold underline decoration-2 underline-offset-4' : `${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-indigo-600'}`}`}>
                                <LayoutDashboard size={16} /> Dashboard
                            </Link>
                            <Link href="/import" className={`flex items-center gap-2 transition-all ${pathname === '/import' ? 'text-indigo-500 font-bold underline decoration-2 underline-offset-4' : `${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-indigo-600'}`}`}>
                                <Database size={16} /> Import
                            </Link>
                            <Link href="/changelog" className={`flex items-center gap-2 transition-all ${pathname === '/changelog' ? 'text-indigo-500 font-bold underline decoration-2 underline-offset-4' : `${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-indigo-600'}`}`}>
                                <ClipboardList size={16} /> Changelog
                            </Link>
                        </nav>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-indigo-600 hover:bg-indigo-600/10'}`}
                        title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {isLoggedIn ? (
                        <>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-gray-700 shadow-inner"></div>
                            <button
                                onClick={handleLogout}
                                className={`p-2 transition-all group lg:flex items-center gap-2 cursor-pointer rounded-lg ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}
                                title="Logout"
                            >
                                <span className="hidden lg:inline text-xs font-medium uppercase font-bold tracking-widest">Logout</span>
                                <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-bold transition-all text-white shadow-lg active:scale-95">
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
