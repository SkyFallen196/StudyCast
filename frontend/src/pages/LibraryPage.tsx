import { useDeferredValue, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import PageIntro from '../components/PageIntro';
import RecordCard from '../components/RecordCard';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { countBookmarksByRecord, deleteRecord, findRecordsByText, getStorageEstimate, listRecords } from '../services/storage';
import { includesText } from '../lib/search';
import { formatSize } from '../lib/time';
import type { LectureRecord } from '../types';

export default function LibraryPage() {
  const records = useLiveQuery(listRecords);
  const bookmarkCounts = useLiveQuery(countBookmarksByRecord) ?? new Map<string, number>();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const textMatches = useLiveQuery(
    () => (deferredQuery.trim() ? findRecordsByText((text) => includesText(text, deferredQuery)) : Promise.resolve(null)),
    [deferredQuery],
  );
  const [toDelete, setToDelete] = useState<LectureRecord | null>(null);

  const visible = (records ?? []).filter(
    (r) => !deferredQuery.trim() || includesText(r.title, deferredQuery) || textMatches?.has(r.id),
  );

  async function confirmDelete() {
    if (!toDelete) return;
    await deleteRecord(toDelete.id);
    setToDelete(null);
  }

  return (
    <>
      <PageIntro
        title="Библиотека"
        lead="Записи лекций и их расшифровки. Аудио хранится только на этом устройстве."
        actions={<Link className="button button--primary button--add" to="/import">Импортировать запись</Link>}
      />

      <div className="layout">
        <div className="layout__main">
          <section className="records" aria-labelledby="records-title">
            <h2 id="records-title" className="section-title">Мои записи</h2>

            {records === undefined ? (
              <ul className="record-list" aria-busy="true" aria-label="Загрузка библиотеки">
                {[0, 1, 2].map((i) => <li key={i} className="skeleton skeleton--card" />)}
              </ul>
            ) : records.length === 0 ? (
              <EmptyState
                title="Здесь пока пусто"
                action={<Link className="button button--primary button--add" to="/import">Импортировать первую запись</Link>}
              >
                Откройте аудиозапись лекции с телефона или компьютера — расшифровка появится здесь и сохранится в браузере.
              </EmptyState>
            ) : (
              <>
                <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
                  <label className="search__label" htmlFor="library-search">Поиск по записям</label>
                  <input
                    className="search__input"
                    id="library-search"
                    type="search"
                    placeholder="Название или слово из расшифровки"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </form>
                {visible.length === 0 ? (
                  <EmptyState title="Ничего не найдено">Измените запрос: поиск идёт по названиям и тексту расшифровок.</EmptyState>
                ) : (
                  <ul className="record-list">
                    {visible.map((record) => (
                      <li key={record.id}>
                        <RecordCard record={record} bookmarks={bookmarkCounts.get(record.id) ?? 0} onDelete={setToDelete} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="layout__aside" aria-label="Состояние приложения">
          <StoragePanel recordsCount={records?.length ?? 0} />
          <section className="panel" aria-labelledby="sync-title">
            <h2 id="sync-title" className="panel__title">Синхронизация</h2>
            <p className="panel__text">Библиотека хранится только в этом браузере. Подключение второго устройства появится в следующей версии.</p>
          </section>
          <section className="panel" aria-labelledby="how-title">
            <h2 id="how-title" className="panel__title">Как это работает</h2>
            <ol className="steps">
              <li>Откройте аудиозапись лекции.</li>
              <li>Дождитесь расшифровки в браузере или загрузите субтитры.</li>
              <li>Найдите тему поиском и перейдите к моменту в аудио.</li>
              <li>Поставьте закладку и выгрузите конспект.</li>
            </ol>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Удалить запись?"
        confirmLabel="Удалить"
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        «{toDelete?.title}» будет удалена из браузера вместе с аудио, расшифровкой и закладками. Это действие нельзя отменить.
      </ConfirmDialog>
    </>
  );
}

function StoragePanel({ recordsCount }: { recordsCount: number }) {
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    getStorageEstimate().then(setEstimate);
  }, [recordsCount]);

  if (!estimate || estimate.quota === 0) return null;
  const nearlyFull = estimate.usage / estimate.quota > 0.85;

  return (
    <section className="panel" aria-labelledby="storage-title">
      <h2 id="storage-title" className="panel__title">Хранилище браузера</h2>
      <p className="panel__text">
        <label htmlFor="storage-usage">Занято {formatSize(estimate.usage)} из ~{formatSize(estimate.quota)}</label>
        <meter className="meter" id="storage-usage" min={0} max={estimate.quota} value={estimate.usage} />
        {nearlyFull && <span className="field-error">Место почти закончилось — удалите ненужные записи.</span>}
      </p>
    </section>
  );
}
