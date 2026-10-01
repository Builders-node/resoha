/**
 * Вхід і реєстрація живуть у модалці, а не на окремих сторінках.
 * Будь-який клієнтський компонент відкриває її подією — без спільного контексту.
 */
export type AuthView = 'login' | 'signup' | 'forgot';
export type AuthMode = 'buyer' | 'agent' | 'agency';
export type AuthRequest = { view: AuthView; as?: AuthMode };

export const AUTH_EVENT = 'resoha:auth';

export function openAuth(view: AuthView = 'login', as?: AuthMode) {
  window.dispatchEvent(new CustomEvent<AuthRequest>(AUTH_EVENT, { detail: { view, as } }));
}

export const isAuthView = (v: unknown): v is AuthView => v === 'login' || v === 'signup' || v === 'forgot';
export const isAuthMode = (v: unknown): v is AuthMode => v === 'buyer' || v === 'agent' || v === 'agency';
