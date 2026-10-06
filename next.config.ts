import type { NextConfig } from 'next';

// Картинки віддаємо звичайним <img> (Supabase Storage і плейсхолдери),
// тому окремої конфігурації next/image тут не потрібно.
const nextConfig: NextConfig = {
  // Значок дев-режиму сидить у лівому нижньому куті й перекриває нижню панель на мобільному
  devIndicators: false,
  // Duna Tower спершу був одним оголошенням з прайсом; тепер це ЖК з окремими квартирами.
  // Старе посилання вже розійшлось — ведемо його на сторінку ЖК.
  async redirects() {
    return [
      { source: '/listings/e645e44f-17e3-45d9-ba19-4c95dee607a0', destination: '/developments/duna-tower', permanent: true },
    ];
  },
};

export default nextConfig;
