import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {children && <p className="empty-state__text">{children}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
