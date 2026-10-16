import { agentResponseStats, listAgents, queryListings, type AgentResponse } from './db';
import { intlLocale, type Lang } from './i18n';
import { listingScore } from './listingScore';
import type { Agent, Listing } from './types';

/**
 * «Агент місяця»: щомісячний рейтинг ріелторів і бейдж для соцмереж і сайту.
 * Нагорода — за минулий календарний місяць: заявки беремо за цей місяць, а якість
 * оголошень і відгуки — як є зараз (історії цих показників база не зберігає).
 *
 * 100 балів: якість оголошень 40, відповідь на заявки 35, відгуки 25. Пункт без даних
 * дає 0 — так ріелтор бачить, що додати, а не отримує бали за порожнечу.
 */
export const WEIGHTS = { quality: 40, response: 35, reviews: 25 } as const;
/** Скільки місць отримують звання «Топ-агент» */
export const TOP_N = 3;

export type AgentRank = {
  agent: Agent;
  rank: number;
  score: number;
  parts: { quality: number; response: number; reviews: number };
  listings: number;
  /** середня повнота оголошень, % */
  qualityPct: number;
  response: AgentResponse | null;
  top: boolean;
};

export type RankingPeriod = { from: string; to: string; month: string };

/** Минулий календарний місяць: [1-ше число, 1-ше число поточного) */
export function rankingPeriod(now = new Date()): RankingPeriod {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return { from: from.toISOString(), to: to.toISOString(), month: from.toISOString() };
}

export const periodLabel = (p: RankingPeriod, lang: Lang) => {
  const s = new Date(p.month).toLocaleDateString(intlLocale(lang), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function rankAgents(agents: Agent[], listings: Listing[], responses: AgentResponse[]): AgentRank[] {
  const byAgent = new Map<string, Listing[]>();
  listings.forEach((l) => byAgent.set(l.agentId, [...(byAgent.get(l.agentId) ?? []), l]));
  const resp = new Map(responses.map((r) => [r.agentId, r]));

  const rows = agents
    .filter((a) => a.active && (byAgent.get(a.id)?.length ?? 0) > 0)
    .map((agent) => {
      const own = byAgent.get(agent.id)!;
      const qualityPct = Math.round(own.reduce((s, l) => s + listingScore(l).pct, 0) / own.length);
      // повна вага якості — від 5 оголошень: один ідеальний обʼєкт не робить ріелтора найкращим
      const quality = WEIGHTS.quality * (qualityPct / 100) * Math.min(1, own.length / 5);
      const r = resp.get(agent.id) ?? null;
      const response = r?.enough ? WEIGHTS.response * r.answeredShare : 0;
      // повна вага відгуків — від 5 відгуків
      const reviews = agent.reviews > 0 ? WEIGHTS.reviews * (agent.rating / 5) * Math.min(1, agent.reviews / 5) : 0;
      return {
        agent, rank: 0, top: false, listings: own.length, qualityPct, response: r,
        parts: { quality: round1(quality), response: round1(response), reviews: round1(reviews) },
        score: Math.round(quality + response + reviews),
      };
    })
    .sort((a, b) => b.score - a.score || b.listings - a.listings || a.agent.name.localeCompare(b.agent.name));

  rows.forEach((r, i) => {
    r.rank = i + 1;
    r.top = i < TOP_N && r.score > 0;
  });
  return rows;
}

/** Рейтинг за минулий місяць з бази */
export async function loadRanking(now = new Date()) {
  const period = rankingPeriod(now);
  const [agents, listings, responses] = await Promise.all([
    listAgents(),
    queryListings(),
    agentResponseStats(period.from, period.to),
  ]);
  return { period, rows: rankAgents(agents, listings, responses) };
}
