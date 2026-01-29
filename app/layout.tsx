import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Provider from '../components/Provider';
import Header from './components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Postman Docs Generator',
  description: 'Generate API documentation from Postman collections',
};

import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <Provider>
            <Toaster position="bottom-right" />
            <Header />
            {children}
          </Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
