'use client';
import { useState, type CSSProperties } from 'react';
import { photoUrl } from '@/lib/format';

type Props = {
  src?: string;
  name: string;
  className?: string;
  style?: CSSProperties;
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '·';

/** Аватар: справжнє фото або ініціали. Стокових облич замість людей не показуємо. */
export default function Avatar({ src, name, className = '', style }: Props) {
  // фото не відкрилось (протерміноване посилання Google тощо) — показуємо ініціали
  const [failed, setFailed] = useState('');
  const url = photoUrl(src);
  if (url && failed !== url) {
    const fail = () => setFailed(url);
    return <img className={`ava ${className}`.trim()} src={url} alt={name} style={style} onError={fail}
      ref={(img) => { if (img?.complete && img.currentSrc && !img.naturalWidth) fail(); }} />;
  }
  return (
    <span className={`ava ava--ini ${className}`.trim()} style={style} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
