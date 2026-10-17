/**
 * Хости фото, які пускаємо через оптимізатор /_next/image. Список, а не «будь-який https»:
 * інакше /_next/image став би відкритим проксі й палив ліміт Vercel на оптимізацію.
 * Фото з іншого хоста показуються оригіналом. Новий сайт агенції в імпорті — додати сюди.
 */
export const IMAGE_HOSTS = [
  'zgfcysoyksticnbgbhxb.supabase.co', // Supabase Storage — основне сховище фото
  'www.hogarli.com',
  'www.roatanlife.com',
  'www.roatanpropertymanagement.com',
  'roatanexecutiverealty.com',
  'darienvillage.com',
];
