import { expect, test } from '@playwright/test';
import { importWithSubtitles } from './fixtures';

/**
 * Требование F-06 «Поиск по транскрипту и переход к моменту» (ТЗ 11.2, приложение Б).
 * Ожидаемое поведение:
 * - подсвечиваются только совпадения с запросом, отображается счётчик «N из M»;
 * - поиск не зависит от регистра, «ё» и «е» равнозначны;
 * - Enter / Shift+Enter и кнопки переключают текущее совпадение по кругу;
 * - при отсутствии совпадений выводится «Ничего не найдено», очистка поля снимает подсветку;
 * - клик по фразе перематывает аудио на её начало.
 */

test.beforeEach(async ({ page }) => {
  await importWithSubtitles(page, 'Матанализ. Лекция 7');
});

test('подсвечивает только совпадения и показывает счётчик без учёта регистра', async ({ page }) => {
  await page.getByLabel('Поиск по транскрипту').fill('тейлор');

  const marks = page.locator('mark.match');
  await expect(marks).toHaveCount(3);
  await expect(marks).toHaveText(['Тейлор', 'тейлор', 'ТЕЙЛОР']);
  await expect(page.locator('.transcript-search__counter')).toHaveText('1 из 3');

  // подсвечены только фразы с совпадением, остальные остаются без разметки
  const segmentsWithMarks = page.locator('.segment', { has: page.locator('mark') });
  await expect(segmentsWithMarks).toHaveCount(3);
  await expect(page.locator('.segment', { hasText: 'Маклорена' }).locator('mark')).toHaveCount(0);
});

test('считает «е» и «ё» одной буквой', async ({ page }) => {
  await page.getByLabel('Поиск по транскрипту').fill('еще');
  await expect(page.locator('mark.match')).toHaveText(['ещё']);
  await expect(page.locator('.transcript-search__counter')).toHaveText('1 из 1');
});

test('переключает совпадения клавишами Enter / Shift+Enter и кнопками по кругу', async ({ page }) => {
  const input = page.getByLabel('Поиск по транскрипту');
  const counter = page.locator('.transcript-search__counter');
  const current = page.locator('mark.match--current');

  await input.fill('тейлор');
  await expect(current).toHaveText('Тейлор');

  await input.press('Enter');
  await expect(counter).toHaveText('2 из 3');
  await expect(current).toHaveText('тейлор');

  await input.press('Enter');
  await input.press('Enter');
  await expect(counter).toHaveText('1 из 3'); // после последнего — снова первое

  await input.press('Shift+Enter');
  await expect(counter).toHaveText('3 из 3');
  await expect(current).toHaveText('ТЕЙЛОР');

  await page.getByRole('button', { name: /Предыдущее совпадение/ }).click();
  await expect(counter).toHaveText('2 из 3');
  await page.getByRole('button', { name: /Следующее совпадение/ }).click();
  await expect(counter).toHaveText('3 из 3');
});

test('сообщает «Ничего не найдено», а очистка поля снимает подсветку', async ({ page }) => {
  const input = page.getByLabel('Поиск по транскрипту');

  await input.fill('интеграл Римана');
  await expect(page.getByText('Ничего не найдено')).toBeVisible();
  await expect(page.locator('.transcript-search__counter')).toHaveText('0 из 0');
  await expect(page.getByRole('button', { name: /Следующее совпадение/ })).toBeDisabled();

  await input.fill('маклорен');
  await expect(page.getByText('Ничего не найдено')).toBeHidden();
  await expect(page.locator('mark.match')).toHaveCount(1);

  await input.fill('');
  await expect(page.locator('mark.match')).toHaveCount(0);
  await expect(page.locator('.transcript-search__counter')).toBeHidden();
  await expect(page.locator('.segment')).toHaveCount(6);
});

test('клик по найденной фразе перематывает аудио на её начало', async ({ page }) => {
  await page.getByLabel('Поиск по транскрипту').fill('маклорен');
  const segment = page.locator('.segment', { has: page.locator('mark') });
  await expect(segment.locator('.segment__time')).toHaveText('00:20');

  await segment.locator('.segment__jump').click();

  const time = await page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime);
  expect(time).toBeGreaterThanOrEqual(20);
  expect(time).toBeLessThan(21); // точность не хуже 1 с (ТЗ 3.2)
  await expect(segment).toHaveClass(/segment--active/);
  await expect(page.locator('.player__time')).toContainText('00:20');
});

test('Escape очищает поиск', async ({ page }) => {
  const input = page.getByLabel('Поиск по транскрипту');
  await input.fill('тейлор');
  await expect(page.locator('mark.match')).toHaveCount(3);
  await input.press('Escape');
  await expect(input).toHaveValue('');
  await expect(page.locator('mark.match')).toHaveCount(0);
});
