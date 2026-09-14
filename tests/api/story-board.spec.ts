import { test, expect, APIRequestContext } from '@playwright/test';
import { createClient } from '@libsql/client';
import path from 'path';

/**
 * Tests untuk Story Board + Changelog (Story 5 Meja Kendali).
 *
 * Menguji:
 * 1. Transisi status story: approved → doing → done, serta buka ulang (done → doing).
 * 2. Guard transisi: draft → doing ditolak 409, status tak dikenal 400, id tidak ada 404.
 * 3. Kuncian konten: story doing/done tidak bisa diedit title/desc-nya (409).
 * 4. Kuncian draft-spec: regenerasi terkunci jika ada story doing/done (409).
 * 5. Changelog: append-only, validasi note (kosong/whitespace/panjang > 2000), urutan created_at DESC, cascade delete saat project dihapus.
 */

const marker = `QA-SB-${Date.now()}`;
const createdIds: string[] = [];

function db() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'assistant.db');
  return createClient({ url: 'file:' + dbPath.replace(/\\/g, '/') });
}

async function seedStory(projectId: string, id: string, order: number, status: string) {
  const client = db();
  await client.execute({
    sql: `INSERT INTO story (id, project_id, title, description, status, "order") VALUES (?, ?, 'QA story', 'desc', ?, ?)`,
    args: [id, projectId, status, order],
  });
}

async function seedArtifact(projectId: string, id: string, type: string, status: string) {
  const client = db();
  await client.execute({
    sql: `INSERT INTO artifact (id, project_id, stage, type, status, content) VALUES (?, ?, 'planning', ?, ?, 'konten qa')`,
    args: [id, projectId, type, status],
  });
}

async function cleanup(request: APIRequestContext) {
  for (const id of createdIds) {
    await request.delete(`/api/projects/${id}`);
  }
  createdIds.length = 0;
}

test.describe('Story Board Status Transition API', () => {
  test.afterEach(async ({ request }) => {
    await cleanup(request);
  });

  test('Mulai kerja: story approved → PATCH doing → 200 & status doing', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} sb-start` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const storyId = `${marker}-story-1`;
    await seedStory(project.id, storyId, 0, 'approved');

    const patchRes = await request.patch(`/api/stories/${storyId}/status`, {
      data: { status: 'doing' },
    });
    expect(patchRes.status()).toBe(200);
    const { story } = await patchRes.json();
    expect(story.id).toBe(storyId);
    expect(story.status).toBe('doing');
  });

  test('Selesaikan story: story doing → PATCH done → 200 & status done', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} sb-complete` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const storyId = `${marker}-story-2`;
    await seedStory(project.id, storyId, 0, 'doing');

    const patchRes = await request.patch(`/api/stories/${storyId}/status`, {
      data: { status: 'done' },
    });
    expect(patchRes.status()).toBe(200);
    const { story } = await patchRes.json();
    expect(story.status).toBe('done');
  });

  test('Buka ulang story: story done → PATCH doing → 200 & status doing', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} sb-reopen` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const storyId = `${marker}-story-3`;
    await seedStory(project.id, storyId, 0, 'done');

    const patchRes = await request.patch(`/api/stories/${storyId}/status`, {
      data: { status: 'doing' },
    });
    expect(patchRes.status()).toBe(200);
    const { story } = await patchRes.json();
    expect(story.status).toBe('doing');
  });

  test('Transisi story draft langsung ke doing/done ditolak → 409', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} sb-draft-guard` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const storyId = `${marker}-story-4`;
    await seedStory(project.id, storyId, 0, 'draft');

    const patchRes = await request.patch(`/api/stories/${storyId}/status`, {
      data: { status: 'doing' },
    });
    expect(patchRes.status()).toBe(409);
    const body = await patchRes.json();
    expect(body.error).toContain('disetujui');
  });

  test('Target status tak dikenal / tidak valid → 400', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} sb-invalid-status` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const storyId = `${marker}-story-5`;
    await seedStory(project.id, storyId, 0, 'approved');

    // status random
    const res1 = await request.patch(`/api/stories/${storyId}/status`, {
      data: { status: 'reviewing' },
    });
    expect(res1.status()).toBe(400);

    // status draft (hanya boleh doing | done)
    const res2 = await request.patch(`/api/stories/${storyId}/status`, {
      data: { status: 'draft' },
    });
    expect(res2.status()).toBe(400);

    // body bukan object
    const res3 = await request.patch(`/api/stories/${storyId}/status`, {
      data: 'invalid json body',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res3.status()).toBe(400);
  });

  test('PATCH status pada story id tidak ada → 404', async ({ request }) => {
    const res = await request.patch(`/api/stories/non-existent-id/status`, {
      data: { status: 'doing' },
    });
    expect(res.status()).toBe(404);
  });

  test('Story doing/done terkunci dari edit judul/deskripsi → 409', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} sb-lock-edit` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const storyIdDoing = `${marker}-story-doing`;
    await seedStory(project.id, storyIdDoing, 0, 'doing');

    const patchEdit = await request.patch(`/api/stories/${storyIdDoing}`, {
      data: { title: 'Judul Diubah' },
    });
    expect(patchEdit.status()).toBe(409);
  });

  test('Story doing/done mengunci regenerasi draft-spec → 409', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} sb-lock-spec` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    await seedArtifact(project.id, `${marker}-prd`, 'prd', 'approved');
    await seedStory(project.id, `${marker}-story-done`, 0, 'done');

    const specRes = await request.post(`/api/projects/${project.id}/draft-spec`);
    expect(specRes.status()).toBe(409);
    const body = await specRes.json();
    expect(body.error).toContain('story');
  });
});

test.describe('Changelog Append-Only API', () => {
  test.afterEach(async ({ request }) => {
    await cleanup(request);
  });

  test('POST /api/projects/[id]/changelog menambah catatan → 201', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} cl-create` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const clRes = await request.post(`/api/projects/${project.id}/changelog`, {
      data: { note: 'Keputusan arsitektur: gunakan SQLite WAL mode' },
    });
    expect(clRes.status()).toBe(201);
    const { entry } = await clRes.json();
    expect(entry.project_id).toBe(project.id);
    expect(entry.note).toBe('Keputusan arsitektur: gunakan SQLite WAL mode');
    expect(entry.id).toBeTruthy();
    expect(entry.created_at).toBeTruthy();
  });

  test('POST catatan kosong / whitespace saja → 400', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} cl-empty` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const resEmpty = await request.post(`/api/projects/${project.id}/changelog`, {
      data: { note: '   ' },
    });
    expect(resEmpty.status()).toBe(400);

    const resNoField = await request.post(`/api/projects/${project.id}/changelog`, {
      data: {},
    });
    expect(resNoField.status()).toBe(400);
  });

  test('POST catatan melebihi 2.000 karakter → 400', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} cl-max-len` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const longNote = 'a'.repeat(2001);
    const clRes = await request.post(`/api/projects/${project.id}/changelog`, {
      data: { note: longNote },
    });
    expect(clRes.status()).toBe(400);
    const body = await clRes.json();
    expect(body.error).toContain('2.000');
  });

  test('POST changelog ke project tidak ada → 404', async ({ request }) => {
    const clRes = await request.post(`/api/projects/non-existent-id/changelog`, {
      data: { note: 'test' },
    });
    expect(clRes.status()).toBe(404);
  });

  test('GET changelog mengembalikan daftar urut terbaru dulu (created_at DESC)', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} cl-order` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    // Buat 2 catatan berurutan
    await request.post(`/api/projects/${project.id}/changelog`, {
      data: { note: 'Catatan 1 — fondasi' },
    });
    await request.post(`/api/projects/${project.id}/changelog`, {
      data: { note: 'Catatan 2 — implementasi' },
    });

    const getRes = await request.get(`/api/projects/${project.id}/changelog`);
    expect(getRes.status()).toBe(200);
    const { entries } = await getRes.json();
    expect(entries.length).toBe(2);
    // Terbaru di atas
    expect(entries[0].note).toBe('Catatan 2 — implementasi');
    expect(entries[1].note).toBe('Catatan 1 — fondasi');
  });

  test('GET changelog ke project tidak ada → 404', async ({ request }) => {
    const getRes = await request.get(`/api/projects/non-existent-id/changelog`);
    expect(getRes.status()).toBe(404);
  });

  test('Cascade delete: saat project dihapus, entri changelog ikut terhapus', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} cl-cascade` } });
    const { project } = await res.json();

    await request.post(`/api/projects/${project.id}/changelog`, {
      data: { note: 'Catatan sebelum hapus' },
    });

    // Hapus project
    const delRes = await request.delete(`/api/projects/${project.id}`);
    expect(delRes.status()).toBe(200);

    // Cek di DB langsung bahwa changelog hilang
    const client = db();
    const clRows = await client.execute({
      sql: `SELECT * FROM changelog WHERE project_id = ?`,
      args: [project.id],
    });
    expect(clRows.rows.length).toBe(0);
  });
});
