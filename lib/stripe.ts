import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stripe Checkout без SDK: нам потрібні три виклики — створити сесію оплати,
 * прочитати її після повернення і перевірити підпис вебхука. Ключі — у змінних оточення:
 *  STRIPE_SECRET_KEY      — sk_test_… або sk_live_…
 *  STRIPE_WEBHOOK_SECRET  — whsec_… (необовʼязково: без нього оплату підтверджує повернення зі Stripe)
 * Без STRIPE_SECRET_KEY просування працює як заявка: адмін позначає її оплаченою вручну.
 */

const API = 'https://api.stripe.com/v1';

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);
export const stripeTestMode = () => (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_');

export type CheckoutSession = {
  id: string;
  url: string | null;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  status: 'open' | 'complete' | 'expired';
  amount_total: number | null;
  currency: string | null;
  payment_intent: string | null;
  metadata: Record<string, string>;
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...init.headers,
    },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe error ${res.status}`);
  return data as T;
}

export async function createCheckout(opts: {
  campaignId: string; name: string; description: string; amountCents: number; currency: string;
  email?: string; successUrl: string; cancelUrl: string;
}): Promise<CheckoutSession> {
  const form = new URLSearchParams({
    mode: 'payment',
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.campaignId,
    'metadata[campaign_id]': opts.campaignId,
    'payment_intent_data[metadata][campaign_id]': opts.campaignId,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': opts.currency,
    'line_items[0][price_data][unit_amount]': String(opts.amountCents),
    'line_items[0][price_data][product_data][name]': opts.name.slice(0, 250),
    'line_items[0][price_data][product_data][description]': opts.description.slice(0, 500),
  });
  if (opts.email) form.set('customer_email', opts.email);
  return call<CheckoutSession>('/checkout/sessions', { method: 'POST', body: form });
}

export const getCheckout = (id: string) =>
  call<CheckoutSession>(`/checkout/sessions/${encodeURIComponent(id)}`);

/** Перевірка заголовка Stripe-Signature: t=…,v1=… — HMAC-SHA256 від "t.payload". */
export function verifyWebhook(payload: string, header: string | null, toleranceSec = 300): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = header.split(',').map((p) => p.split('=') as [string, string]);
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || sigs.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, 'hex');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
