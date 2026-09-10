import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/sidebar/Sidebar';

export const metadata: Metadata = {
  title: 'Personal Vibe Coding Assistant',
  description: 'AI Companion pribadi untuk menerjemahkan dunia vibe coding ke bahasa pemula',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="bg-slate-950 text-slate-100 flex h-screen overflow-hidden antialiased">
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          {children}
        </main>
      </body>
    </html>
  );
}
