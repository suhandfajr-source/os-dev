import { Project, Story } from '@/types';

/**
 * Generator Paket Handoff ke Coding Agent (Story 6 — Meja Kendali / CAP-6).
 *
 * Menggabungkan konteks proyek, spesifikasi teknis (spec), dan story target
 * beserta acceptance criteria menjadi satu dokumen Markdown utuh yang siap
 * disalin langsung ke coding agent eksternal (Claude Code, Cursor, Windsurf, pi, dll.).
 */
export function generateHandoffPackage(
  project: Project,
  story: Story,
  specContent?: string
): string {
  const projectDesc = project.description?.trim()
    ? project.description.trim()
    : '_(Tidak ada deskripsi tambahan)_';

  const specSection = specContent?.trim()
    ? specContent.trim()
    : '_(Spesifikasi teknis / arsitektur belum dibuat atau disetujui untuk proyek ini)_';

  return `# Paket Handoff — ${story.title}

> **Peran:** Bertindaklah sebagai Senior Software Engineer yang teliti dan disiplin.
> **Tujuan:** Implementasikan instruksi dan kriteria selesai pada Story Target di bawah ini, dengan mematuhi arsitektur serta konvensi proyek.

---

## 1. Konteks Proyek
- **Nama Proyek:** ${project.name}
- **Deskripsi Proyek:** ${projectDesc}
- **Story ID:** \`${story.id}\`
- **Urutan Story:** #${story.order + 1}
- **Status Saat Ini:** \`${story.status}\`

---

## 2. Story Target & Kriteria Selesai (Acceptance Criteria)

### ${story.title}

${story.description.trim()}

---

## 3. Spesifikasi Teknis / Arsitektur Proyek

${specSection}

---

## 4. Panduan Eksekusi untuk Coding Agent
1. **Fokus Tunggal:** Kerjakan HANYA apa yang diminta oleh Story Target di atas. Jangan memodifikasi fitur di luar cakupan story ini.
2. **Kepatuhan Arsitektur:** Ikuti pola arsitektur, skema data, dan batasan teknis yang tercantum pada Spesifikasi Teknis di Bagian 3.
3. **Verifikasi:** Pastikan seluruh kriteria selesai (acceptance criteria) terpenuhi dan tambahkan pengujian otomatis yang relevan.
4. **Kebersihan Kode:** Pastikan tipe TypeScript valid, tidak ada regresi pada fitur yang sudah ada, dan kode siap direview.
5. **Penutupan Loop (Changelog):** Setelah implementasi selesai dan pengujian lulus, berikan ringkasan perubahan 1–3 kalimat yang siap dicatat ke Changelog proyek di Meja Kendali.
`;
}
