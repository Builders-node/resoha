import SiteShell from '@/components/SiteShell';
import NotFound from './(site)/not-found';

/** Адреса, якої немає взагалі, не потрапляє в жодну групу маршрутів — тож каркас тут свій. */
export default function RootNotFound() {
  return <SiteShell><NotFound /></SiteShell>;
}
