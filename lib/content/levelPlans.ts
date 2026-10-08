/**
 * Плани поверхів ЖК — для блоку «Floor plan» у вікні планування, як на LUN.
 * Файли лежать у public/plans/<slug>/levels; Duna Tower — з декларації кондомініуму (Exhibit A.6–A.13).
 */
const duna = Object.fromEntries([2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, `/plans/duna-tower/levels/${n}.png`]));

export const LEVEL_PLANS: Record<string, Record<number, string>> = {
  'duna-tower': duna,
};
