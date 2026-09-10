import fs from 'fs';
import path from 'path';

const GENERATED_DIR = path.join(process.cwd(), 'public', 'generated');

export function ensureGeneratedDir(): void {
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }
}

export interface GeneratedIllustrationResult {
  imageUrl?: string;
  svgContent?: string;
}

/**
 * Creates an instant, high-quality, rich SVG concept illustration based on analogy keywords.
 * 100% local, instant (0ms), and guarantees 0 extra AI API calls.
 */
function createConceptSvgFallback(prompt: string, caption?: string): string {
  const text = `${prompt} ${caption || ''}`.toLowerCase();
  const isChatOrWA = /whatsapp|chat|pesan|teks|texting|inbox|sms|dm/i.test(text);
  const isServerOrAPI = /api|server|waiter|pelayan|restoran|perantara|kurir|ojol/i.test(text);
  const isDatabase = /database|gudang|arsip|rak|penyimpanan|lemari|bank/i.test(text);
  const isGit = /git|branch|cabang|merge|commit|pohon|jalur|fork/i.test(text);

  if (isGit) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 320" width="100%" height="100%">
  <defs>
    <linearGradient id="gitBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b141a"/>
      <stop offset="100%" stop-color="#111b21"/>
    </linearGradient>
    <filter id="gitGlow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="540" height="320" rx="16" fill="url(#gitBg)"/>
  
  <!-- Title Badge -->
  <rect x="30" y="20" width="180" height="30" rx="8" fill="#202c33" stroke="#2a3942"/>
  <text x="120" y="40" fill="#25d366" font-family="-apple-system, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Analogi Percabangan Git</text>

  <!-- Main Line (Jalur Utama / Jalan Tol) -->
  <path d="M60 170 L480 170" stroke="#3b82f6" stroke-width="4" stroke-linecap="round"/>
  <circle cx="90" cy="170" r="10" fill="#3b82f6"/>
  <circle cx="210" cy="170" r="10" fill="#3b82f6"/>
  <circle cx="370" cy="170" r="10" fill="#3b82f6"/>
  <circle cx="460" cy="170" r="12" fill="#25d366" filter="url(#gitGlow)"/>
  
  <text x="90" y="205" fill="#94a3b8" font-size="11" font-family="monospace" text-anchor="middle">v1.0</text>
  <text x="210" y="205" fill="#94a3b8" font-size="11" font-family="monospace" text-anchor="middle">v1.1</text>
  <text x="460" y="205" fill="#25d366" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">main / master</text>

  <!-- Feature Branch (Jalur Cabang Eksperimen) -->
  <path d="M210 170 C240 100, 270 100, 310 100 L390 100 C420 100, 430 170, 460 170" fill="none" stroke="#f59e0b" stroke-width="3.5" stroke-dasharray="6,4"/>
  <circle cx="310" cy="100" r="9" fill="#f59e0b"/>
  <circle cx="390" cy="100" r="9" fill="#f59e0b"/>

  <!-- Cards -->
  <g transform="translate(250, 45)">
    <rect width="180" height="42" rx="8" fill="#202c33" stroke="#f59e0b" stroke-width="1.5"/>
    <text x="12" y="22" fill="#f59e0b" font-size="11" font-weight="bold" font-family="-apple-system, sans-serif">🌿 Branch: fitur-baru</text>
    <text x="12" y="34" fill="#94a3b8" font-size="9">Eksperimen aman tanpa merusak main</text>
  </g>

  <!-- Legend Bottom -->
  <g transform="translate(60, 245)">
    <rect width="420" height="45" rx="10" fill="#182229" stroke="#222d34"/>
    <text x="210" y="22" fill="#e9edef" font-size="11" font-weight="bold" text-anchor="middle">Ibarat Bikin Salinan Dokumen Kerja</text>
    <text x="210" y="36" fill="#8696a0" font-size="10" text-anchor="middle">Kamu bisa coret-coret di cabang, kalau udah bagus baru digabung (merge) ke utama!</text>
  </g>
</svg>`;
  }

  if (isChatOrWA) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 320" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b141a"/>
      <stop offset="100%" stop-color="#111b21"/>
    </linearGradient>
    <linearGradient id="waGreen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#25D366"/>
      <stop offset="100%" stop-color="#128C7E"/>
    </linearGradient>
    <linearGradient id="termGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111b21"/>
      <stop offset="100%" stop-color="#0b141a"/>
    </linearGradient>
  </defs>
  <rect width="540" height="320" rx="16" fill="url(#bg)"/>
  
  <!-- Left Side: WhatsApp Chatting Mockup -->
  <g transform="translate(40, 40)">
    <rect width="190" height="235" rx="14" fill="#202c33" stroke="#2a3942" stroke-width="1.5"/>
    <rect width="190" height="36" rx="14" fill="url(#waGreen)"/>
    <rect y="22" width="190" height="14" fill="url(#waGreen)"/>
    <circle cx="22" cy="18" r="10" fill="#ffffff" opacity="0.95"/>
    <path d="M22 11 C18.1 11 15 14.1 15 18 C15 19.3 15.3 20.5 15.9 21.5 L15 25 L18.6 24.1 C19.6 24.7 20.8 25 22 25 C25.9 25 29 21.9 29 18 C29 14.1 25.9 11 22 11 Z" fill="#128C7E"/>
    <text x="38" y="22" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="11" font-weight="bold">WhatsApp</text>
    
    <!-- GUI vs CLI text bubble -->
    <rect x="12" y="50" width="165" height="48" rx="8" fill="#111b21" stroke="#222d34"/>
    <text x="20" y="68" fill="#94a3b8" font-family="-apple-system, sans-serif" font-size="10">GUI: Klik burger 🍔</text>
    <text x="20" y="85" fill="#64748b" font-family="-apple-system, sans-serif" font-size="9">(Klik tombol-tombol)</text>

    <!-- Green Active Chat Bubble (CLI Analogy) -->
    <rect x="18" y="112" width="160" height="58" rx="8" fill="url(#waGreen)"/>
    <text x="26" y="132" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="11" font-weight="bold">CLI: Chat Teks 💬</text>
    <text x="26" y="150" fill="#f0fdf4" font-family="-apple-system, sans-serif" font-size="10">"mkdir project-baru"</text>
    
    <text x="95" y="215" fill="#8696a0" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle">Kirim pesan perintah teks</text>
  </g>

  <!-- Central Flow Arrow -->
  <g transform="translate(242, 140)">
    <circle cx="28" cy="20" r="18" fill="#00a884" opacity="0.2"/>
    <path d="M12 20 L40 20 M32 12 L42 20 L32 28" fill="none" stroke="#25d366" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="28" y="48" fill="#25d366" font-family="-apple-system, sans-serif" font-size="9" text-anchor="middle" font-weight="bold">EKSEKUSI</text>
  </g>

  <!-- Right Side: Computer Terminal Screen -->
  <g transform="translate(310, 40)">
    <rect width="190" height="235" rx="14" fill="url(#termGrad)" stroke="#00a884" stroke-width="1.5"/>
    <rect width="190" height="28" rx="14" fill="#202c33"/>
    <rect y="14" width="190" height="14" fill="#202c33"/>
    <circle cx="14" cy="14" r="3.5" fill="#ef4444"/>
    <circle cx="24" cy="14" r="3.5" fill="#f59e0b"/>
    <circle cx="34" cy="14" r="3.5" fill="#10b981"/>
    <text x="50" y="18" fill="#8696a0" font-family="monospace" font-size="10">Terminal / CLI</text>

    <!-- Terminal Content -->
    <text x="16" y="60" fill="#38bdf8" font-family="monospace" font-size="10">$ whoami</text>
    <text x="16" y="78" fill="#a7f3d0" font-family="monospace" font-size="9">> kamu@laptop</text>
    
    <text x="16" y="115" fill="#38bdf8" font-family="monospace" font-size="10">$ mkdir project-baru</text>
    <text x="16" y="135" fill="#4ade80" font-family="monospace" font-size="9.5">✔ Folder siap dibuat!</text>
    <rect x="16" y="152" width="7" height="12" fill="#38bdf8" opacity="0.8"/>

    <text x="95" y="215" fill="#8696a0" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle">Komputer langsung nurut</text>
  </g>
</svg>`;
  }

  if (isServerOrAPI) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 320" width="100%" height="100%">
  <defs>
    <linearGradient id="apiBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b141a"/>
      <stop offset="100%" stop-color="#111b21"/>
    </linearGradient>
  </defs>
  <rect width="540" height="320" rx="16" fill="url(#apiBg)"/>
  
  <!-- Left: Client / Tamu -->
  <g transform="translate(40, 60)">
    <rect width="130" height="190" rx="12" fill="#202c33" stroke="#2a3942" stroke-width="1.5"/>
    <circle cx="65" cy="55" r="24" fill="#38bdf8" opacity="0.2"/>
    <text x="65" y="64" font-size="24" text-anchor="middle">👤</text>
    <text x="65" y="115" fill="#e9edef" font-family="-apple-system, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Tamu / Browser</text>
    <text x="65" y="135" fill="#8696a0" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle">Pesan Makanan</text>
  </g>

  <!-- Middle: API / Waiter -->
  <g transform="translate(205, 50)">
    <rect width="130" height="210" rx="12" fill="#202c33" stroke="#25d366" stroke-width="2"/>
    <circle cx="65" cy="55" r="26" fill="#25d366" opacity="0.2"/>
    <text x="65" y="64" font-size="26" text-anchor="middle">🤵</text>
    <text x="65" y="115" fill="#25d366" font-family="-apple-system, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">API (Pelayan)</text>
    <text x="65" y="135" fill="#e9edef" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle">Antar Request</text>
    <text x="65" y="152" fill="#e9edef" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle">&amp; Bawa Respon</text>
  </g>

  <!-- Right: Server & Dapur -->
  <g transform="translate(370, 60)">
    <rect width="130" height="190" rx="12" fill="#202c33" stroke="#2a3942" stroke-width="1.5"/>
    <circle cx="65" cy="55" r="24" fill="#f59e0b" opacity="0.2"/>
    <text x="65" y="64" font-size="24" text-anchor="middle">🍳</text>
    <text x="65" y="115" fill="#e9edef" font-family="-apple-system, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Dapur / Server</text>
    <text x="65" y="135" fill="#8696a0" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle">Masak &amp; Olah Data</text>
  </g>
</svg>`;
  }

  if (isDatabase) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 320" width="100%" height="100%">
  <defs>
    <linearGradient id="dbBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b141a"/>
      <stop offset="100%" stop-color="#111b21"/>
    </linearGradient>
  </defs>
  <rect width="540" height="320" rx="16" fill="url(#dbBg)"/>
  
  <!-- Left: Rak Arsip Gudang -->
  <g transform="translate(50, 50)">
    <rect width="200" height="210" rx="12" fill="#202c33" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="100" y="32" fill="#38bdf8" font-size="12" font-weight="bold" font-family="-apple-system, sans-serif" text-anchor="middle">🏢 Gudang / Database</text>
    <!-- Shelves -->
    <rect x="20" y="50" width="160" height="36" rx="6" fill="#111b21" stroke="#2a3942"/>
    <text x="30" y="73" fill="#e9edef" font-size="11">📦 Tabel Users</text>
    
    <rect x="20" y="98" width="160" height="36" rx="6" fill="#111b21" stroke="#2a3942"/>
    <text x="30" y="121" fill="#e9edef" font-size="11">📦 Tabel Pesanan</text>

    <rect x="20" y="146" width="160" height="36" rx="6" fill="#111b21" stroke="#2a3942"/>
    <text x="30" y="169" fill="#e9edef" font-size="11">📦 Tabel Produk</text>
  </g>

  <!-- Right: Petugas Pencari Data -->
  <g transform="translate(290, 50)">
    <rect width="200" height="210" rx="12" fill="#202c33" stroke="#25d366" stroke-width="1.5"/>
    <circle cx="100" cy="60" r="28" fill="#25d366" opacity="0.2"/>
    <text x="100" y="70" font-size="30" text-anchor="middle">🔍</text>
    <text x="100" y="120" fill="#25d366" font-family="-apple-system, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Pencarian Cepat (SQL)</text>
    <text x="100" y="145" fill="#8696a0" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle">Data tersimpan aman &amp;</text>
    <text x="100" y="162" fill="#8696a0" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle">bisa dicari kapan saja</text>
  </g>
</svg>`;
  }

  // Default Universal Concept Card
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 320" width="100%" height="100%">
  <defs>
    <linearGradient id="genBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b141a"/>
      <stop offset="100%" stop-color="#111b21"/>
    </linearGradient>
  </defs>
  <rect width="540" height="320" rx="16" fill="url(#genBg)"/>
  
  <g transform="translate(60, 65)">
    <rect width="170" height="190" rx="14" fill="#202c33" stroke="#2a3942" stroke-width="1.5"/>
    <circle cx="85" cy="65" r="30" fill="#38bdf8" opacity="0.2"/>
    <text x="85" y="73" font-size="28" text-anchor="middle">👤</text>
    <text x="85" y="125" fill="#e9edef" font-family="-apple-system, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Kamu (Pemula)</text>
    <text x="85" y="145" fill="#8696a0" font-family="-apple-system, sans-serif" font-size="11" text-anchor="middle">Kirim Pertanyaan</text>
  </g>

  <g transform="translate(245, 145)">
    <path d="M10 15 L50 15 M38 5 L50 15 L38 25" fill="none" stroke="#25d366" stroke-width="3" stroke-linecap="round"/>
    <text x="30" y="42" fill="#25d366" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle" font-weight="bold">DISKUSI</text>
  </g>

  <g transform="translate(310, 65)">
    <rect width="170" height="190" rx="14" fill="#202c33" stroke="#25d366" stroke-width="1.5"/>
    <circle cx="85" cy="65" r="30" fill="#25d366" opacity="0.2"/>
    <text x="85" y="73" font-size="28" text-anchor="middle">🚀</text>
    <text x="85" y="125" fill="#e9edef" font-family="-apple-system, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Geng Vibe Coding</text>
    <text x="85" y="145" fill="#25d366" font-family="-apple-system, sans-serif" font-size="11" text-anchor="middle">Jelasin Sampai Paham</text>
  </g>
</svg>`;
}

/**
 * High-performance instant vector illustration handler.
 * Guarantees zero extra AI API calls, instant 0ms generation, and persistent SVG files.
 */
export async function generateConceptIllustration(
  prompt: string,
  caption?: string
): Promise<GeneratedIllustrationResult | null> {
  ensureGeneratedDir();

  const cleanSvg = createConceptSvgFallback(prompt, caption);

  try {
    const filename = `ill_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.svg`;
    const filePath = path.join(GENERATED_DIR, filename);
    await fs.promises.writeFile(filePath, cleanSvg, 'utf-8');

    return {
      imageUrl: `/generated/${filename}`,
      svgContent: cleanSvg,
    };
  } catch (err) {
    console.error('Failed to write SVG file:', err);
    return {
      svgContent: cleanSvg,
    };
  }
}
