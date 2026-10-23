import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

interface PageIntroProps {
  title: string;
  lead?: ReactNode;
  back?: boolean;
  actions?: ReactNode;
}

/** Заголовок страницы: ссылка «← Библиотека», h1, подзаголовок и действия справа. */
export default function PageIntro({ title, lead, back, actions }: PageIntroProps) {
  useEffect(() => {
    document.title = `${title} — StudyCast`;
  }, [title]);

  return (
    <section className="page-intro" aria-labelledby="page-title">
      <div className="page-intro__text">
        {back && <Link className="back-link" to="/">← Библиотека</Link>}
        <h1 id="page-title" className="page-intro__title">{title}</h1>
        {lead && <p className="page-intro__lead">{lead}</p>}
      </div>
      {actions && <div className="page-intro__actions">{actions}</div>}
    </section>
  );
}
