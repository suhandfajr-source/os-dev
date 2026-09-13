import { test, expect, APIRequestContext } from '@playwright/test';
import { createClient } from '@libsql/client';
import path from 'path';
import { parseSpecResponse } from '../../src/lib/ai/spec-prompt';

/**
 * API tests untuk wizard pecah PRD (Story 4 Meja Kendali).
 *
 * CATATAN AI: guard 409 di route draft-spec berjalan SEBELUM panggilan AI,
 * jadi semua test guard aman tanpa AI. Happy-path draf (AI asli) diverifikasi
 * via smoke test manual — bukan di suite ini (flaky/mahal).
 * Parser parseSpecResponse diuji sebagai unit test (impor langsung).
 *
 * Isolasi DB: process.env.DB_PATH (diset playwright.config.ts — data/test-e2e.db).
 * Data test ber-prefix "QA-" unik, dibersihkan via DELETE (cascade).
 */

const marker = `QA-SS-${Date.now()}`;
const createdIds: string[] = [];

function db() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'assistant.db');
  return createClient({ url: 'file:' + dbPath.replace(/\\/g, '/') });
}

async function seedArtifact(projectId: string, id: string, type: string, status: string) {
  const client = db();
  await client.execute({
    sql: "INSERT INTO artifact (id, project_id, stage, type, status, content) VALUES (?, ?, 'planning', ?, ?, 'qa prd content')",
    args: [id, projectId, type, status],
  });
}

async function seedStory(projectId: string, id: string, order: number, status: string) {
  const client = db();
  await client.execute({
    sql: `INSERT INTO story (id, project_id, title, description, status, "order") VALUES (?, ?, 'QA story', 'desc', ?, ?)`,
    args: [id, projectId, status, order],
  });
}

async function cleanup(request: APIRequestContext) {
  for (const id of createdIds) {
    await request.delete(`/api/projects/${id}`);
  }
  createdIds.length = 0;
}

test.describe('Draft Spec guards (tanpa AI)', () => {
  test.afterEach(async ({ request }) => {
    await cleanup(request);
  });

  test('POST draft-spec saat PRD belum approved → 409', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} prd-draft` } });
    const { project } = await res.json();
    createdIds.push(project.id);
    await seedArtifact(project.id, `${marker}-prd`, 'prd', 'draft');

    const specRes = await request.post(`/api/projects/${project.id}/draft-spec`);
    expect(specRes.status()).toBe(409);
    const body = await specRes.json();
    expect(body.error).toContain('PRD');
  });

  test('POST draft-spec saat spec sudah approved → 409', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} spec-approved` } });
    const { project } = await res.json();
    createdIds.push(project.id);
    await seedArtifact(project.id, `${marker}-prd`, 'prd', 'approved');
    await seedArtifact(project.id, `${marker}-spec`, 'spec', 'approved');

    const specRes = await request.post(`/api/projects/${project.id}/draft-spec`);
    expect(specRes.status()).toBe(409);
    const body = await specRes.json();
    expect(body.error).toContain('Spec');
  });

  test('POST draft-spec saat ada story approved → 409 (keputusan user terlindungi)', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} story-approved` } });
    const { project } = await res.json();
    createdIds.push(project.id);
    await seedArtifact(project.id, `${marker}-prd`, 'prd', 'approved');
    await seedStory(project.id, `${marker}-s1`, 0, 'approved');

    const specRes = await request.post(`/api/projects/${project.id}/draft-spec`);
    expect(specRes.status()).toBe(409);
    const body = await specRes.json();
    expect(body.error).toContain('story');
  });

  test('POST draft-spec pada project tidak ada → 404', async ({ request }) => {
    const specRes = await request.post('/api/projects/tidak-ada/draft-spec', );
    expect(specRes.status()).toBe(404);
  });
});

test.describe('Stories CRUD', () => {
  test.afterEach(async ({ request }) => {
    await cleanup(request);
  });

  test('GET stories kosong → [] dan urut order ASC setelah seed', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} list` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const empty = await (await request.get(`/api/projects/${project.id}/stories`)).json();
    expect(empty.stories).toHaveLength(0);

    // seed acak — GET harus tetap urut order ASC (deterministik)
    await seedStory(project.id, `${marker}-s2`, 1, 'draft');
    await seedStory(project.id, `${marker}-s0`, 0, 'draft');

    const list = await (await request.get(`/api/projects/${project.id}/stories`)).json();
    expect(list.stories).toHaveLength(2);
    expect(list.stories[0].order).toBe(0);
    expect(list.stories[1].order).toBe(1);
  });

  test('PATCH story draft → 200 updated_at berubah; field tak dikenal diabaikan; approved → 409', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} patch` } });
    const { project } = await res.json();
    createdIds.push(project.id);
    await seedStory(project.id, `${marker}-sp`, 0, 'draft');

    const ok = await request.patch(`/api/stories/${marker}-sp`, {
      data: { title: `${marker} judul baru`, description: 'deskripsi baru', status: 'approved', order: 99 },
    });
    expect(ok.status()).toBe(200);
    const { story } = await ok.json();
    // field tak dikenal diabaikan — status/order tidak berubah
    expect(story.status).toBe('draft');
    expect(story.order).toBe(0);
    expect(story.title).toBe(`${marker} judul baru`);

    await request.post(`/api/stories/${marker}-sp/approve`);
    const first = await (await request.get(`/api/stories/${marker}-sp`)).json();

    const locked = await request.patch(`/api/stories/${marker}-sp`, {
      data: { title: 'coba ubah' },
    });
    expect(locked.status()).toBe(409);

    const reapprove = await request.post(`/api/stories/${marker}-sp/approve`);
    expect(reapprove.status()).toBe(200);
    const after = await (await reapprove.json()).story;
    expect(after.updated_at).toBe(first.story.updated_at);
  });

  test('PATCH title kosong / melebihi batas → 400', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} limits` } });
    const { project } = await res.json();
    createdIds.push(project.id);
    await seedStory(project.id, `${marker}-lim`, 0, 'draft');

    const empty = await request.patch(`/api/stories/${marker}-lim`, { data: { title: '   ' } });
    expect(empty.status()).toBe(400);

    const tooLong = await request.patch(`/api/stories/${marker}-lim`, {
      data: { title: 'x'.repeat(201) },
    });
    expect(tooLong.status()).toBe(400);

    const descLong = await request.patch(`/api/stories/${marker}-lim`, {
      data: { description: 'x'.repeat(20001) },
    });
    expect(descLong.status()).toBe(400);
  });

  test('approve story tidak ada → 404; GET project tidak ada → 404', async ({ request }) => {
    const approveRes = await request.post('/api/stories/tidak-ada/approve');
    expect(approveRes.status()).toBe(404);

    const listRes = await request.get('/api/projects/tidak-ada/stories');
    expect(listRes.status()).toBe(404);
  });
});

test.describe('parseSpecResponse (unit)', () => {
  test('JSON valid → parsed', () => {
    const raw = JSON.stringify({
      spec_markdown: '# Spec\nKriteria selesai per story: ...',
      stories: [{ title: 'S1', description: 'desc' }],
    });
    const parsed = parseSpecResponse(raw);
    expect(parsed.spec_markdown).toContain('Spec');
    expect(parsed.stories).toHaveLength(1);
  });

  test('JSON dalam code fence → tetap diparse', () => {
    const raw = '```json\n' + JSON.stringify({ spec_markdown: 'isi', stories: [{ title: 't', description: 'd' }] }) + '\n```';
    const parsed = parseSpecResponse(raw);
    expect(parsed.stories).toHaveLength(1);
  });

  test('stories array kosong → throw (tidak boleh lolos)', () => {
    const raw = JSON.stringify({ spec_markdown: 'isi', stories: [] });
    expect(() => parseSpecResponse(raw)).toThrow(/story/i);
  });

  test('stories bukan array / elemen tanpa title → throw', () => {
    expect(() => parseSpecResponse(JSON.stringify({ spec_markdown: 'isi', stories: 'bukan array' }))).toThrow();
    expect(() =>
      parseSpecResponse(JSON.stringify({ spec_markdown: 'isi', stories: [{ title: '', description: 'd' }] }))
    ).toThrow();
  });

  test('spec_markdown kosong → throw', () => {
    expect(() => parseSpecResponse(JSON.stringify({ spec_markdown: '', stories: [{ title: 't', description: 'd' }] }))).toThrow();
  });

  test('bukan JSON → throw', () => {
    expect(() => parseSpecResponse('ini bukan json')).toThrow();
  });
});
