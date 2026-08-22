'use client';
import { useEffect, useState } from 'react';

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('resoha:toast', { detail: message }));
}

export default function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 2600);
    };
    window.addEventListener('resoha:toast', onToast);
    return () => { window.removeEventListener('resoha:toast', onToast); clearTimeout(t); };
  }, []);

  return <div className={`toast ${msg ? 'is-on' : ''}`}>{msg}</div>;
}
