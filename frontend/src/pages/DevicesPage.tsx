import PageIntro from '../components/PageIntro';
import EmptyState from '../components/EmptyState';

export default function DevicesPage() {
  return (
    <>
      <PageIntro title="Устройства" lead="Подключение второго устройства по одноразовому коду." />
      <EmptyState title="Синхронизация появится в следующей версии">
        В первой версии MVP библиотека хранится только в этом браузере. Код сопряжения, список устройств
        и удаление данных с сервера (задачи FE-033 — FE-037) требуют backend и в эту версию не вошли.
      </EmptyState>
    </>
  );
}
