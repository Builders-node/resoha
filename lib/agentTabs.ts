/** Вкладки кабінету ріелтора. Окремий модуль, бо сторінка-сервер читає `?tab=`, а сам кабінет — клієнтський. */
export type Tab = 'listings' | 'analytics' | 'promote' | 'leads' | 'new' | 'developments' | 'developer' | 'team' | 'profile' | 'import' | 'visits';
export const TABS: Tab[] = ['listings', 'analytics', 'promote', 'leads', 'new', 'developments', 'developer', 'team', 'profile', 'import', 'visits'];
export const isTab = (v: unknown): v is Tab => TABS.includes(v as Tab);
