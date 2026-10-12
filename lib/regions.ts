/**
 * Міста й острови, на яких працює сайт. `name` — те саме значення, що лежить у колонці
 * `island` оголошень і ЖК (історично там був лише «Roatán», тепер це «місто або острів»).
 * Назви районів унікальні між регіонами, тож регіон завжди виводиться з району.
 *
 * Центри районів Роатана перевірені на суші за береговою лінією OSM. Центри районів
 * Сан-Педро-Сули й Тегусігальпи — орієнтовні центри колоній (до ~500 м): міста на материку,
 * пін у морі там не загрожує, а точне місце ріелтор однаково ставить на карті.
 */
export type Region = {
  slug: string;
  /** значення колонки `island` */
  name: string;
  /** департамент Гондурасу — для адреси й schema.org */
  department: string;
  /** як департамент звучить англійською, якщо інакше, ніж іспанською */
  departmentEn?: string;
  centre: [number, number];
  zoom: number;
  /** межі, за якими пін вважаємо «не тут»: south, west, north, east */
  bbox: [number, number, number, number];
  areas: Record<string, [number, number]>;
};

export const REGIONS: Region[] = [
  {
    slug: 'roatan',
    name: 'Roatán',
    department: 'Islas de la Bahía',
    departmentEn: 'Bay Islands',
    centre: [16.36, -86.45],
    zoom: 11,
    bbox: [16.2, -86.7, 16.6, -86.2],
    areas: {
      'West Bay': [16.2752, -86.5977],
      'West End': [16.3047, -86.5929],
      'Gibson Bight': [16.3190, -86.5808],
      'Sandy Bay': [16.3323, -86.5633],
      'Flowers Bay': [16.2950, -86.5699],
      'Coxen Hole': [16.3211, -86.5383],
      'French Harbour': [16.3518, -86.4570],
      'Parrot Tree': [16.3641, -86.4131],
      'Palmetto Bay': [16.3640, -86.4878],
      'Pristine Bay': [16.366945, -86.471605],
      'Crawfish Rock': [16.3699, -86.4747],
      'Oak Ridge': [16.3890, -86.3591],
      'Punta Gorda': [16.4145, -86.3674],
      'Camp Bay': [16.4302, -86.2819],
    },
  },
  {
    slug: 'san-pedro-sula',
    name: 'San Pedro Sula',
    department: 'Cortés',
    centre: [15.515, -88.02],
    zoom: 12,
    bbox: [15.35, -88.15, 15.65, -87.85],
    areas: {
      'Barrio Río de Piedras': [15.5005, -88.0375],
      'Colonia Trejo': [15.5130, -88.0410],
      'Barrio Los Andes': [15.5165, -88.0300],
      'Colonia Moderna': [15.5045, -88.0465],
      'Colonia Juan Lindo': [15.5200, -88.0115],
      'Colonia Jardines del Valle': [15.5520, -88.0100],
      'Barrio Guamilito': [15.5095, -88.0270],
      'Colonia Los Álamos': [15.5290, -88.0420],
    },
  },
  {
    slug: 'tegucigalpa',
    name: 'Tegucigalpa',
    department: 'Francisco Morazán',
    centre: [14.09, -87.19],
    zoom: 12,
    bbox: [13.95, -87.35, 14.25, -87.0],
    areas: {
      'Lomas del Guijarro': [14.0960, -87.1830],
      'Lomas del Mayab': [14.0870, -87.1870],
      'Colonia Palmira': [14.0990, -87.1960],
      'Los Próceres': [14.0930, -87.1850],
      'Colonia Tepeyac': [14.0830, -87.1990],
      'Colonia Rubén Darío': [14.0920, -87.2040],
      'Altos de Las Lomas': [14.1010, -87.1760],
      'El Hatillo': [14.1350, -87.1700],
      'Santa Lucía': [14.1110, -87.1170],
      'Valle de Ángeles': [14.1550, -87.0380],
      'Comayagüela': [14.0950, -87.2150],
    },
  },
];

export const DEFAULT_REGION = REGIONS[0];

/** «Roatán» / «roatan» / «San Pedro Sula» → регіон */
export const regionByName = (name: string | null | undefined) => {
  const k = fold(name ?? '');
  return REGIONS.find((r) => fold(r.name) === k || r.slug === k);
};

export const regionBySlug = (slug: string) => REGIONS.find((r) => r.slug === slug);

/** Регіон району; невідомий район — undefined */
export const regionOfArea = (neighborhood: string | null | undefined) =>
  neighborhood ? REGIONS.find((r) => neighborhood in r.areas) : undefined;

/** Назва для колонки `island`: з району, інакше передане значення, інакше Роатан */
export const islandFor = (neighborhood?: string | null, given?: string | null) =>
  regionOfArea(neighborhood)?.name ?? regionByName(given)?.name ?? (given?.trim() || DEFAULT_REGION.name);

/** Точка всередині якогось із регіонів */
export const inAnyRegion = (lat: number, lng: number) =>
  REGIONS.some(({ bbox: [s, w, n, e] }) => lat >= s && lat <= n && lng >= w && lng <= e);

/** Департамент англійською для t(): «Bay Islands» перекладається, материкові назви — власні й лишаються */
export const departmentLabel = (island: string | null | undefined) => {
  const r = regionByName(island) ?? DEFAULT_REGION;
  return r.departmentEn ?? r.department;
};

function fold(s: string) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
