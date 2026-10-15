'use client';
import { useState } from 'react';
import Icon from './Icon';
import { useT } from './LangProvider';

/** Поділитися статтею: месенджери, соцмережі й копіювання посилання. Без сторонніх скриптів. */
export default function ShareLinks({ url, title }: { url: string; title: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const links = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: 'X', href: `https://x.com/intent/post?url=${u}&text=${encodeURIComponent(title)}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  ];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* без доступу до буфера просто нічого не робимо */ }
  };
  return (
    <div className="share">
      <b className="small">{t('Share this article')}</b>
      <div className="share__row">
        {links.map((l) => (
          <a key={l.name} className="btn btn--ghost btn--sm" href={l.href} target="_blank" rel="noopener noreferrer">{l.name}</a>
        ))}
        <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>
          <Icon name={copied ? 'check' : 'link'} size={16} /> {copied ? t('Copied') : t('Copy link')}
        </button>
      </div>
    </div>
  );
}
