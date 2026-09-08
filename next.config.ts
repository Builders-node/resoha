import type { NextConfig } from 'next';

// Картинки віддаємо звичайним <img> (Supabase Storage і плейсхолдери),
// тому окремої конфігурації next/image тут не потрібно.
const nextConfig: NextConfig = {
  // Значок дев-режиму сидить у лівому нижньому куті й перекриває нижню панель на мобільному
  devIndicators: false,
};

export default nextConfig;
