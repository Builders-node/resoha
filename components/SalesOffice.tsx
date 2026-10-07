'use client';
import { useState } from 'react';
import Link from 'next/link';
import { WhatsAppMark } from './AgentContact';
import Icon from './Icon';
import Photo from './Photo';
import { useT } from './LangProvider';
import { scheduleLines, type WeekSchedule } from '@/lib/visits';

const digits = (v: string) => v.replace(/[^\d]/g, '');

/**
 * «Контакти відділу продажів», як у LUN: адреса, графік по днях і три дії — записатись
 * на візит, показати телефон, написати у WhatsApp (на цьому ринку замість Viber).
 */
export default function SalesOffice({ name, address, schedule, note, phone, whatsapp, visitHref, logo, listingId }: {
  name: string;
  address: string;
  schedule: WeekSchedule;
  /** Вільний текст про години: без графіка — замість нього, з графіком — примітка під ним */
  note: string;
  phone: string;
  whatsapp: string;
  /** Без графіка записатись нікуди — кнопки немає */
  visitHref: string | null;
  logo?: string;
  /** Для відмітки в аналітиці ріелтора, як у картці агента */
  listingId?: string;
}) {
  const t = useT();
  const [shown, setShown] = useState(false);
  const lines = scheduleLines(schedule);
  const wa = digits(whatsapp || phone);
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(t('Hi, I have a question about {what}', { what: name }))}` : '';

  function track(kind: 'phone' | 'whatsapp') {
    if (!listingId) return;
    fetch('/api/track', {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, kind }),
    }).catch(() => {});
  }

  return (
    <section className={`sales${logo ? '' : ' sales--nologo'}`} id="sales-office">
      {logo && <div className="sales__logo"><Photo src={logo} alt={name} label="" /></div>}
      <div className="sales__body">
        <div className="sales__info">
          <h2 className="sales__title">{t('Sales office contacts')}</h2>
          {address && <p className="sales__addr">{address}</p>}
          {(lines.length > 0 || note) && (
            <div className="sales__hours">
              <span className="sales__ico"><Icon name="headset" size={26} /></span>
              <span className="sales__lbl">{t('Sales office')}</span>
              <div>
                {lines.length > 0 && (
                  <dl className="sales__week">
                    {lines.map((l) => (
                      <div key={l.days}>
                        <dt>{l.days.split(' – ').map((d) => t(d)).join(' – ')}</dt>
                        <dd>{l.hours === 'Closed' ? t('Closed') : l.hours}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {note && <p className="sales__note small muted">{note}</p>}
              </div>
            </div>
          )}
        </div>
        <div className="sales__acts">
          {visitHref && (
            <Link className="cc__btn sales__visit" href={visitHref}>
              <Icon name="calendar" size={22} /> {t('Book a visit')}
            </Link>
          )}
          {phone && (shown ? (
            <a className="cc__btn sales__btn" href={`tel:+${digits(phone)}`}><Icon name="phone" size={20} /> {phone}</a>
          ) : (
            <button className="cc__btn sales__btn" onClick={() => { setShown(true); track('phone'); }}>
              <Icon name="phone" size={20} /> {t('Show phone')}
            </button>
          ))}
          {waHref && (
            <a className="cc__btn cc__btn--wa sales__btn" href={waHref} target="_blank" rel="noreferrer" onClick={() => track('whatsapp')}>
              <WhatsAppMark /> {t('Message on {app}', { app: 'WhatsApp' })}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
