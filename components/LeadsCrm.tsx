'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { fmtDate } from '@/lib/format';
import { LEAD_STAGES, LOST_REASONS, leadStageLabel, leadsCsv, stageTone } from '@/lib/leadFunnel';
import { contactPrefShort, fmtVisit } from '@/lib/visits';
import type { Agent, Lead, LeadEvent, LeadStatus } from '@/lib/types';

const PER_PAGE = 30;
const DAY = 24 * 60 * 60 * 1000;
const CHANNELS: [Lead['channel'], string][] = [['form', 'Form'], ['whatsapp', 'WhatsApp'], ['visit', 'Office visit']];

/**
 * Заявки ріелтора як маленька CRM: воронка зі стадіями, фільтри й пошук, історія з нотатками,
 * перепризначення в агенції та вивантаження в CSV. Фільтрує на клієнті — кабінет і так
 * вантажить усі заявки (RLS віддає ріелтору його, власнику — по агенції).
 */
export default function LeadsCrm({ leads, meId, isOwner, agencyId, members, onChanged }: {
  leads: Lead[];
  meId: string;
  isOwner: boolean;
  /** активна команда: перепризначати можна лише її заявки і лише на її ріелторів */
  agencyId: string | null;
  members: Agent[];
  onChanged: () => void;
}) {
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<'' | 'open' | LeadStatus>('');
  const [channel, setChannel] = useState('');
  const [agent, setAgent] = useState('');
  const [object, setObject] = useState('');
  const [period, setPeriod] = useState('');
  // межа періоду рахується в момент вибору, а не на кожен рендер
  const [since, setSince] = useState(0);
  const [limit, setLimit] = useState(PER_PAGE);
  const [openId, setOpenId] = useState<string | null>(null);

  const agentName = (id: string) =>
    id === meId ? 'Me' : members.find((m) => m.id === id)?.name || leads.find((l) => l.agentId === id)?.agentName || '—';

  const counts = useMemo(() => {
    const c = Object.fromEntries(LEAD_STAGES.map(([k]) => [k, 0])) as Record<LeadStatus, number>;
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  const agents = useMemo(() => [...new Set(leads.map((l) => l.agentId))], [leads]);
  // обʼєкт фільтра: ЖК цілком або окреме оголошення
  const objects = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of leads) {
      if (l.developmentSlug) m.set(`d:${l.developmentSlug}`, l.developmentName);
      else m.set(`l:${l.listingId}`, l.listingTitle || 'Listing');
    }
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [leads]);

  const filtering = Boolean(q || stage || channel || agent || object || period);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/[^\d]/g, '');
    return leads.filter((l) => {
      if (stage === 'open' ? l.status === 'deal' || l.status === 'lost' : stage && l.status !== stage) return false;
      if (channel && l.channel !== channel) return false;
      if (agent && l.agentId !== agent) return false;
      if (object && object !== (l.developmentSlug ? `d:${l.developmentSlug}` : `l:${l.listingId}`)) return false;
      if (period && Date.parse(l.createdAt) < since) return false;
      if (needle) {
        const hay = [l.name, l.email, l.message, l.listingTitle, l.developmentName, l.lostReason].join(' ').toLowerCase();
        const phoneHit = digits.length >= 3 && l.phone.replace(/[^\d]/g, '').includes(digits);
        if (!hay.includes(needle) && !phoneHit) return false;
      }
      return true;
    });
  }, [leads, q, stage, channel, agent, object, period, since]);

  function reset() {
    setQ(''); setStage(''); setChannel(''); setAgent(''); setObject(''); setPeriod('');
  }

  function exportCsv() {
    const blob = new Blob([leadsCsv(shown, agentName)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const open = leads.length - counts.deal - counts.lost;

  return (
    <div className="panel">
      <div className="fgroup__head">
        <div>
          <h3 style={{ marginBottom: 4 }}>Buyer enquiries</h3>
          <p className="muted small" style={{ margin: 0 }}>
            {isOwner ? 'Everything that came in for your agency. Reassign an enquiry to the right agent from its card.' : 'Enquiries assigned to you.'}
          </p>
        </div>
        {leads.length > 0 && (
          <button type="button" className="btn btn--sm btn--ghost" onClick={exportCsv}>
            <Icon name="download" size={16} /> Export CSV
          </button>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="empty"><div className="empty__ico"><Icon name="inbox" size={40} /></div>No enquiries yet</div>
      ) : (
        <>
          {/* воронка: клік — фільтр за стадією */}
          <div className="crm-funnel" role="group" aria-label="Pipeline">
            <button type="button" className={`crm-funnel__step ${stage === 'open' ? 'is-on' : ''}`}
              onClick={() => setStage(stage === 'open' ? '' : 'open')}>
              <b>{open}</b><span>In progress</span>
            </button>
            {LEAD_STAGES.map(([k, label]) => (
              <button key={k} type="button" className={`crm-funnel__step crm-funnel__step--${k} ${stage === k ? 'is-on' : ''}`}
                onClick={() => setStage(stage === k ? '' : k)}>
                <b>{counts[k]}</b><span>{label}</span>
              </button>
            ))}
          </div>

          <div className="dash-filters">
            <div className="dash-filters__search">
              <Icon name="search" size={17} />
              <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, phone, email, property or message" aria-label="Search enquiries" />
            </div>
            <select className="input" value={stage} onChange={(e) => setStage(e.target.value as typeof stage)} aria-label="Stage">
              <option value="">Any stage</option>
              <option value="open">In progress</option>
              {LEAD_STAGES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Channel">
              <option value="">Any channel</option>
              {CHANNELS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            {objects.length > 1 && (
              <select className="input" value={object} onChange={(e) => setObject(e.target.value)} aria-label="Property">
                <option value="">All properties</option>
                {objects.map(([k, name]) => <option key={k} value={k}>{k.startsWith('d:') ? `${name} (development)` : name}</option>)}
              </select>
            )}
            {agents.length > 1 && (
              <select className="input" value={agent} onChange={(e) => setAgent(e.target.value)} aria-label="Agent">
                <option value="">All agents</option>
                {agents.map((id) => <option key={id} value={id}>{agentName(id)}</option>)}
              </select>
            )}
            <select className="input" value={period} aria-label="Period"
              onChange={(e) => { setPeriod(e.target.value); setSince(Date.now() - Number(e.target.value) * DAY); }}>
              <option value="">Any time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <div className="dash-filters__sum small muted">
            {filtering ? `${shown.length} of ${leads.length} enquiries` : `${leads.length} enquiries`}
            {filtering && <> · <button type="button" className="link-btn" onClick={reset}>Clear filters</button></>}
          </div>

          {shown.length === 0 ? (
            <div className="empty"><div className="empty__ico"><Icon name="search" size={40} /></div>
              Nothing matches these filters. <button type="button" className="link-btn" onClick={reset}>Clear filters</button></div>
          ) : shown.slice(0, limit).map((l) => (
            <LeadRow key={l.id} lead={l} meId={meId} agentName={agentName}
              canAssign={isOwner && !!agencyId && l.agencyId === agencyId}
              members={members} expanded={openId === l.id}
              onToggle={() => setOpenId(openId === l.id ? null : l.id)} onChanged={onChanged} />
          ))}
          {shown.length > limit && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" className="btn btn--ghost" onClick={() => setLimit(limit + PER_PAGE)}>
                Show more ({shown.length - limit} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

async function patchLead(id: string, patch: Record<string, unknown>) {
  const res = await fetch(`/api/leads/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) toast(d.error ?? 'Not allowed');
  return res.ok;
}

function LeadRow({ lead: l, meId, agentName, canAssign, members, expanded, onToggle, onChanged }: {
  lead: Lead; meId: string; agentName: (id: string) => string; canAssign: boolean; members: Agent[];
  expanded: boolean; onToggle: () => void; onChanged: () => void;
}) {
  // «Lost» спершу питає причину і лише тоді зберігає
  const [askLost, setAskLost] = useState(false);

  async function setStage(status: LeadStatus) {
    if (status === l.status) return;
    if (status === 'lost') { setAskLost(true); return; }
    if (await patchLead(l.id, { status })) { toast(`Moved to ${leadStageLabel(status)}`); onChanged(); }
  }

  return (
    <div className={`lead crm-lead ${expanded ? 'is-open' : ''}`}>
      <div className="crm-lead__main">
        <div style={{ minWidth: 0 }}>
          <b>{l.name}</b>{l.phone && <span className="muted"> · {l.phone}</span>}
          <span className={`pill ${stageTone(l.status)}`} style={{ marginLeft: 8 }}>{leadStageLabel(l.status)}</span>
          {l.channel === 'whatsapp' && <span className="pill pill--off" style={{ marginLeft: 6 }}>WhatsApp</span>}
          {l.status === 'lost' && l.lostReason && <span className="tiny muted" style={{ marginLeft: 6 }}>{l.lostReason}</span>}
          {l.visitAt && <VisitLine lead={l} />}
          {l.message && <p className="muted small" style={{ margin: '6px 0 0', whiteSpace: 'pre-line' }}>{l.message}</p>}
          <div className="tiny muted" style={{ marginTop: 6 }}>
            {fmtDate(l.createdAt)} · {l.channel === 'visit' && l.developmentSlug
              ? <Link href={`/developments/${l.developmentSlug}`}>{l.developmentName}</Link>
              : <Link href={`/listings/${l.listingId}`}>{l.listingTitle || 'the listing'}</Link>}
            {l.email && <> · <a href={`mailto:${l.email}`}>{l.email}</a></>}
            {l.agentId !== meId && ` · agent: ${agentName(l.agentId)}`}
          </div>
        </div>
        <div className="crm-lead__act">
          <select className="input input--sm" value={l.status} aria-label="Stage"
            onChange={(e) => setStage(e.target.value as LeadStatus)}>
            {LEAD_STAGES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          {/* анонімний перехід у WhatsApp номера не лишає — дзвонити нікуди */}
          {l.phone && (
            <>
              <a className="btn btn--sm btn--ghost btn--icon" title="WhatsApp" aria-label="WhatsApp"
                href={`https://wa.me/${l.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">
                <Icon name="chat" size={16} />
              </a>
              <a className="btn btn--sm btn--primary btn--icon" title="Call" aria-label="Call" href={`tel:${l.phone.replace(/[^+\d]/g, '')}`}>
                <Icon name="phone" size={16} />
              </a>
            </>
          )}
          <button type="button" className="btn btn--sm btn--ghost" aria-expanded={expanded} onClick={onToggle}>
            {expanded ? 'Close' : 'Notes & history'}
          </button>
        </div>
      </div>

      {askLost && (
        <LostForm onCancel={() => setAskLost(false)} onSave={async (reason) => {
          if (await patchLead(l.id, { status: 'lost', lostReason: reason })) {
            setAskLost(false); toast('Marked as lost'); onChanged();
          }
        }} />
      )}

      {expanded && <LeadDetail lead={l} canAssign={canAssign} members={members} agentName={agentName} onChanged={onChanged} />}
    </div>
  );
}

function LostForm({ initial = '', onSave, onCancel }: { initial?: string; onSave: (r: string) => void; onCancel: () => void }) {
  const preset = LOST_REASONS.includes(initial) ? initial : initial ? 'other' : '';
  const [pick, setPick] = useState(preset);
  const [other, setOther] = useState(preset === 'other' ? initial : '');
  const reason = pick === 'other' ? other.trim() : pick;
  return (
    <form className="crm-lost" onSubmit={(e) => { e.preventDefault(); if (reason) onSave(reason); }}>
      <span className="small"><b>Why was it lost?</b></span>
      <select className="input input--sm" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Reason" autoFocus>
        <option value="">Choose a reason…</option>
        {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        <option value="other">Other…</option>
      </select>
      {pick === 'other' && (
        <input className="input input--sm" value={other} maxLength={300} placeholder="Reason"
          onChange={(e) => setOther(e.target.value)} aria-label="Other reason" />
      )}
      <button className="btn btn--sm btn--primary" disabled={!reason}>Save</button>
      <button type="button" className="btn btn--sm btn--ghost" onClick={onCancel}>Cancel</button>
    </form>
  );
}

/** Розгорнута заявка: відповідальний, причина програшу, нотатка й історія */
function LeadDetail({ lead: l, canAssign, members, agentName, onChanged }: {
  lead: Lead; canAssign: boolean; members: Agent[]; agentName: (id: string) => string; onChanged: () => void;
}) {
  const [events, setEvents] = useState<LeadEvent[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [editLost, setEditLost] = useState(false);
  const [tick, setTick] = useState(0);

  // історія перечитується після кожної зміни заявки (стадія, агент) і після нотатки
  const stamp = `${l.status}|${l.agentId}|${l.lostReason}|${tick}`;
  useEffect(() => {
    let live = true;
    fetch(`/api/leads/${l.id}/events`).then((r) => r.json()).then((d) => {
      if (!live) return;
      setEvents(d.items ?? []);
      setAvailable(d.available !== false);
    }).catch(() => live && setEvents([]));
    return () => { live = false; };
  }, [l.id, stamp]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/leads/${l.id}/events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: note }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast(d.error ?? 'Could not save the note');
    setNote(''); setTick((t) => t + 1);
  }

  async function reassign(agentId: string) {
    if (!agentId || agentId === l.agentId) return;
    if (await patchLead(l.id, { agentId })) { toast(`Assigned to ${agentName(agentId)}`); onChanged(); }
  }

  const team = members.filter((m) => m.active !== false);

  return (
    <div className="crm-detail">
      <div className="crm-detail__side">
        {canAssign && team.length > 1 && (
          <label className="field">
            <span className="small muted">Assigned agent</span>
            <select className="input input--sm" value={l.agentId} onChange={(e) => reassign(e.target.value)}>
              {!team.some((m) => m.id === l.agentId) && <option value={l.agentId}>{agentName(l.agentId)}</option>}
              {team.map((m) => <option key={m.id} value={m.id}>{m.name || 'Agent'}{m.isOwner ? ' (owner)' : ''}</option>)}
            </select>
          </label>
        )}
        {l.status === 'lost' && (editLost
          ? <LostForm initial={l.lostReason} onCancel={() => setEditLost(false)} onSave={async (reason) => {
              if (await patchLead(l.id, { status: 'lost', lostReason: reason })) { setEditLost(false); onChanged(); }
            }} />
          : <div className="small">
              <span className="muted">Lost reason: </span>{l.lostReason || '—'}{' '}
              <button type="button" className="link-btn small" onClick={() => setEditLost(true)}>Edit</button>
            </div>)}
      </div>

      {available ? (
        <form className="crm-note" onSubmit={addNote}>
          <textarea className="input" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note: what you discussed, next step, budget…" aria-label="Note" />
          <button className="btn btn--sm btn--primary" disabled={busy || !note.trim()}>Add note</button>
        </form>
      ) : (
        <p className="tiny muted">Notes and history will appear once the database update is applied.</p>
      )}

      <ol className="crm-timeline">
        {[...(events ?? [])].reverse().map((e) => (
          <li key={e.id} className={`crm-timeline__item crm-timeline__item--${e.kind}`}>
            <div className="small">{describe(e, agentName)}</div>
            {e.kind === 'note' && <p className="small" style={{ margin: '2px 0 0', whiteSpace: 'pre-line' }}>{e.body}</p>}
            <div className="tiny muted">
              {fmtStamp(e.createdAt)}{e.actorName && ` · ${e.actorName}`}{!e.actorId && e.kind === 'assign' && ' · automatic'}
            </div>
          </li>
        ))}
        <li className="crm-timeline__item">
          <div className="small">Enquiry received{l.channel === 'whatsapp' ? ' via WhatsApp' : l.channel === 'visit' ? ' (office visit booking)' : ''}</div>
          <div className="tiny muted">{fmtStamp(l.createdAt)}</div>
        </li>
        {events === null && <li className="tiny muted">Loading history…</li>}
      </ol>
    </div>
  );
}

function describe(e: LeadEvent, agentName: (id: string) => string) {
  if (e.kind === 'note') return <b>Note</b>;
  if (e.kind === 'assign') {
    return <>Reassigned from <b>{agentName(e.from)}</b> to <b>{agentName(e.to)}</b>{e.body === 'Round-robin' && ' (round-robin)'}</>;
  }
  return <>Stage: {leadStageLabel(e.from)} → <b>{leadStageLabel(e.to)}</b>{e.to === 'lost' && e.body && ` · ${e.body}`}</>;
}

const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Запис на візит: коли прийде, що цікавить і як зручніше звʼязатись */
function VisitLine({ lead }: { lead: Lead }) {
  const past = new Date(lead.visitAt!) < new Date();
  return (
    <div className="lead__visit">
      <span className={`pill ${past ? 'pill--off' : 'pill--on'}`}>
        <Icon name="calendar" size={14} /> Office visit · {fmtVisit(lead.visitAt!)}
      </span>
      {lead.contactVia && <span className="tiny muted">Prefers {contactPrefShort(lead.contactVia)}</span>}
      {lead.interests.length > 0 && (
        <div className="lead__tags">{lead.interests.map((x) => <span key={x} className="tag">{x}</span>)}</div>
      )}
    </div>
  );
}
