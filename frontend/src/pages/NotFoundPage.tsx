import { Link } from 'react-router-dom';
import PageIntro from '../components/PageIntro';
import EmptyState from '../components/EmptyState';

export default function NotFoundPage() {
  return (
    <>
      <PageIntro title="Страница не найдена" />
      <EmptyState title="Такой страницы нет">
        Проверьте адрес или вернитесь в <Link to="/">библиотеку</Link>.
      </EmptyState>
    </>
  );
}
