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
  // Віджети ЖК (/embed/*) вставляють у <iframe> на сайтах забудовників — їм дозволяємо будь-яку
  // батьківську сторінку. Решту сайту цей блок не чіпає.
  async headers() {
    return [
      {
        source: '/embed/:path*',
        // X-Frame-Options тут не ставимо: frame-ancestors його заміняє, а «дозволити всім» він не вміє
        headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }],
      },
    ];
  },
};

export default nextConfig;
