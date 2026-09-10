import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export async function saveAttachmentFile(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<{ filename: string; storagePath: string; url: string }> {
  ensureUploadDir();

  const ext = path.extname(originalFilename) || '.png';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const safeFilename = `${timestamp}_${randomStr}${ext}`;
  const filePath = path.join(UPLOAD_DIR, safeFilename);

  await fs.promises.writeFile(filePath, fileBuffer);

  return {
    filename: originalFilename,
    storagePath: filePath,
    url: `/uploads/${safeFilename}`,
  };
}

export function deleteAttachmentFile(storagePath: string): void {
  try {
    if (fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath);
    }
  } catch (err) {
    console.error(`Failed to delete attachment at ${storagePath}:`, err);
  }
}
