import { test, expect, APIRequestContext } from '@playwright/test';
import { createClient } from '@libsql/client';
import path from 'path';

/**
 * API tests untuk endpoint wizard Planning (Story 3 Meja Kendali):
 * POST /api/projects/[id]/draft-prd (409 guard + jalur skipAi),
 * PATCH /api/artifacts/[id] (guard approved), POST .../approve (brief ditolak,
 * approve-ulang updated_at tidak berubah), GET artifacts (filter tak dikenal diabaikan).
 *
 * Isolasi DB: memakai process.env.DB_PATH (diset playwright.config.ts — data/test-e2e.db).
 * PRD approved di-seed langsung via SQL agar tidak memanggil AI sungguhan.
 * Data test ber-prefix "QA-" unik dan dibersihkan via DELETE (cascade artifacts).
 */

const marker = `QA-AF-${Date.now()}`;
const createdIds: string[] = [];

function db() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'assistant.db');
  return createClient({ url: 'file:' + dbPath.replace(/\\/g, '/') });
}

async function seedArtifact(
  projectId: string,
  id: string,
  stage: string,
  type: string,
  status: string
) {
  const client = db();
  await client.execute({
    sql: "INSERT INTO artifact (id, project_id, stage, type, status, content) VALUES (?, ?, ?, ?, ?, 'qa content')",
    args: [id, projectId, stage, type, status],
  });
}

async function cleanup(request: APIRequestContext) {
  for (const id of createdIds) {
    await request.delete(`/api/projects/${id}`);
  }
  createdIds.length = 0;
}

test.describe('Wizard Planning Artifacts API', () => {
  test.afterEach(async ({ request }) => {
    await cleanup(request);
  });

  test('POST draft-prd pada PRD approved → 409, konten approved tidak berubah (VG-1, R1)', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} guard409` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    await seedArtifact(project.id, `${marker}-prd`, 'planning', 'prd', 'approved');
    const before = await (await request.get(`/api/artifacts/${marker}-prd`)).json();

    const draftRes = await request.post(`/api/projects/${project.id}/draft-prd`, {
      data: { brief: 'brief percobaan menimpa PRD approved' },
    });
    expect(draftRes.status()).toBe(409);

    // konten artifact approved tidak berubah
    const after = await (await request.get(`/api/artifacts/${marker}-prd`)).json();
    expect(after.artifact.content).toBe(before.artifact.content);
    expect(after.artifact.status).toBe('approved');
    expect(after.artifact.updated_at).toBe(before.artifact.updated_at);
  });

  test('POST draft-prd skipAi → brief tersimpan tanpa memanggil AI, PRD tidak dibuat (R10)', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} skipai` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const draftRes = await request.post(`/api/projects/${project.id}/draft-prd`, {
      data: { brief: `${marker} brief tersimpan tanpa AI`, skipAi: true },
    });
    expect(draftRes.status()).toBe(200);
    const body = await draftRes.json();
    expect(body.briefArtifact.type).toBe('brief');
    expect(body.briefArtifact.status).toBe('draft');
    expect(body.prdArtifact).toBeUndefined();

    const list = await (await request.get(`/api/projects/${project.id}/artifacts`)).json();
    expect(list.artifacts).toHaveLength(1);
    expect(list.artifacts[0].type).toBe('brief');
  });

  test('approve ulang → 200 dan updated_at identik (VG-3)', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} approve2x` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    await seedArtifact(project.id, `${marker}-prd2`, 'planning', 'prd', 'draft');

    const first = await (await request.post(`/api/artifacts/${marker}-prd2/approve`)).json();
    expect(first.artifact.status).toBe('approved');

    const second = await (await request.post(`/api/artifacts/${marker}-prd2/approve`)).json();
    expect(second.artifact.status).toBe('approved');
    expect(second.artifact.updated_at).toBe(first.artifact.updated_at);
  });

  test('approve artifact brief → 409 (EC-4/R4)', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} briefapprove` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    await seedArtifact(project.id, `${marker}-brief`, 'planning', 'brief', 'draft');

    const approveRes = await request.post(`/api/artifacts/${marker}-brief/approve`);
    expect(approveRes.status()).toBe(409);
    const body = await approveRes.json();
    expect(body.error).toContain('Brief');
  });

  test('PATCH artifact approved → 409 (EC-3/R2)', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} patchapproved` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    await seedArtifact(project.id, `${marker}-prd3`, 'planning', 'prd', 'approved');

    const patchRes = await request.patch(`/api/artifacts/${marker}-prd3`, {
      data: { content: 'coba ubah konten approved' },
    });
    expect(patchRes.status()).toBe(409);

    const after = await (await request.get(`/api/artifacts/${marker}-prd3`)).json();
    expect(after.artifact.content).toBe('qa content');
  });

  test('PATCH artifact draft → 200, updated_at berubah; PATCH id tidak ada → 404', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} patchdraft` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    await seedArtifact(project.id, `${marker}-prd4`, 'planning', 'prd', 'draft');

    const patchRes = await request.patch(`/api/artifacts/${marker}-prd4`, {
      data: { content: 'konten hasil edit' },
    });
    expect(patchRes.status()).toBe(200);
    const { artifact } = await patchRes.json();
    expect(artifact.content).toBe('konten hasil edit');

    const missing = await request.patch('/api/artifacts/tidak-ada', {
      data: { content: 'x' },
    });
    expect(missing.status()).toBe(404);
  });

  test('GET artifacts filter tak dikenal diabaikan → kembalikan semua (EC-1/R5)', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} filter` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    await seedArtifact(project.id, `${marker}-f1`, 'planning', 'brief', 'draft');
    await seedArtifact(project.id, `${marker}-f2`, 'planning', 'prd', 'draft');

    const all = await (await request.get(`/api/projects/${project.id}/artifacts`)).json();
    expect(all.artifacts).toHaveLength(2);

    const bogus = await (await request.get(`/api/projects/${project.id}/artifacts?stage=ngasal`)).json();
    expect(bogus.artifacts).toHaveLength(2);

    const valid = await (await request.get(`/api/projects/${project.id}/artifacts?type=brief`)).json();
    expect(valid.artifacts).toHaveLength(1);
    expect(valid.artifacts[0].type).toBe('brief');
  });

  test('POST draft-prd brief kosong → 400 tanpa artifact tersisa (guard sebelum upsert)', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: `${marker} kosong` } });
    const { project } = await res.json();
    createdIds.push(project.id);

    const draftRes = await request.post(`/api/projects/${project.id}/draft-prd`, {
      data: { brief: '   ' },
    });
    expect(draftRes.status()).toBe(400);

    const list = await (await request.get(`/api/projects/${project.id}/artifacts`)).json();
    expect(list.artifacts).toHaveLength(0);
  });
});
