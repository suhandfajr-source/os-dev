import { GoogleGenAI } from '@google/genai';
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
 * Creates a delightful, high-quality fallback SVG illustration based on the analogy keywords.
 */
function createConceptSvgFallback(prompt: string, caption?: string): string {
  const isChatOrWA = /whatsapp|chat|pesan|teks|texting|inbox/i.test(`${prompt} ${caption}`);
  const isServerOrAPI = /api|server|waiter|pelayan|restoran|perantara/i.test(`${prompt} ${caption}`);
  const isDatabase = /database|gudang|arsip|rak|penyimpanan/i.test(`${prompt} ${caption}`);

  if (isChatOrWA) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 320" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1329"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="waGreen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#25D366"/>
      <stop offset="100%" stop-color="#128C7E"/>
    </linearGradient>
    <linearGradient id="termGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="540" height="320" rx="16" fill="url(#bg)"/>
  
  <!-- Left Side: WhatsApp Chatting Mockup -->
  <g transform="translate(40, 45)">
    <!-- Phone Card -->
    <rect width="190" height="230" rx="14" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <!-- WA Header -->
    <rect width="190" height="40" rx="14" fill="url(#waGreen)"/>
    <rect y="26" width="190" height="14" fill="url(#waGreen)"/>
    <circle cx="25" cy="20" r="11" fill="#ffffff" opacity="0.9"/>
    <!-- WA Icon SVG inside header -->
    <path d="M25 13 C21.1 13 18 16.1 18 20 C18 21.3 18.3 22.5 18.9 23.5 L18 27 L21.6 26.1 C22.6 26.7 23.8 27 25 27 C28.9 27 32 23.9 32 20 C32 16.1 28.9 13 25 13 Z" fill="#128C7E"/>
    <text x="44" y="24" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="12" font-weight="bold">WhatsApp</text>
    
    <!-- Chat Bubbles -->
    <rect x="15" y="55" width="160" height="50" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="25" y="74" fill="#94a3b8" font-family="-apple-system, sans-serif" font-size="10">GUI: Klik burger 🍔</text>
    <text x="25" y="92" fill="#64748b" font-family="-apple-system, sans-serif" font-size="9">(Klik tombol-tombol)</text>

    <!-- Green Active Chat Bubble (CLI Analogy) -->
    <rect x="25" y="118" width="150" height="58" rx="8" fill="url(#waGreen)" filter="url(#glow)"/>
    <text x="35" y="138" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="11" font-weight="bold">CLI: Chat Teks 💬</text>
    <text x="35" y="156" fill="#f0fdf4" font-family="-apple-system, sans-serif" font-size="10">"mkdir project-baru"</text>
    
    <text x="95" y="215" fill="#64748b" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle">Kirim pesan perintah</text>
  </g>

  <!-- Central Flow Arrow -->
  <g transform="translate(242, 140)">
    <circle cx="28" cy="20" r="18" fill="#3b82f6" opacity="0.2"/>
    <path d="M12 20 L40 20 M32 12 L42 20 L32 28" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="28" y="50" fill="#93c5fd" font-family="-apple-system, sans-serif" font-size="9" text-anchor="middle" font-weight="bold">DIJALANKAN</text>
  </g>

  <!-- Right Side: Computer Terminal Screen -->
  <g transform="translate(310, 45)">
    <!-- Terminal Monitor -->
    <rect width="190" height="230" rx="14" fill="url(#termGrad)" stroke="#3b82f6" stroke-width="2" filter="url(#glow)"/>
    <!-- Terminal Header -->
    <rect width="190" height="30" rx="14" fill="#1e293b"/>
    <rect y="16" width="190" height="14" fill="#1e293b"/>
    <circle cx="16" cy="15" r="4" fill="#ef4444"/>
    <circle cx="28" cy="15" r="4" fill="#f59e0b"/>
    <circle cx="40" cy="15" r="4" fill="#10b981"/>
    <text x="60" y="19" fill="#94a3b8" font-family="monospace" font-size="10">Terminal / CLI</text>

    <!-- Terminal Content -->
    <text x="18" y="65" fill="#38bdf8" font-family="monospace" font-size="11">$ whoami</text>
    <text x="18" y="85" fill="#a7f3d0" font-family="monospace" font-size="10">> pc-suhandi</text>
    
    <text x="18" y="125" fill="#38bdf8" font-family="monospace" font-size="11">$ mkdir project-baru</text>
    <text x="18" y="145" fill="#4ade80" font-family="monospace" font-size="10">✔ Folder berhasil dibuat!</text>
    <rect x="18" y="165" width="8" height="14" fill="#38bdf8" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0;0.8" dur="1s" repeatCount="indefinite"/>
    </rect>

    <text x="95" y="215" fill="#94a3b8" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle">Komputer merespons langsung</text>
  </g>
</svg>`;
  }

  // Default Concept Graphic
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 320" width="100%" height="100%">
  <defs>
    <linearGradient id="genBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="540" height="320" rx="16" fill="url(#genBg)"/>
  
  <g transform="translate(70, 70)">
    <rect width="160" height="180" rx="14" fill="#1e293b" stroke="#334155" stroke-width="2"/>
    <circle cx="80" cy="65" r="30" fill="#3b82f6" opacity="0.2"/>
    <text x="80" y="72" font-size="28" text-anchor="middle">👤</text>
    <text x="80" y="125" fill="#f8fafc" font-family="-apple-system, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Kamu (User)</text>
    <text x="80" y="145" fill="#94a3b8" font-family="-apple-system, sans-serif" font-size="11" text-anchor="middle">Kirim Perintah</text>
  </g>

  <g transform="translate(235, 145)">
    <path d="M10 15 L60 15 M45 5 L60 15 L45 25" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round"/>
    <text x="35" y="40" fill="#93c5fd" font-family="-apple-system, sans-serif" font-size="10" text-anchor="middle" font-weight="bold">INTERAKSI</text>
  </g>

  <g transform="translate(310, 70)">
    <rect width="160" height="180" rx="14" fill="#1e293b" stroke="#8b5cf6" stroke-width="2"/>
    <circle cx="80" cy="65" r="30" fill="#8b5cf6" opacity="0.2"/>
    <text x="80" y="72" font-size="28" text-anchor="middle">🤖</text>
    <text x="80" y="125" fill="#f8fafc" font-family="-apple-system, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Sistem Komputer</text>
    <text x="80" y="145" fill="#c084fc" font-family="-apple-system, sans-serif" font-size="11" text-anchor="middle">Eksekusi Tugas</text>
  </g>
</svg>`;
}

/**
 * AI-Generated Vector SVG Illustration Generator
 * Generates rich, playful, modern conceptual cartoon SVG illustrations tailored to the analogy.
 * Saves the generated SVG to /public/generated/ and returns both file URL and inline SVG string.
 */
export async function generateConceptIllustration(
  prompt: string,
  caption?: string
): Promise<GeneratedIllustrationResult | null> {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';
  ensureGeneratedDir();

  let cleanSvg = '';

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = process.env.AI_MODEL || 'gemini-3.6-flash';

      const svgPrompt = `Kamu adalah ilustrator SVG kartun digital profesional untuk edukasi teknologi pemula.
Tugasmu adalah membuat ilustrasi vektor SVG kartun yang sangat jelas, menarik, lucu, dan berwarna-warni untuk menggambarkan konsep / analogi berikut:

Konsep / Analogi:
${prompt}
${caption ? `Keterangan Analogi: ${caption}` : ''}

Ketentuan Desain SVG:
1. Mulai langsung dengan tag <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 320" width="100%" height="100%"> dan akhiri dengan </svg>.
2. Background: Buat latar belakang gelap/modern elegan (<rect width="540" height="320" rx="16" fill="#0f172a"/>).
3. Jika analoginya WhatsApp / Chatting / Pesan Teks:
   - Buat mockup smartphone / bubble chat hijau ala WhatsApp yang familiar (dengan icon chat 💬 atau logo WA sederhana).
   - Tampilkan pesan teks analogi (misal: "tolong beliin burger 1") yang terhubung panah/alur ke komputer/robot ramah yang merespons ("Siap!").
4. Jika analoginya Loket / Satpam / Gudang / Restoran:
   - Buat karakter kartun yang ramah dan objek pendukung (loket tiket, gerbang satpam, rak gudang, waiter) yang langsung mudah dikenali.
5. Gunakan warna-warna cerah ramah (emerald/hijau WhatsApp #22c55e, biru langit #38bdf8, amber/oranye #f59e0b, putih, ungu pastel).
6. Teks di dalam SVG harus jelas dan proporsional.
7. HANYA hasilkan kode SVG utuh tanpa komentar tambahan.`;

      const result = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: svgPrompt }] }],
        config: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      });

      const rawText = result.text || '';
      const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i);

      if (svgMatch) {
        cleanSvg = svgMatch[0].trim();
      }
    } catch (err: any) {
      console.warn('Vector illustration generation via LLM had an issue, using tailored vector graphic:', err?.message || err);
    }
  }

  // Fallback to high-quality tailored SVG concept card if LLM SVG failed or was not returned
  if (!cleanSvg) {
    cleanSvg = createConceptSvgFallback(prompt, caption);
  }

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
