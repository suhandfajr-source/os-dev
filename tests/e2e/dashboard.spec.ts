import { test, expect } from '@playwright/test';

/**
 * E2E tests halaman /dashboard (Story 1 Meja Kendali).
 * Menggunakan locators semantik (placeholder, title tombol, teks) dan
 * membersihkan data test (prefix "QA-") lewat API di cleanup.
 */

const marker = `QA-${Date.now()}`;

test.describe('Dashboard Meja Kendali', () => {
  test('buat proyek → muncul di daftar dan tetap ada setelah reload', async ({ page, request }) => {
    const name = `${marker} E2E buat`;
    await page.goto('/dashboard');

    await page.getByPlaceholder('Nama proyek (wajib)').fill(name);
    await page.getByPlaceholder('Deskripsi singkat (opsional)').fill('dibuat oleh test e2e');
    await page.getByRole('button', { name: 'Buat Proyek' }).click();

    const card = page.locator('div.rounded-xl').filter({ hasText: name }).first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('dibuat oleh test e2e');
    await expect(card).toContainText('Dibuat');

    await page.reload();
    await expect(page.locator('div.rounded-xl').filter({ hasText: name }).first()).toBeVisible();

    // cleanup
    const res = await request.get('/api/projects');
    const { projects } = await res.json();
    const target = projects.find((p: { name: string }) => p.name === name);
    if (target) await request.delete(`/api/projects/${target.id}`);
  });

  test('edit proyek → perubahan tampil dan posisinya naik di urutan daftar', async ({ page, request }) => {
    const name = `${marker} E2E edit`;
    const newName = `${marker} E2E edit (diubah)`;
    await page.goto('/dashboard');

    await page.getByPlaceholder('Nama proyek (wajib)').fill(name);
    await page.getByRole('button', { name: 'Buat Proyek' }).click();
    await expect(page.locator('div.rounded-xl').filter({ hasText: name }).first()).toBeVisible();

    // buat proyek pembanding yang lebih baru, agar urutan awal: pembanding di atas
    const cmpName = `${marker} E2E pembanding`;
    await page.getByPlaceholder('Nama proyek (wajib)').fill(cmpName);
    await page.getByRole('button', { name: 'Buat Proyek' }).click();
    await expect(page.locator('div.rounded-xl').filter({ hasText: cmpName }).first()).toBeVisible();

    const listBefore = await page.locator('div.rounded-xl h3').allTextContents();
    expect(listBefore.indexOf(cmpName)).toBeLessThan(listBefore.indexOf(name));

    // jeda kecil agar bump updated_at (presisi milidetik) pasti > pembuat cmp
    await page.waitForTimeout(300);

    // edit proyek pertama
    const card = page.locator('div.rounded-xl').filter({ hasText: name }).first();
    await card.getByTitle('Edit proyek').click();
    // kartu edit-mode adalah satu-satunya div.rounded-xl yang punya tombol "Simpan"
    const editCard = page.locator('div.rounded-xl').filter({ has: page.getByRole('button', { name: 'Simpan' }) });
    await editCard.locator('input').first().fill(newName);
    await page.getByRole('button', { name: 'Simpan' }).click();

    const editedCard = page.locator('div.rounded-xl').filter({ hasText: newName }).first();
    await expect(editedCard).toBeVisible();

    // setelah diedit, proyek ini harus naik ke atas (di atas pembanding)
    await page.waitForTimeout(300);
    const listAfter = await page.locator('div.rounded-xl h3').allTextContents();
    expect(listAfter.indexOf(newName)).toBeLessThan(listAfter.indexOf(cmpName));

    // cleanup
    const res = await request.get('/api/projects');
    const { projects } = await res.json();
    for (const p of projects) {
      if (p.name === newName || p.name === cmpName) await request.delete(`/api/projects/${p.id}`);
    }
  });

  test('hapus proyek → hilang dari daftar', async ({ page, request }) => {
    const name = `${marker} E2E hapus`;
    await page.goto('/dashboard');

    await page.getByPlaceholder('Nama proyek (wajib)').fill(name);
    await page.getByRole('button', { name: 'Buat Proyek' }).click();
    const card = page.locator('div.rounded-xl').filter({ hasText: name }).first();
    await expect(card).toBeVisible();

    // patch review menambah dialog konfirmasi hapus — daftarkan handler sebelum klik
    page.once('dialog', (d) => d.accept());
    await card.getByTitle('Hapus proyek').click();
    await expect(card).toBeHidden();

    // cleanup
    const res = await request.get('/api/projects');
    const { projects } = await res.json();
    const target = projects.find((p: { name: string }) => p.name === name);
    if (target) await request.delete(`/api/projects/${target.id}`);
  });

  test('tombol submit tetap disabled saat nama hanya spasi', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByPlaceholder('Nama proyek (wajib)').fill('   ');
    await expect(page.getByRole('button', { name: 'Buat Proyek' })).toBeDisabled();
  });
});
