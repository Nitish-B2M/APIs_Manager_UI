import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Provider from '../components/Provider';
import Header from './components/Header';
import CommandPalette from './components/CommandPalette';
import SystemResourceWidget from '../components/SystemResourceWidget';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DevManus',
  description: 'The Ultimate Workspace for Developers. Write API docs, manage tasks, take rich notes, and schedule your time securely from one unified platform.',
};

import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { BetaModeProvider } from '../context/BetaModeContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <BetaModeProvider>
              <Provider>
                <Toaster position="bottom-right" />
                <Header />
                {children}
                <CommandPalette />
                <SystemResourceWidget />
              </Provider>
            </BetaModeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
