import { SkDashboard } from '@/components/Skeleton';

/** Кабінет покупця: меню з кількох вкладок і шапка профілю, без плиток цифр. */
export default function AccountLoading() {
  return <SkDashboard stats={false} nav={4} />;
}
