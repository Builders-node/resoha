'use client';
import { openAuth, type AuthMode, type AuthView } from '@/lib/auth-modal';

/**
 * Посилання, що відкриває модалку входу. href лишається справжнім: без JS
 * (або з «відкрити в новій вкладці») /login сам переведе на головну з модалкою.
 */
export default function AuthLink({ view = 'login', as, className, style, onOpen, children }: {
  view?: AuthView;
  as?: AuthMode;
  className?: string;
  style?: React.CSSProperties;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  const href = view === 'signup' ? `/signup${as ? `?as=${as}` : ''}` : view === 'forgot' ? '/forgot' : '/login';
  return (
    <a className={className} style={style} href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        onOpen?.();
        openAuth(view, as);
      }}>
      {children}
    </a>
  );
}
