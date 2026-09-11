# ADDENDUM_STAGE_V0_TOOLS_AND_STARRED_KNOWLEDGE.md

## Status Dokumen

Dokumen ini adalah **addendum pedoman resmi** untuk:
- `Assistant Brief — Personal Vibe Coding Assistant.md`
- `PRD_STAGE_V0_PERSONAL_VIBE_CODING_ASSISTANT.md`
- `docs/specs/spec-dokumentasi-tools/SPEC.md`

Tujuan dokumen ini adalah menetapkan **aturan tegas cara mesin (AI) menjawab** agar tidak terjadi tumpang tindih (*ambiguity*) antara:
1. **Kamus Vibe Coder** (Tanya jawab istilah, konsep abstrak, error, dan pemahaman logika).
2. **Dokumentasi & Save Tools** (Koleksi software, library, framework, atau SaaS yang siap pakai dan dapat disimpan seperti *Pesan Berbintang / Starred Messages* di WhatsApp).

---

# 1. Prinsip Utama: Dua Jalur Deteksi Niat (*Dual-Track Intent*)

Mesin harus mengenali niat pengguna melalui dua jalur deteksi:

```
                          [ PERTANYAAN / CHAT USER ]
                                      │
         ┌────────────────────────────┴────────────────────────────┐
         ▼                                                         ▼
[ JALUR 1: EXPLICIT USER CLUES ]                        [ JALUR 2: PERTANYAAN POLOS ]
User memberi sinyal konteks tools:                      User bertanya umum:
"gua nemu tools baru...", "ada library...",             "apa itu terminal?", "apa itu supabase?"
"ada SaaS menarik...", "catat tool ini..."                         │
         │                                                         ▼
         ▼                                                [ KLASIFIKASI OBJEK ]
 [ 100% PASTI TOOL ]                                               │
 Wajib buatkan `knowledge_entry`                      ┌────────────┴────────────┐
 + Munculkan Chip Simpan                              ▼                         ▼
                                              [ KONSEP / TEORI ]        [ TOOL NYATA ]
                                              (CORS, Async, Terminal)   (Supabase, Prisma)
                                                      │                         │
                                                      ▼                         ▼
                                              📖 MURNI KAMUS            📖 KAMUS +
                                              (Analogi + Diagram,       🛠️ TAWURAN SIMPAN
                                               Tanpa Chip Simpan)       (Ada Chip Simpan)
```

---

# 2. Aturan Rinci Cara Mesin Merespons

### A. Kapan WAJIB Menghasilkan `knowledge_entry` (Tawaran Simpan 📦)
Mesin **WAJIB** menyertakan objek `knowledge_entry` pada payload JSON jika:
1. **User memberikan clue eksplisit** bahwa ia sedang membahas tools/library/teknologi yang ingin dicoba/disimpan (misal: *"Gua nemu tool baru..."*, *"Ada library X nih..."*, *"Rekomendasi package buat..."*).
2. **Subjek yang ditanyakan adalah Tool/Library/SaaS konkret** yang memiliki:
   - Perintah instalasi CLI/Package manager (contoh: `npm i lucide-react`, `npx prisma`, `brew install tmux`).
   - Platform/Dashboard layanan tempat mendaftar akun (contoh: *Supabase, Vercel, Clerk, Firebase, Neon DB*).
   - Aplikasi/Software/Ekstensi (contoh: *Cursor, Docker, Postman, VS Code*).

### B. Kapan DILARANG Menghasilkan `knowledge_entry` (Murni Kamus 📖)
Mesin **TIDAK BOLEH** memunculkan `knowledge_entry` jika:
1. Subjek yang ditanyakan adalah **konsep abstrak, teori, arsitektur, atau istilah umum** (contoh: *Debounce, CORS, Asynchronous, Webhook, State Management, Polymorphism, Recursion, Hydration Error*).
2. Subjek yang ditanyakan adalah **lingkungan/istilah fundamental** tanpa niat instalasi baru (contoh: *"apa itu terminal"*, *"apa itu API"*, *"apa itu JSON"*), kecuali jika user secara eksplisit meminta dicatat.
3. Jawaban difokuskan 100% pada **analogi pemula, gambar ilustrasi kartun, dan diagram mapping**, tanpa mengotori ruang chat dengan tombol simpan yang tidak relevan.

---

# 3. Format Struktur 4-Field untuk Tool

Setiap `knowledge_entry` wajib memiliki 4 field yang ringkas dan ramah pemula (*human-friendly*):

```json
{
  "type": "tool" | "library" | "layanan" | "konsep",
  "name": "Nama Tool/Library",
  "function_summary": "1-2 kalimat fungsinya dalam bahasa santai",
  "when_to_use": "Situasi konkret kapan hal ini dipakai dalam coding",
  "how_to_start": "Cara mulai: perintah install (npm/npx) atau URL pendaftaran"
}
```

---

# 4. Konsep UX: Pesan Berbintang (*WhatsApp Starred Tools*)

Meniru pengalaman native WhatsApp:
1. **Aksi Chip Cepat:** Dibawah bubble penjelasan tool terdapat tombol chip: `[ Simpan 📦 ]`, `[ Edit ✏️ ]`, `[ Skip ❌ ]`.
2. **Indikator Berbintang:** Pesan yang telah disimpan memiliki badge bintang / paket kecil (`📦 Tersimpan ke Dokumentasi` atau `⭐`) di samping timestamp bubble.
3. **Katalog Terbintang (Starred Drawer):** Pada header ruang obrolan, terdapat icon menu **Koleksi Tools Berbintang** yang membuka panel daftar seluruh tool yang pernah disimpan pengguna tanpa perlu memanggil AI.

---

# 5. Integrasi Sistem
Addendum ini diintegrasikan ke dalam `prompt-builder.ts` sebagai bagian dari System Prompt tanpa merusak konfigurasi persona, skema database, ataupun blok respon visual yang sudah ada.
