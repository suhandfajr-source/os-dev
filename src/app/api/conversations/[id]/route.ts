import { NextRequest, NextResponse } from 'next/server';
import {
  getConversationWithMessages,
  updateConversationTitle,
  deleteConversation,
} from '@/lib/db';
import { deleteAttachmentFile } from '@/lib/storage/local';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const conversation = await getConversationWithMessages(id);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Percakapan tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (err: any) {
    console.error('Error getting conversation:', err);
    return NextResponse.json(
      { error: 'Gagal memuat percakapan.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Judul tidak boleh kosong.' },
        { status: 400 }
      );
    }

    await updateConversationTitle(id, title.trim());
    return NextResponse.json({ success: true, title: title.trim() });
  } catch (err: any) {
    console.error('Error updating conversation title:', err);
    return NextResponse.json(
      { error: 'Gagal mengubah judul percakapan.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const storagePaths = await deleteConversation(id);

    // Clean up physical attachment files
    for (const filePath of storagePaths) {
      deleteAttachmentFile(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting conversation:', err);
    return NextResponse.json(
      { error: 'Gagal menghapus percakapan.' },
      { status: 500 }
    );
  }
}
