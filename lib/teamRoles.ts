/**
 * Ролі в агенції (міграція 0055). Права по всій команді:
 * оголошення й ЖК — owner, manager, editor; заявки й візити — owner, manager, leads; склад команди — owner, manager.
 * Звичайний agent веде лише своє. Справжню межу тримає RLS (agency_can), тут — лише що показати в кабінеті.
 */
export type AgencyRole = 'owner' | 'manager' | 'editor' | 'leads' | 'agent';
export type AgencyPower = 'listings' | 'leads' | 'team';

export const AGENCY_ROLES: { role: AgencyRole; label: string; hint: string }[] = [
  { role: 'owner', label: 'Owner', hint: 'Everything, including owners and closing the agency' },
  { role: 'manager', label: 'Manager', hint: 'All listings, all leads and the team' },
  { role: 'editor', label: 'Listing editor', hint: 'Edits every listing and development of the agency' },
  { role: 'leads', label: 'Leads only', hint: 'Sees and handles every lead and visit of the agency' },
  { role: 'agent', label: 'Agent', hint: 'Own listings and own leads' },
];

export const isAgencyRole = (v: unknown): v is AgencyRole => AGENCY_ROLES.some((r) => r.role === v);
export const roleLabel = (r: AgencyRole | null | undefined) => AGENCY_ROLES.find((x) => x.role === r)?.label ?? 'Agent';

const POWERS: Record<AgencyPower, AgencyRole[]> = {
  listings: ['owner', 'manager', 'editor'],
  leads: ['owner', 'manager', 'leads'],
  team: ['owner', 'manager'],
};

/** Роль в активній команді; до міграції 0055 її немає — тоді за прапорцем власника */
export const agencyRoleOf = (u: { isOwner: boolean; agencyRole?: AgencyRole | null }): AgencyRole =>
  u.isOwner ? 'owner' : u.agencyRole && isAgencyRole(u.agencyRole) ? u.agencyRole : 'agent';

export const agencyCan = (
  u: { agencyId: string | null; isOwner: boolean; agencyRole?: AgencyRole | null },
  what: AgencyPower,
) => Boolean(u.agencyId) && POWERS[what].includes(agencyRoleOf(u));
