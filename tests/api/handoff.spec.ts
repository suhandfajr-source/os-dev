import { test, expect, APIRequestContext } from '@playwright/test';
import { createClient } from '@libsql/client';
import path from 'path';

/**
 * Tests untuk Paket Handoff ke Coding Agent (Story 6 Meja Kendali / CAP-6).
 *
 * Menguji:
 * 1. Story approved/doing/done menghasilkan paket handoff markdown 200.
 * 2. Guard 409: story draft ditolak sebelum disetujui.
 * 3. 404 untuk story yang tidak ada.
 * 4. Kelengkapan konten: nama proyek, story title, kriteria selesai, spec arsitektur, instruksi agent.
 * 5. Fallback jika proyek belum memiliki artifact spec.
 */

const marker = `QA-HO-${Date.now()}`;
const createdIds: string[] = [];

function db() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'assistant.db');
  return createClient({ url: 'file:' + dbPath.replace(/\\/g, '/') });
}

async function seedStory(projectId: string, id: string, order: number, status: string, title = 'QA Story', desc = 'QA Acceptance criteria') {
  const client = db();
  await client.execute({
    sql: `INSERT INTO story (id, project_id, title, description, status, "order") VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, projectId, title, desc, status, order],
  });
}

async function seedArtifact(projectId: string, id: string, type: string, status: string, content = 'QA Spec Content Arsitektur') {
  const client = db();
  await client.execute({
    sql: `INSERT INTO artifact (id, project_id, stage, type, status, content) VALUES (?, ?, 'planning', ?, ?, ?)`,
    args: [id, projectId, type, status, content],
  });
}

async function cleanup(request: APIRequestContext) {
  for (const id of createdIds) {
    await request.delete(`/api/projects/${id}`);
  }
  createdIds.length = 0;
}

test.describe('Handoff Package API (Story 6)', () => {
  test.afterEach(async ({ request }) => {
    await cleanup(request);
  });

  test('Story approved menghasilkan paket handoff lengkap → 200', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: `${marker} Proyek Handoff`, description: 'Deskripsi pengujian handoff' },
    });
    const { project } = await res.json();
    createdIds.push(project.id);

    const storyId = `${marker}-story-appr`;
    await seedStory(project.id, storyId, 0, 'approved', 'Fitur Pembayaran', 'Kriteria: harus bisa transfer QRIS');
    await seedArtifact(project.id, `${marker}-spec`, 'spec', 'approved', '## Arsitektur Sistem\nDatabase SQLite WAL mode');

    const hoRes = await request.get(`/api/stories/${storyId}/handoff`);
    expect(hoRes.status()).toBe(200);

    const { handoff, story } = await hoRes.json();
    expect(story.id).toBe(storyId);
    expect(story.status).toBe('approved');

    // Verifikasi struktur markdown
    expect(handoff).toContain('# Paket Handoff — Fitur Pembayaran');
    expect(handoff).toContain(`${marker} Proyek Handoff`);
    expect(handoff).toContain('Kriteria: harus bisa transfer QRIS');
    expect(handoff).toContain('## Arsitektur Sistem');
    expect(handoff).toContain('Database SQLite WAL mode');
    expect(handoff).toContain('Panduan Eksekusi untuk Coding Agent');
  });

  test('Story doing dan done dapat digenerate handoff-nya → 200', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: `${marker} Proyek Doing Done` },
    });
    const { project } = await res.json();
    createdIds.push(project.id);

    const storyIdDoing = `${marker}-story-doing`;
    const storyIdDone = `${marker}-story-done`;
    await seedStory(project.id, storyIdDoing, 0, 'doing', 'Story Sedang Jalan', 'AC doing');
    await seedStory(project.id, storyIdDone, 1, 'done', 'Story Selesai', 'AC done');

    const resDoing = await request.get(`/api/stories/${storyIdDoing}/handoff`);
    expect(resDoing.status()).toBe(200);
    const dataDoing = await resDoing.json();
    expect(dataDoing.handoff).toContain('Story Sedang Jalan');

    const resDone = await request.get(`/api/stories/${storyIdDone}/handoff`);
    expect(resDone.status()).toBe(200);
    const dataDone = await resDone.json();
    expect(dataDone.handoff).toContain('Story Selesai');
  });

  test('Story draft ditolak membuat handoff → 409', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: `${marker} Proyek Draft` },
    });
    const { project } = await res.json();
    createdIds.push(project.id);

    const storyIdDraft = `${marker}-story-draft`;
    await seedStory(project.id, storyIdDraft, 0, 'draft', 'Story Belum Disetujui', 'AC draft');

    const hoRes = await request.get(`/api/stories/${storyIdDraft}/handoff`);
    expect(hoRes.status()).toBe(409);
    const body = await hoRes.json();
    expect(body.error).toContain('disetujui');
  });

  test('Story ID tidak ada → 404', async ({ request }) => {
    const hoRes = await request.get(`/api/stories/non-existent-story-id/handoff`);
    expect(hoRes.status()).toBe(404);
  });

  test('Proyek tanpa spec artifact tetap menghasilkan handoff dengan fallback catatan → 200', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: `${marker} Proyek Tanpa Spec` },
    });
    const { project } = await res.json();
    createdIds.push(project.id);

    const storyId = `${marker}-story-no-spec`;
    await seedStory(project.id, storyId, 0, 'approved', 'Story Tanpa Spec', 'Kriteria mandiri');

    const hoRes = await request.get(`/api/stories/${storyId}/handoff`);
    expect(hoRes.status()).toBe(200);
    const { handoff } = await hoRes.json();
    expect(handoff).toContain('Story Tanpa Spec');
    expect(handoff).toContain('Spesifikasi teknis / arsitektur belum dibuat');
  });
});
