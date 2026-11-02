import type { ReactNode } from 'react';

/** Порожній стан кабінету: іконка в м'якому колі, заголовок, пояснення і кнопки (.empty__acts). */
export default function EmptyState({ icon, title, text, children }: {
  icon: ReactNode;
  title: string;
  text?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="empty empty--state">
      <div className="empty__badge" aria-hidden>{icon}</div>
      <h3 className="empty__title">{title}</h3>
      {text && <p className="empty__text">{text}</p>}
      {children && <div className="empty__acts">{children}</div>}
    </div>
  );
}
