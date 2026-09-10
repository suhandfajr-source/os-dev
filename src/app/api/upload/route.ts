import { NextRequest, NextResponse } from 'next/server';
import { saveAttachmentFile } from '@/lib/storage/local';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format gambar tidak didukung. Harap unggah format PNG, JPG, JPEG, atau WEBP.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Batas maksimal adalah 10MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    const saved = await saveAttachmentFile(buffer, file.name);

    return NextResponse.json({
      filename: saved.filename,
      storagePath: saved.storagePath,
      url: saved.url,
      mimeType: file.type,
      base64,
    });
  } catch (err: any) {
    console.error('Error uploading file:', err);
    return NextResponse.json(
      { error: 'Gagal mengunggah file. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
