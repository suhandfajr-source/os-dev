import { getConversationWithMessages } from '@/lib/db';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { notFound } from 'next/navigation';

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  const conversation = await getConversationWithMessages(id);

  if (!conversation) {
    notFound();
  }

  return (
    <ChatContainer conversationId={id} initialData={conversation} />
  );
}
