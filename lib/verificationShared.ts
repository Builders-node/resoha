/** Перевірка за документами (міграція 0075): типи й підписи, спільні для кабінету й адмінки. */
export type VerifyKind = 'agent' | 'agency' | 'developer';
export type VerifyStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';
export type DocKind = 'id' | 'license' | 'registration' | 'tax' | 'address' | 'other';

export type VerifyDoc = { kind: DocKind; path: string; name: string; size: number; type: string; url?: string };

export type VerificationRequest = {
  id: string;
  subjectKind: VerifyKind;
  subjectId: string;
  subjectName: string;
  requesterId: string;
  requesterName?: string;
  requesterEmail?: string;
  status: VerifyStatus;
  note: string;
  documents: VerifyDoc[];
  adminNote: string;
  reviewedAt: string | null;
  createdAt: string;
};

export const VERIFY_BUCKET = 'verification-docs';
export const MAX_VERIFY_DOCS = 10;
export const MAX_VERIFY_BYTES = 20 * 1024 * 1024;
export const VERIFY_TYPES: Record<string, string> = {
  'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};

export const DOC_KINDS: DocKind[] = ['license', 'id', 'registration', 'tax', 'address', 'other'];
export const DOC_LABELS: Record<DocKind, string> = {
  license: 'Real estate licence or association card',
  id: 'ID or passport',
  registration: 'Company registration (escritura, RTN)',
  tax: 'Tax certificate',
  address: 'Proof of office address',
  other: 'Other document',
};

export const KIND_LABELS: Record<VerifyKind, string> = { agent: 'Realtor', agency: 'Agency', developer: 'Developer' };

/** Що попросити в кожного: підказка над формою */
export const WHAT_TO_SEND: Record<VerifyKind, string> = {
  agent: 'Send your ID and a real estate licence or association membership card. If you work without a licence, a letter from your agency also works.',
  agency: 'Send the company registration (escritura de constitución or RTN) and the ID of the owner or legal representative.',
  developer: 'Send the company registration (escritura de constitución or RTN) and the ID of the legal representative. Permits for a specific project go to that project’s documents.',
};

export const mapVerification = (r: Record<string, unknown>): VerificationRequest => {
  const p = (r.requester ?? null) as { name?: string; email?: string } | null;
  return {
    id: String(r.id), subjectKind: r.subject_kind as VerifyKind, subjectId: String(r.subject_id),
    subjectName: String(r.subject_name ?? ''), requesterId: String(r.requester_id),
    requesterName: p?.name ?? undefined, requesterEmail: p?.email ?? undefined,
    status: r.status as VerifyStatus, note: String(r.note ?? ''),
    documents: Array.isArray(r.documents) ? (r.documents as VerifyDoc[]) : [],
    adminNote: String(r.admin_note ?? ''), reviewedAt: (r.reviewed_at as string) ?? null, createdAt: String(r.created_at),
  };
};
