import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API tests untuk /api/projects dan /api/projects/[id] (Story 1 Meja Kendali).
 * Semua data test diberi nama unik ber-prefix "QA-" lalu dihapus di cleanup
 * agar data/assistant.db (DB asli) tetap bersih.
 */

const marker = `QA-${Date.now()}`;
const createdIds: string[] = [];

async function cleanup(request: APIRequestContext) {
  for (const id of createdIds) {
    await request.delete(`/api/projects/${id}`);
  }
  createdIds.length = 0;
}

test.describe('Projects API', () => {
  test.afterEach(async ({ request }) => {
    await cleanup(request);
  });

  test('GET /api/projects mengembalikan 200 dan struktur { projects: [...] }', async ({ request }) => {
    const res = await request.get('/api/projects');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.projects)).toBe(true);
  });

  test('POST /api/projects membuat proyek → 201 lengkap dengan id dan timestamps', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: `${marker} create`, description: 'deskripsi QA' },
    });
    expect(res.status()).toBe(201);
    const { project } = await res.json();
    createdIds.push(project.id);
    expect(project.id).toBeTruthy();
    expect(project.name).toBe(`${marker} create`);
    expect(project.description).toBe('deskripsi QA');
    expect(project.created_at).toBeTruthy();
    expect(project.updated_at).toBeTruthy();
  });

  test('POST /api/projects dengan nama kosong/hanya spasi → 400 { error }', async ({ request }) => {
    const res = await request.post('/api/projects', { data: { name: '   ' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('proyek yang dibuat persisten: GET /api/projects/[id] → 200', async ({ request }) => {
    const create = await request.post('/api/projects', {
      data: { name: `${marker} persist` },
    });
    const { project } = await create.json();
    createdIds.push(project.id);

    const res = await request.get(`/api/projects/${project.id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.project.id).toBe(project.id);
    expect(body.project.name).toBe(`${marker} persist`);
  });

  test('GET /api/projects/[id] dengan id tidak ada → 404', async ({ request }) => {
    const res = await request.get('/api/projects/id-tidak-ada-qa');
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('PATCH /api/projects/[id] memperbarui nama+deskripsi dan membump updated_at', async ({ request }) => {
    const create = await request.post('/api/projects', {
      data: { name: `${marker} sebelum` },
    });
    const { project } = await create.json();
    createdIds.push(project.id);

    // pastikan timestamp detik-nya berjalan sebelum edit
    await new Promise((r) => setTimeout(r, 1200));

    const res = await request.patch(`/api/projects/${project.id}`, {
      data: { name: `${marker} sesudah`, description: 'sudah diedit' },
    });
    expect(res.status()).toBe(200);
    const { project: updated } = await res.json();
    expect(updated.name).toBe(`${marker} sesudah`);
    expect(updated.description).toBe('sudah diedit');
    expect(new Date(updated.updated_at.replace(' ', 'T')).getTime())
      .toBeGreaterThanOrEqual(new Date(project.created_at.replace(' ', 'T')).getTime());
  });

  test('PATCH tanpa field valid → 400; PATCH id tidak ada → 404', async ({ request }) => {
    const create = await request.post('/api/projects', { data: { name: `${marker} patch` } });
    const { project } = await create.json();
    createdIds.push(project.id);

    const invalid = await request.patch(`/api/projects/${project.id}`, { data: { name: 123 } });
    expect(invalid.status()).toBe(400);

    const missing = await request.patch('/api/projects/id-tidak-ada-qa', {
      data: { name: 'apa saja' },
    });
    expect(missing.status()).toBe(404);
  });

  test('DELETE menghapus proyek → 200 { ok: true }, GET berikutnya 404, DELETE ulang 404', async ({ request }) => {
    const create = await request.post('/api/projects', { data: { name: `${marker} del` } });
    const { project } = await create.json();
    createdIds.push(project.id);

    const del = await request.delete(`/api/projects/${project.id}`);
    expect(del.status()).toBe(200);
    expect((await del.json()).ok).toBe(true);

    const after = await request.get(`/api/projects/${project.id}`);
    expect(after.status()).toBe(404);

    const delAgain = await request.delete(`/api/projects/${project.id}`);
    expect(delAgain.status()).toBe(404);
  });

  test('proyek yang diedit naik ke urutan teratas daftar (urut updated_at DESC)', async ({ request }) => {
    const a = await (await request.post('/api/projects', { data: { name: `${marker} A` } })).json();
    createdIds.push(a.project.id);
    await new Promise((r) => setTimeout(r, 1200));
    const b = await (await request.post('/api/projects', { data: { name: `${marker} B` } })).json();
    createdIds.push(b.project.id);

    // B paling baru, jadi paling atas. Edit A agar A naik ke atas.
    await new Promise((r) => setTimeout(r, 1200));
    await request.patch(`/api/projects/${a.project.id}`, { data: { description: 'bump' } });

    const list = await (await request.get('/api/projects')).json();
    const names: string[] = list.projects.map((p: { name: string }) => p.name);
    expect(names.indexOf(`${marker} A`)).toBeLessThan(names.indexOf(`${marker} B`));
  });
});
