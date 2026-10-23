import PageIntro from '../components/PageIntro';
import EmptyState from '../components/EmptyState';

export default function SettingsPage() {
  return (
    <>
      <PageIntro title="Настройки" lead="Модель распознавания, язык и управление локальными данными." />
      <EmptyState title="Настройки появятся в следующей версии">
        Сейчас используются значения по умолчанию: модель Whisper tiny, русский язык, тема оформления
        по настройке системы. Удалить запись можно из библиотеки.
      </EmptyState>
    </>
  );
}
