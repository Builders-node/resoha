import type { NextConfig } from 'next';
import { IMAGE_HOSTS } from './lib/imageHosts';

const nextConfig: NextConfig = {
  // Фото оголошень і ЖК ідуть через оптимізатор /_next/image (components/OptImg.tsx):
  // браузер отримує AVIF/WebP під ширину картки, а не оригінал на кілька мегабайт.
  images: {
    formats: ['image/avif', 'image/webp'],
    // 4K не потрібен: найширше фото — галерея на всю ширину екрана
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [96, 128, 256, 384],
    qualities: [75],
    // фото за адресою не змінюються (нове фото — новий файл), тож кешуємо надовго
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({ protocol: 'https' as const, hostname })),
  },
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
