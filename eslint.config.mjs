import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

// `next lint` у Next 16 більше немає — конфіг живе тут і запускається як `npm run lint`.
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Фото віддаємо звичайним <img>, а src/srcSet бере з оптимізатора OptImg
      // (getImageProps) — компонент next/image зі своїми стилями тут не потрібен.
      '@next/next/no-img-element': 'off',
      // Завантаження даних при монтуванні (fetch → setState) React-плагін вважає
      // помилкою. Патерн тут свідомий і працює; переписувати всі кабінети на
      // інший спосіб — окрема задача, тож поки лишаємо як попередження.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
