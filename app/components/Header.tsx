'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ClipboardList, LayoutDashboard, Database } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();

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

    // Show header on all pages
    // if (['/login', '/register', '/'].includes(pathname)) return null;

    return (
        <header className="bg-gray-900 border-b border-gray-800 text-white sticky top-0 z-50 shadow-xl">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href={isLoggedIn ? "/dashboard" : "/"} className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 hover:opacity-80 transition-opacity">
                        PostmanClone
                    </Link>
                    {isLoggedIn && (
                        <nav className="hidden md:flex gap-6 text-sm font-medium">
                            <Link href="/dashboard" className={`flex items-center gap-2 hover:text-white transition-colors ${pathname === '/dashboard' ? 'text-blue-400 font-semibold' : 'text-gray-400'}`}>
                                <LayoutDashboard size={16} /> Dashboard
                            </Link>
                            <Link href="/import" className={`flex items-center gap-2 hover:text-white transition-colors ${pathname === '/import' ? 'text-blue-400 font-semibold' : 'text-gray-400'}`}>
                                <Database size={16} /> Import
                            </Link>
                            <Link href="/changelog" className={`flex items-center gap-2 hover:text-white transition-colors ${pathname === '/changelog' ? 'text-blue-400 font-semibold' : 'text-gray-400'}`}>
                                <ClipboardList size={16} /> Changelog
                            </Link>
                        </nav>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {isLoggedIn ? (
                        <>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-gray-700 shadow-inner"></div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all group lg:flex items-center gap-2 cursor-pointer"
                                title="Logout"
                            >
                                <span className="hidden lg:inline text-xs font-medium">Logout</span>
                                <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
