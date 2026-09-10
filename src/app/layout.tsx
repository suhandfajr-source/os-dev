import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { UserProfileProvider } from '@/components/profile/UserProfileContext';
import { UserProfileModal } from '@/components/profile/UserProfileModal';

export const metadata: Metadata = {
  title: 'Geng Vibe Coding — WhatsApp AI Assistant',
  description: 'Grup AI Expert ramah pemula (Gib-run, Joke-Wi, Pra-Bow Wo, dsb) untuk menerjemahkan dunia vibe coding ke bahasa pemula',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="bg-[#0b141a] text-[#e9edef] flex h-screen overflow-hidden antialiased select-none">
        <UserProfileProvider>
          <Sidebar />
          <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
            {children}
          </main>
          <UserProfileModal />
        </UserProfileProvider>
      </body>
    </html>
  );
}
