import { test, expect, APIRequestContext } from '@playwright/test';
import { createClient } from '@libsql/client';
import path from 'path';

/**
 * API tests untuk GET /api/projects/status (Story 2 Meja Kendali — Status Tahapan).
 * Aturan derivasi yang dijaga (kontrak elicitation):
 *   selesai  = >=1 artifact status 'approved' di stage itu
 *   draf     = >=1 artifact 'draft' tanpa approved
 *   belum_dimulai = tanpa artifact
 * Di R1 hanya planning & development yang dihitung; 4 tahap lain selalu
 * belum_dimulai. Data test dibuat langsung ke data/assistant.db (insert artifact)
 * lalu dibersihkan via DELETE /api/projects/[id] (cascade artifacts).
 */

const marker = `QA-ST-${Date.now()}`;
const createdIds: string[] = [];

function db() {
  return createClient({
    url: 'file:' + path.join(process.cwd(), 'data', 'assistant.db').replace(/\\/g, '/'),
  });
}

async function seedArtifact(
  projectId: string,
  id: string,
  stage: string,
  status: string
) {
  const client = db();
  await client.execute({
    sql: "INSERT INTO artifact (id, project_id, stage, type, status, content) VALUES (?, ?, ?, 'test', ?, 'qa')",
    args: [id, projectId, stage, status],
  });
}

async function cleanup(request: APIRequestContext) {
  for (const id of createdIds) {
    await request.delete(`/api/projects/${id}`);
  }
  createdIds.length = 0;
}

test.describe('Projects Stage Status API', () => {
  test.afterEach(async ({ request }) => {
    await cleanup(request);
  });

  test('proyek tanpa artifact → semua tahap belum_dimulai', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: `${marker} kosong` },
    });
    expect(res.status()).toBe(201);
    const { project } = await res.json();
    createdIds.push(project.id);

    const statusRes = await request.get('/api/projects/status');
    expect(statusRes.status()).toBe(200);
    const { statuses } = await statusRes.json();
    const stages = statuses[project.id];
    expect(stages).toBeTruthy();
    expect(stages.planning).toBe('belum_dimulai');
    expect(stages.development).toBe('belum_dimulai');
    expect(stages.design).toBe('belum_dimulai');
    expect(stages.maintenance).toBe('belum_dimulai');
  });

  test('planning ber-artifact approved → selesai; development draft saja → draf', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: `${marker} derivasi` },
    });
    const { project } = await res.json();
    createdIds.push(project.id);

    await seedArtifact(project.id, `${marker}-a1`, 'planning', 'draft');
    await seedArtifact(project.id, `${marker}-a2`, 'planning', 'approved');
    await seedArtifact(project.id, `${marker}-a3`, 'development', 'draft');

    const statusRes = await request.get('/api/projects/status');
    expect(statusRes.status()).toBe(200);
    const { statuses } = await statusRes.json();
    const stages = statuses[project.id];
    expect(stages.planning).toBe('selesai'); // ada approved → selesai
    expect(stages.development).toBe('draf'); // draft tanpa approved → draf
  });

  test('planning draft saja tanpa approved → draf; tahap non-R1 diabaikan meski ber-artifact', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: `${marker} draf-saja` },
    });
    const { project } = await res.json();
    createdIds.push(project.id);

    await seedArtifact(project.id, `${marker}-b1`, 'planning', 'draft');
    // artifact di tahap non-R1 (design) tidak dihitung sampai R2
    await seedArtifact(project.id, `${marker}-b2`, 'design', 'approved');

    const statusRes = await request.get('/api/projects/status');
    const { statuses } = await statusRes.json();
    const stages = statuses[project.id];
    expect(stages.planning).toBe('draf');
    expect(stages.design).toBe('belum_dimulai'); // di luar COMPUTED_STAGES_R1
  });

  test('proyek yang dihapus hilang dari peta status', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: `${marker} dihapus` },
    });
    const { project } = await res.json();
    await seedArtifact(project.id, `${marker}-c1`, 'planning', 'approved');

    await request.delete(`/api/projects/${project.id}`);

    const statusRes = await request.get('/api/projects/status');
    const { statuses } = await statusRes.json();
    expect(statuses[project.id]).toBeUndefined();
  });
});
