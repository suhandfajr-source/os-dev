# Personal Vibe Coding Assistant (Stage V0)

Personal AI Companion untuk menerjemahkan dunia vibe coding dan software development ke bahasa super pemula.

Aplikasi ini dirancang khusus untuk penggunaan pribadi:
- **Tanya → Pahami → Lanjutkan Percakapan → Tersimpan Otomatis → Cari Kembali Kapan Saja**.

---

## 🚀 Fitur Utama (Stage V0)

- **Chat & Multi-turn Conversation**: Penjelasan konsep, istilah teknis, error terminal/IDE yang ramah pemula dengan konteks percakapan multi-turn.
- **Multimodal Screenshot Input**: Upload dan preview screenshot error atau tampilan kode sebelum dikirim ke AI.
- **Dynamic Assistant Brief & AI Routing**: Behavior dan persona ditentukan langsung dari `/docs/assistant-brief.md` dengan AI classifier ringan tanpa hardcoding di UI.
- **Markdown & Code Block**: Format rapi dengan tombol salin (copy button) pada setiap blok kode.
- **Mermaid Diagram**: Visualisasi proses dan flowchart secara interaktif dengan error fallback yang aman.
- **Auto-Title & Grouped History**: Judul otomatis ringkas dan riwayat percakapan dikelompokkan berdasarkan waktu (*Hari Ini*, *7 Hari Terakhir*, *Lebih Lama*).
- **Instant Search**: Pencarian percakapan berdasarkan topik, pesan user, atau jawaban AI.
- **Local SQLite Persistence**: Semua percakapan dan attachment tersimpan secara lokal dan persisten.

---

## 🛠️ Prasyarat

- **Node.js**: Versi 18+ (disarankan Node.js LTS atau versi terbaru).
- **API Key AI**: Dapatkan Google Gemini API key di [Google AI Studio](https://aistudio.google.com/).

---

## 📦 Panduan Instalasi & Menjalankan

### 1. Salin Environment Variables
Salin file `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Buka `.env.local` dan masukkan API Key Anda:
```env
AI_PROVIDER=gemini
AI_API_KEY=AIzaSy...
AI_MODEL=gemini-1.5-flash
```

### 2. Sediakan Assistant Brief (Opsional / Kustomisasi)
Letakkan panduan atau aturan persona AI pada file:
```text
docs/assistant-brief.md
```
*(Jika file belum diisi, asisten akan menggunakan instruksi dasar Vibe Coding).*

### 3. Install Dependencies
```bash
npm install
```

### 4. Jalankan Development Server
```bash
npm run dev
```

Buka browser dan akses:
```
http://localhost:3000
```

---

## 📁 Struktur Direktori

```text
.
├── docs/
│   └── assistant-brief.md          # Aturan behavior & persona AI (diberikan user)
├── data/
│   └── assistant.db                # Database lokal SQLite persisten
├── public/
│   └── uploads/                    # Penyimpanan gambar/screenshot
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts       # Endpoint chat & AI processing
│   │   │   ├── conversations/      # CRUD & Search percakapan
│   │   │   └── upload/route.ts     # Upload gambar
│   │   ├── chat/[id]/page.tsx      # Tampilan percakapan aktif
│   │   ├── layout.tsx              # Shell & layout utama
│   │   └── page.tsx                # Halaman New Chat
│   ├── components/
│   │   ├── chat/                   # Composer, Message, EmptyState
│   │   ├── markdown/               # Renderer, CodeBlock, MermaidDiagram
│   │   └── sidebar/                # Sidebar, SearchModal, Item
│   ├── lib/
│   │   ├── ai/                     # Provider adapter, prompt builder, router
│   │   ├── db/                     # SQLite client & skema
│   │   └── storage/                # Handler penyimpanan file
│   └── types/                      # TypeScript definitions
├── .env.example
├── package.json
└── README.md
```
