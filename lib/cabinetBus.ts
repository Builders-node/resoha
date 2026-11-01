import type { Tab } from './agentTabs';

/**
 * Нижня панель кабінету на телефоні живе в сайдбарі, а вкладки — у клієнтському кабінеті.
 * Звʼязуємо їх подіями вікна, щоб не тягнути спільний стан через layout.
 */
export type CabinetState = { tab: Tab; newLeads: number; developer?: boolean };

export const goCabinetTab = (tab: Tab) => window.dispatchEvent(new CustomEvent<Tab>('cabinet:go', { detail: tab }));

export const announceCabinet = (s: CabinetState) => {
  (window as unknown as { __cabinet?: CabinetState }).__cabinet = s;
  window.dispatchEvent(new CustomEvent<CabinetState>('cabinet:state', { detail: s }));
};

export const lastCabinet = (): CabinetState | null =>
  typeof window === 'undefined' ? null : (window as unknown as { __cabinet?: CabinetState }).__cabinet ?? null;
