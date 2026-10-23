import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { importWithSubtitles } from './fixtures';

/**
 * Требования F-07 «Закладки и заметки», F-08 «Локальная библиотека», F-09 «Экспорт» (ТЗ 5.2, 11.5 пункты 5–7).
 * Ожидаемое поведение:
 * - закладка ставится на фразе, появляется в панели закладок и на таймлайне плеера, заметка сохраняется;
 * - после перезагрузки страницы запись, транскрипт, закладка и заметка остаются на месте, распознавание не запускается;
 * - выгруженный конспект Markdown содержит таймкод закладки, текст фразы и заметку;
 * - удаление закладки и удаление записи (с подтверждением) обновляют интерфейс.
 */

const NOTE = 'На экзамене: условие сходимости';

test.beforeEach(async ({ page }) => {
  await importWithSubtitles(page, 'Матанализ. Лекция 7');
});

async function bookmarkSegment(page: import('@playwright/test').Page, text: string) {
  const segment = page.locator('.segment', { hasText: text });
  await segment.getByRole('button', { name: /Добавить закладку/ }).click();
  return segment;
}

test('закладка с заметкой появляется в панели и на таймлайне', async ({ page }) => {
  const panel = page.locator('.bookmarks');
  await expect(panel.getByText('Закладок пока нет')).toBeVisible();

  const segment = await bookmarkSegment(page, 'Важный момент');
  await expect(segment.getByRole('button', { name: /Убрать закладку/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.locator('.panel__title')).toHaveText('Закладки · 1');
  await expect(panel.locator('.bookmark__time')).toHaveText('00:26 →');
  await expect(panel.locator('.bookmark__text')).toContainText('Важный момент');
  await expect(page.locator('.player__marker')).toHaveCount(1);

  await panel.getByLabel(/Заметка к закладке/).fill(NOTE);
  await panel.getByLabel(/Заметка к закладке/).blur();
  await expect(panel.getByText('Заметка сохранена')).toBeVisible();
});

test('закладка и заметка сохраняются после перезагрузки страницы', async ({ page }) => {
  await bookmarkSegment(page, 'Важный момент');
  const note = page.getByLabel(/Заметка к закладке/);
  await note.fill(NOTE);
  await note.blur();
  await expect(page.getByText('Заметка сохранена')).toBeVisible();

  await page.reload();

  await expect(page.locator('.segment')).toHaveCount(6);
  await expect(page.locator('.bookmark')).toHaveCount(1);
  await expect(page.getByLabel(/Заметка к закладке/)).toHaveValue(NOTE);
  await expect(page.locator('.progress-box')).toHaveCount(0); // повторной обработки нет

  await page.goto('/');
  await expect(page.locator('.record-meta__item', { hasText: 'Закладки' }).locator('dd')).toHaveText('1');
});

test('экспорт Markdown содержит таймкод, фразу и заметку', async ({ page }) => {
  await bookmarkSegment(page, 'Важный момент');
  const note = page.getByLabel(/Заметка к закладке/);
  await note.fill(NOTE);
  await note.blur();
  await expect(page.getByText('Заметка сохранена')).toBeVisible();

  await page.getByRole('button', { name: 'Экспорт' }).click();
  const dialog = page.getByRole('dialog', { name: 'Экспорт' });
  await expect(dialog).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Скачать' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('Матанализ. Лекция 7.md');
  const markdown = await readFile(await download.path(), 'utf-8');
  expect(markdown).toContain('# Матанализ. Лекция 7');
  expect(markdown).toContain('### 00:26');
  expect(markdown).toContain('> Важный момент: ряд ТЕЙЛОРА может сходиться не к самой функции.');
  expect(markdown).toContain(NOTE);
  expect(markdown).not.toContain('## Транскрипт');
});

test('удаление закладки и удаление записи с подтверждением', async ({ page }) => {
  await bookmarkSegment(page, 'Важный момент');
  await page.getByRole('button', { name: 'Удалить закладку 00:26' }).click();
  await expect(page.locator('.bookmark')).toHaveCount(0);
  await expect(page.locator('.player__marker')).toHaveCount(0);

  await page.goto('/');
  await page.getByRole('button', { name: 'Удалить запись «Матанализ. Лекция 7»' }).click();
  const dialog = page.getByRole('dialog', { name: 'Удалить запись?' });
  await dialog.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.locator('.record-card')).toHaveCount(1);

  await page.getByRole('button', { name: 'Удалить запись «Матанализ. Лекция 7»' }).click();
  await dialog.getByRole('button', { name: 'Удалить' }).click();
  await expect(page.locator('.record-card')).toHaveCount(0);
  await expect(page.getByText('Здесь пока пусто')).toBeVisible();
});

test('на телефоне закладку можно поставить и найти в панели @mobile', async ({ page }) => {
  await bookmarkSegment(page, 'Важный момент');
  await expect(page.locator('.bookmark')).toHaveCount(1);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewport = page.viewportSize()!;
  expect(scrollWidth).toBeLessThanOrEqual(viewport.width); // без горизонтальной прокрутки (NFR-001)
});

test('заметка не теряется, если сразу перезагрузить страницу', async ({ page }) => {
  await bookmarkSegment(page, 'Важный момент');
  await page.getByLabel(/Заметка к закладке/).fill(NOTE); // фокус остаётся в поле
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByLabel(/Заметка к закладке/)).toHaveValue(NOTE);
});

test('быстрый двойной клик по значку не создаёт дубликат закладки', async ({ page }) => {
  const segment = page.locator('.segment', { hasText: 'Важный момент' });
  await segment.locator('.segment__bookmark').dblclick();
  await page.waitForTimeout(500);
  // два нажатия на переключатель: закладка поставлена и снята
  await expect(page.locator('.bookmark')).toHaveCount(0);
  await segment.locator('.segment__bookmark').click();
  await expect(page.locator('.bookmark')).toHaveCount(1);
});
