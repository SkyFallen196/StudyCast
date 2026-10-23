import { expect, test } from '@playwright/test';
import { audioFile, LECTURE_VTT, textFile } from './fixtures';

/**
 * Требования F-01 «Импорт аудиофайла» и F-03 «Импорт субтитров» (ТЗ 5.2, 8.1 «Формы»).
 * Ожидаемое поведение:
 * - при отправке формы без обязательных полей под полями появляются ошибки, запись не создаётся;
 * - файл неподдерживаемого формата отклоняется сообщением под полем;
 * - файл субтитров без таймкодов отклоняется, запись не создаётся;
 * - корректные файлы создают запись: она открывается и появляется в библиотеке.
 */

async function libraryCount(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Библиотека' })).toBeVisible();
  return page.locator('.record-card').count();
}

test('пустая форма: ошибки под полями, запись не сохраняется', async ({ page }) => {
  await page.goto('/import');
  await page.getByRole('button', { name: 'Начать распознавание' }).click();

  await expect(page.locator('#audio-error')).toHaveText('Выберите аудиофайл лекции.');
  await expect(page.locator('#title-error')).toHaveText('Введите название записи.');
  await expect(page.getByLabel('Название записи')).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/\/import$/);

  expect(await libraryCount(page)).toBe(0);
  await expect(page.getByText('Здесь пока пусто')).toBeVisible();
});

test('неподдерживаемый формат файла отклоняется', async ({ page }) => {
  await page.goto('/import');
  await page.locator('#audio-file').setInputFiles(textFile('notes.txt', 'не аудио'));

  await expect(page.locator('#audio-error')).toContainText('Формат не поддерживается');
  await expect(page.locator('.file-summary')).toHaveCount(0);

  await page.getByLabel('Название записи').fill('Попытка');
  await page.getByRole('button', { name: 'Начать распознавание' }).click();
  await expect(page).toHaveURL(/\/import$/);
  expect(await libraryCount(page)).toBe(0);
});

test('подходящий аудиофайл: показана длительность, название подставлено из имени файла', async ({ page }) => {
  await page.goto('/import');
  await page.locator('#audio-file').setInputFiles(audioFile('lecture_07_taylor.wav', 45));

  await expect(page.locator('.file-summary__name')).toHaveText('lecture_07_taylor.wav');
  await expect(page.locator('.file-summary__meta')).toContainText('00:45');
  await expect(page.getByLabel('Название записи')).toHaveValue('lecture 07 taylor');
  await expect(page.locator('#audio-error')).toHaveCount(0);
});

test('субтитры без таймкодов отклоняются, запись не создаётся', async ({ page }) => {
  await page.goto('/import');
  await page.locator('#audio-file').setInputFiles(audioFile());
  await expect(page.locator('.file-summary')).toBeVisible();
  await page.getByRole('radio', { name: /Загрузить субтитры/ }).check();

  await page.getByRole('button', { name: 'Импортировать' }).click();
  await expect(page.locator('#subtitle-error')).toHaveText('Выберите файл субтитров SRT или VTT.');

  await page.locator('#subtitle-file').setInputFiles(textFile('broken.srt', 'просто текст без таймкодов'));
  await page.getByRole('button', { name: 'Импортировать' }).click();
  await expect(page.locator('#subtitle-error')).toContainText('не найдено ни одной фразы с таймкодом');
  await expect(page).toHaveURL(/\/import$/);

  await page.locator('#subtitle-file').setInputFiles(textFile('notes.docx', 'x'));
  await expect(page.locator('#subtitle-error')).toHaveText('Нужен файл субтитров SRT или VTT.');

  expect(await libraryCount(page)).toBe(0);
});

test('корректные файлы создают запись, она появляется в библиотеке', async ({ page }) => {
  await page.goto('/import');
  await page.locator('#audio-file').setInputFiles(audioFile());
  await expect(page.locator('.file-summary')).toBeVisible();
  await page.getByLabel('Название записи').fill('Ряды Фурье');
  await page.getByRole('radio', { name: /Загрузить субтитры/ }).check();
  await page.locator('#subtitle-file').setInputFiles(textFile('fourier.vtt', LECTURE_VTT));
  await page.getByRole('button', { name: 'Импортировать' }).click();

  await page.waitForURL(/\/records\//);
  await expect(page.getByRole('heading', { level: 1, name: 'Ряды Фурье' })).toBeVisible();
  await expect(page.locator('.segment')).toHaveCount(2);
  await expect(page.locator('.segment').first()).toContainText('Вторая лекция: ряды Фурье.');

  expect(await libraryCount(page)).toBe(1);
  const card = page.locator('.record-card');
  await expect(card).toContainText('Ряды Фурье');
  await expect(card.locator('.pill--success')).toHaveText('из субтитров');
});
