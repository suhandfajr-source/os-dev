# ADDENDUM_STAGE_V0_VISUAL_ILLUSTRATION.md

## Status Dokumen

Dokumen ini adalah **addendum tambahan** untuk:

- `docs/PRD_STAGE_V0_PERSONAL_VIBE_CODING_ASSISTANT.md`
- `docs/ADDENDUM_STAGE_V0_BRIEF_ALIGNMENT.md`
- `docs/assistant-brief.md`

Dokumen ini **tidak mengganti PRD utama** dan **tidak meminta implementasi diulang dari nol**.

Tujuan dokumen ini adalah menyesuaikan Stage V0 agar **selaras dengan brief pembelajaran visual** yang diinginkan user:

> selain penjelasan teks dan mapping, assistant juga dapat menghasilkan **gambar ilustrasi unik bergaya kartun** untuk membantu user membayangkan suatu konsep.

Jika ada konflik dengan keputusan sebelumnya yang menyatakan:

> “V0 tidak perlu AI image generation”

maka **untuk area visual learning, dokumen addendum ini yang berlaku**.

---

# 1. Tujuan Perubahan

Sebelumnya, visual learning layer V0 diarahkan terutama ke:

- Mermaid
- mapping
- mind map
- flowchart
- hierarchy
- concept diagram

Keputusan itu **belum sepenuhnya memenuhi** brief asli assistant.

Brief menginginkan bahwa ketika suatu konsep lebih mudah dipahami dengan perumpamaan visual, assistant dapat menampilkan:

- gambar ilustrasi;
- bergaya kartun / unik / playful;
- mudah dipahami;
- tidak terlalu realistis;
- membantu user membayangkan analogi.

Contoh:

- CLI divisualisasikan seperti **loket**
- API divisualisasikan seperti **waiter / perantara**
- database divisualisasikan seperti **gudang / rak arsip**
- middleware divisualisasikan seperti **satpam / gerbang pemeriksaan**
- auth divisualisasikan seperti **pemeriksaan identitas**
- Git divisualisasikan seperti **riwayat / mesin waktu / checkpoint**

---

# 2. Prinsip Visual Learning V0

Mulai addendum ini, visual learning layer V0 memiliki **dua jenis output visual**:

## 2.1 Illustration Visual

Digunakan untuk membantu user **membayangkan analogi**.

Bentuknya:

- gambar ilustrasi AI;
- gaya kartun unik;
- sederhana;
- fokus pada ide;
- tidak terlalu detail;
- friendly untuk newbie.

## 2.2 Mapping Visual

Digunakan untuk membantu user **memahami hubungan konsep secara teknis**.

Bentuknya:

- Mermaid flowchart;
- mind map;
- relationship map;
- hierarchy;
- sequence sederhana;
- architecture mini.

Ringkasnya:

```text
Illustration
→ membantu user membayangkan

Mapping
→ membantu user memahami hubungan
```

Keduanya dapat muncul dalam satu jawaban jika memang berguna.

---

# 3. Bukan Setiap Jawaban Harus Punya Gambar

V0 **tidak mengharuskan setiap response menghasilkan ilustrasi**.

Illustration bersifat **opsional dan kontekstual**.

Sistem perlu menilai:

```text
Apakah topik ini akan jauh lebih mudah dipahami jika divisualisasikan dengan analogi?
```

Jika ya:

- buat ilustrasi.

Jika tidak:

- cukup dengan teks dan/atau mapping.

Contoh:

## Cocok memakai illustration

- “CLI itu apa?”
- “API itu apa?”
- “Database itu apa?”
- “Middleware itu apa?”
- “Frontend vs backend”
- “Server itu apa?”

## Biasanya tidak wajib illustration

- error spesifik yang sangat teknis;
- pertanyaan follow-up kecil;
- perbaikan syntax;
- jawaban singkat yang cukup dijelaskan lewat teks;
- debugging detail yang lebih butuh langkah penyelesaian daripada analogi visual.

Namun implementasi tetap boleh membuat ilustrasi jika memang sangat membantu.

---

# 4. Posisi Illustration dalam Flow Jawaban

Flow ideal V0 untuk istilah/konsep baru:

```text
Persona intro
    ↓
Analogi sederhana
    ↓
Illustration (jika perlu)
    ↓
Penjelasan super sederhana
    ↓
Mapping / diagram (jika perlu)
    ↓
Penjelasan mapping
    ↓
Fun fact (opsional)
    ↓
Try it / tindakan kecil (opsional)
    ↓
Ajakan follow-up
```

Tidak harus kaku persis seperti ini.

Urutan dapat disesuaikan, tetapi prinsip besarnya tetap sama.

---

# 5. Visual Style Default untuk Illustration

Jika `assistant-brief.md` tidak memberikan style visual yang lebih spesifik, gunakan default style berikut:

- cartoon
- unique
- playful
- clean
- friendly
- easy to understand
- simple composition
- not too childish
- not photorealistic
- concept-focused
- suitable for learning
- slightly whimsical but still clear

Deskripsi ringkasnya:

> **cute conceptual cartoon explainer illustration**

Hindari gaya default berikut kecuali diminta:

- photorealistic;
- hyper-detailed fantasy art;
- dark dramatic poster;
- anime complex scene;
- cluttered infographic poster;
- visual yang terlalu ramai dan membuat konsep jadi kabur.

---

# 6. Illustration Prompting Principle

Illustration harus mengikuti fungsi belajar, bukan sekadar dekorasi.

Setiap prompt ilustrasi harus mengutamakan:

1. **konsep apa yang mau dibayangkan user;**
2. **analogi apa yang sedang dipakai;**
3. **objek utama apa yang harus terlihat;**
4. **hubungan antar objek;**
5. **kesan visual yang unik, kartun, dan mudah dipahami.**

Contoh konsep internal:

## CLI

```text
Cute cartoon illustration of a user standing at a command booth or service counter,
handing a written command to a clerk at the booth,
with a computer system or control room behind the booth.
Playful, clean, simple, concept-explainer style.
```

## API

```text
Cute cartoon restaurant scene where a customer gives an order to a waiter,
and the waiter passes the order to the kitchen.
Use this as an analogy for API as a middleman.
Playful, clear, friendly explainer illustration.
```

## Database

```text
Cute cartoon archive warehouse with shelves and labeled boxes of information,
and a staff member retrieving a box when requested.
Simple, educational, playful, easy to understand.
```

Catatan:
- prompt di atas hanyalah contoh konsep;
- implementasi boleh membuat prompt dinamis berdasarkan response plan;
- prompt final tidak perlu ditampilkan mentah ke user.

---

# 7. Structured Response Harus Ditambah Illustration Block

Karena V0 sekarang mendukung generated illustration, structured response perlu diperluas.

Contoh type:

```ts
type AssistantResponse = {
  persona: {
    id: string
    name: string
    title: string
  }
  blocks: ResponseBlock[]
}
```

Tambahkan block berikut:

```ts
type ResponseBlock =
  | {
      type: "markdown"
      content: string
    }
  | {
      type: "illustration"
      prompt: string
      alt?: string
      caption?: string
    }
  | {
      type: "mermaid"
      code: string
      caption?: string
    }
  | {
      type: "fun_fact"
      content: string
    }
  | {
      type: "try_it"
      title?: string
      steps: string[]
    }
```

Catatan penting:

- `illustration` block adalah **instruksi/hasil terstruktur di level server/runtime**, bukan sekadar teks.
- UI perlu bisa menampilkan hasil gambar pada posisi block tersebut.
- response tidak wajib selalu mengandung `illustration`.

---

# 8. Illustration Generation Pipeline

Tambahkan pipeline generasi gambar yang ringan dan modular.

Flow yang direkomendasikan:

```text
User Message
    ↓
Persona Router
    ↓
Prompt Builder
    ↓
LLM Response Planner
    ↓
Structured Response Plan
    ├── markdown blocks
    ├── illustration blocks
    ├── mermaid blocks
    ├── fun_fact blocks
    └── try_it blocks
    ↓
Response Orchestrator
    ├── generate illustration blocks
    └── pass mermaid blocks to renderer
    ↓
Persist final response
    ↓
Render in chat UI
```

Perlu ada pemisahan yang jelas antara:

- **LLM perencana isi jawaban**
- **service pembuat ilustrasi**
- **renderer UI**

Jangan menaruh seluruh logic generation langsung di component React.

---

# 9. Image Generation Scope untuk V0

Untuk menjaga V0 tetap ringan:

- illustration digunakan hanya sebagai **learning aid**;
- bukan fitur image studio umum;
- user tidak perlu bisa meminta edit gambar;
- tidak perlu gallery visual;
- tidak perlu style picker;
- tidak perlu history terpisah khusus gambar;
- tidak perlu download management kompleks;
- tidak perlu image regeneration control yang rumit.

Cukup:

- assistant menghasilkan illustration ketika diperlukan;
- gambar tampil inline di chat;
- gambar tersimpan sebagai bagian dari conversation.

---

# 10. UI Rendering Requirement

Jika response memiliki illustration block, UI harus dapat:

- menampilkan gambar inline di dalam chat;
- menjaga urutan block sesuai response;
- menampilkan caption bila ada;
- menampilkan alt text bila diperlukan;
- tetap rapi di desktop;
- tetap terbaca saat ada kombinasi markdown + image + mermaid.

Contoh urutan render:

```text
[Persona Indicator]
[Markdown intro]
[Illustration]
[Markdown explanation]
[Mermaid mapping]
[Markdown explanation]
[Fun Fact]
[Try It]
[Closing]
```

---

# 11. Persistence Requirement

Karena illustration menjadi bagian dari conversation, persistence perlu diperluas.

Setiap assistant response sebaiknya menyimpan:

- response payload structured response;
- searchable text;
- metadata persona;
- reference ke generated image jika ada.

Implementasi sederhana yang direkomendasikan:

- simpan `response_payload` sebagai JSON;
- untuk block `illustration`, simpan hasil final image URL/path di payload final setelah generation selesai;
- simpan file image di storage yang dipakai project;
- tetap pertahankan searchable text terpisah.

Contoh konsep payload final:

```json
{
  "persona": {
    "id": "winston",
    "name": "Winston",
    "title": "Architect"
  },
  "blocks": [
    {
      "type": "markdown",
      "content": "Hai Suhandi..."
    },
    {
      "type": "illustration",
      "imageUrl": "/generated/cli-counter-001.png",
      "alt": "Cartoon illustration of CLI as a service counter",
      "caption": "Bayangin CLI seperti loket perintah."
    },
    {
      "type": "markdown",
      "content": "Nah, CLI itu kurang lebih..."
    }
  ]
}
```

Jika implementasi membutuhkan phase:

- plan response dulu;
- generate image;
- finalise payload;

itu diperbolehkan dan justru direkomendasikan.

---

# 12. Search Compatibility

Search conversation tetap tidak perlu embeddings.

Namun ilustrasi tidak boleh membuat fitur search rusak.

Jadi:

- searchable text harus tetap dihasilkan dari isi text/markdown/fun_fact/try_it;
- caption/alt ilustrasi boleh ikut dimasukkan ke searchable text jika membantu;
- pencarian tetap berbasis title + plain text conversation.

---

# 13. Fallback Behavior

Image generation adalah fitur penting, tetapi V0 tetap harus tahan gagal.

Jika illustration gagal digenerate:

- jangan membuat seluruh response gagal;
- tetap tampilkan jawaban teks;
- jika tersedia, tampilkan placeholder ringan seperti:
  - “Ilustrasi belum berhasil dibuat.”
- mapping Mermaid dan penjelasan tetap tampil;
- log error di server untuk debugging.

Dengan kata lain:

```text
Illustration gagal
≠
Conversation gagal
```

---

# 14. Performance & Cost Awareness

Karena generasi gambar lebih berat daripada teks, implementasi perlu menjaga efisiensi.

Prinsip minimal:

- jangan generate illustration kalau tidak perlu;
- hindari lebih dari 1 illustration untuk satu response V0 kecuali sangat dibutuhkan;
- prioritaskan 1 ilustrasi utama + 1 mapping bila perlu;
- follow-up kecil sebaiknya tidak membuat illustration baru kecuali user jelas masih butuh bantuan visual;
- pertimbangkan caching hasil jika implementasinya memungkinkan dan tidak rumit.

V0 fokus ke usefulness, bukan kemewahan visual.

---

# 15. Implementation Impact

Area implementasi yang kemungkinan terdampak:

- AI response schema
- prompt builder
- response planner
- response orchestrator
- storage schema / payload persistence
- chat renderer
- asset/image storage
- server action / API flow
- search text extraction

Area yang **tidak perlu dirombak total**:

- layout utama chat;
- sidebar/history;
- rename/delete conversation;
- search title/text dasar;
- text markdown rendering;
- persona indicator (hanya mungkin perlu urutan render yang lebih lengkap).

---

# 16. Required Reconciliation from Implementor

Setelah membaca addendum ini, implementor harus menjelaskan ringkas:

```text
Already Compatible
- ...

Needs Adjustment
- ...

Files / Schema Affected
- ...

New Runtime Flow
- ...

No Change Needed
- ...
```

Setelah itu update implementation plan hanya pada area yang benar-benar terdampak.

Jangan reset proyek.
Jangan memperluas scope di luar V0.

---

# 17. Definition of Done Tambahan

Selain Definition of Done sebelumnya, V0 sekarang dianggap sesuai jika:

- [ ] assistant dapat menghasilkan illustration visual bergaya kartun unik ketika topik membutuhkannya;
- [ ] illustration tidak wajib muncul di semua jawaban;
- [ ] mapping tetap dapat ditampilkan via Mermaid;
- [ ] illustration dan mapping dapat hidup berdampingan dalam satu response;
- [ ] structured response mendukung `illustration` block;
- [ ] illustration ditampilkan inline di chat;
- [ ] illustration tersimpan sebagai bagian dari conversation;
- [ ] jika image generation gagal, text response tetap tampil;
- [ ] search conversation tetap berjalan;
- [ ] implementasi tidak berubah menjadi image generation product umum.

---

# 18. Final Instruction

Mulai addendum ini, interpretasi visual dalam `assistant-brief.md` adalah sebagai berikut:

```text
"visualisasi"
=
boleh berupa ilustrasi kartun unik
dan/atau mapping diagram
sesuai kebutuhan pembelajaran
```

Dengan demikian, V0 tidak hanya membantu user **mengerti hubungan konsep**, tetapi juga membantu user **membayangkan konsep tersebut lewat gambar yang unik dan mudah dicerna**.

Tujuan akhirnya tetap sama:

> ketika user menemukan istilah atau konsep yang membingungkan, aplikasi bukan hanya menjelaskan, tetapi juga membantu user berkata:
>
> **“Ohhh, sekarang gue kebayang.”**
