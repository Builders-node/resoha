import Link from 'next/link';
import AgencyRow from '@/components/AgencyRow';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { agencyBoard, listAgents, queryListings } from '@/lib/db';
import { nListings } from '@/lib/format';
import { getLang } from '@/lib/i18n/server';
import { makeT } from '@/lib/i18n';

export const metadata = { title: 'Agents & agencies — Resoha Roatán' };

/** Публічний каталог: раніше пункт меню «Agents» вів у кабінет ріелтора зі стіною входу. */
export default async function AgentsIndexPage() {
  const [agents, board, listings, lang] = await Promise.all([listAgents(), agencyBoard(), queryListings(), getLang()]);
  const t = makeT(lang);

  const byAgent = new Map<string, number>();
  listings.forEach((l) => byAgent.set(l.agentId, (byAgent.get(l.agentId) ?? 0) + 1));

  const sorted = [...agents].sort((a, b) => (byAgent.get(b.id) ?? 0) - (byAgent.get(a.id) ?? 0));

  return (
    <div className="wrap">
      <header className="page-top" style={{ paddingBottom: 4 }}>
        <h1 style={{ fontSize: 30 }}>{t('Agents & agencies on Roatán')}</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          {t('Everyone publishing on Resoha. Open a card to see what they have listed and how to reach them.')}
        </p>
      </header>

      <section className="section">
        <div className="section__head">
          <h2>{t('Agencies')}</h2>
          <Link className="btn btn--primary" href="/agent">{t('Join as an agent')} <Icon name="arrowRight" size={18} /></Link>
        </div>
        <AgencyRow rows={board} />
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section__head"><h2>{t('Realtors')}</h2></div>

        {sorted.length === 0 ? (
          <div className="panel empty">
            <b>{t('No realtors yet.')}</b>
            <p className="muted small" style={{ marginTop: 6 }}>
              {t('The first agency to sign up shows up here with its whole team.')}
            </p>
          </div>
        ) : (
          <div className="grid grid--4">
            {sorted.map((a) => (
              <Link key={a.id} className="person" href={`/agents/${a.id}`}>
                <Avatar src={a.avatar} name={a.name} />
                <div>
                  <div className="person__name with-ico">
                    {a.name}
                    {a.verified && <Icon name="verified" size={15} className="ico ico--ok" />}
                  </div>
                  <div className="muted small">{a.agency || t('Independent agent')}</div>
                  <div className="tiny muted">
                    {nListings(byAgent.get(a.id) ?? 0, lang)}
                    {a.reviews > 0 && ` · ${a.rating} ★ (${a.reviews})`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="crumbs crumbs--foot small muted"><Link href="/">{t('Home')}</Link> · {t('Agents & agencies')}</div>
    </div>
  );
}
