import type { StyleSpecification } from 'maplibre-gl';

/**
 * Векторний стиль карти «як у ЛУН»: світло-бузковий фон, білі дороги, зелені парки
 * й обʼємні білі будинки. Тайли — OpenFreeMap (схема OpenMapTiles), ключ не потрібен.
 * Супутник — растрові тайли Esri, шар вмикається кнопкою «шари».
 */
const OFM = 'https://tiles.openfreemap.org';
const FONT = ['Noto Sans Regular'];
const FONT_BOLD = ['Noto Sans Bold'];

const C = {
  bg: '#eceef7',
  park: '#c6e8cd',
  wood: '#bfe3c6',
  water: '#b7d7f2',
  roadCase: '#d5d9e6',
  road: '#ffffff',
  building: '#ffffff',
  label: '#7c81aa',
  labelDark: '#5b6090',
};

/** Ширина дороги за класом і масштабом. */
const roadWidth = (k: number): unknown => [
  'interpolate', ['exponential', 1.5], ['zoom'],
  12, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 2.5 * k, ['secondary', 'tertiary'], 1.8 * k, 0.8 * k],
  18, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 26 * k, ['secondary', 'tertiary'], 20 * k, ['service', 'track'], 7 * k, 13 * k],
];

const roadClasses = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'track'];

export const SATELLITE_LAYER = 'satellite';
export const BUILDINGS_LAYER = 'building-3d';

export const mapStyle: StyleSpecification = {
  version: 8,
  glyphs: `${OFM}/fonts/{fontstack}/{range}.pbf`,
  sprite: `${OFM}/sprites/ofm_f384/ofm`,
  light: { anchor: 'viewport', color: '#ffffff', intensity: 0.32, position: [1.3, 210, 35] },
  sources: {
    omt: {
      type: 'vector',
      url: `${OFM}/planet`,
      attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    },
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery © Esri',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': C.bg } },
    {
      id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'farmland']]],
      paint: { 'fill-color': ['match', ['get', 'class'], 'wood', C.wood, C.park], 'fill-opacity': 0.9 },
    },
    { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': C.park } },
    {
      id: 'landuse', type: 'fill', source: 'omt', 'source-layer': 'landuse',
      filter: ['in', ['get', 'class'], ['literal', ['hospital', 'school', 'stadium', 'pitch', 'cemetery']]],
      paint: { 'fill-color': ['match', ['get', 'class'], 'hospital', '#f3e3e6', 'cemetery', C.park, '#e6e8f4'] },
    },
    { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': C.water } },
    {
      id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway',
      paint: { 'line-color': C.water, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 18, 6] },
    },
    { id: SATELLITE_LAYER, type: 'raster', source: 'esri', layout: { visibility: 'none' } },
    {
      id: 'path', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 14,
      filter: ['==', ['get', 'class'], 'path'],
      paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.6, 18, 2], 'line-dasharray': [1.5, 1.5] },
    },
    {
      id: 'road-case', type: 'line', source: 'omt', 'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', roadClasses]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': C.roadCase, 'line-width': roadWidth(1.25) as never },
    },
    {
      id: 'road', type: 'line', source: 'omt', 'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', roadClasses]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': C.road, 'line-width': roadWidth(1) as never },
    },
    {
      id: 'building-flat', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 13, maxzoom: 15,
      paint: { 'fill-color': C.building, 'fill-outline-color': '#dcdfea' },
    },
    {
      id: BUILDINGS_LAYER, type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 15,
      paint: {
        'fill-extrusion-color': C.building,
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 1,
        'fill-extrusion-vertical-gradient': true,
      },
    },
    {
      id: 'housenumber', type: 'symbol', source: 'omt', 'source-layer': 'housenumber', minzoom: 17,
      layout: { 'text-field': ['get', 'housenumber'], 'text-font': FONT, 'text-size': 12 },
      paint: { 'text-color': C.label, 'text-halo-color': 'rgba(255,255,255,.7)', 'text-halo-width': 1 },
    },
    {
      id: 'road-label', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 13,
      layout: {
        'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 18, 14],
        'text-letter-spacing': 0.02,
      },
      paint: { 'text-color': C.label, 'text-halo-color': C.bg, 'text-halo-width': 1.5 },
    },
    {
      id: 'poi', type: 'symbol', source: 'omt', 'source-layer': 'poi', minzoom: 14,
      filter: ['<=', ['get', 'rank'], ['step', ['zoom'], 6, 16, 20, 17, 40]],
      layout: {
        'icon-image': ['match', ['get', 'subclass'], ['florist', 'furniture'], ['get', 'subclass'], ['get', 'class']],
        'icon-size': 1,
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': FONT, 'text-size': 12, 'text-offset': [0, 0.9], 'text-anchor': 'top',
        'text-max-width': 9, 'text-optional': true,
      },
      paint: { 'text-color': C.label, 'text-halo-color': 'rgba(255,255,255,.85)', 'text-halo-width': 1.2, 'icon-opacity': 0.85 },
    },
    {
      id: 'place', type: 'symbol', source: 'omt', 'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'suburb', 'neighbourhood', 'hamlet']]],
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': FONT_BOLD,
        'text-size': ['match', ['get', 'class'], ['city', 'town'], 15, 12.5],
        'text-max-width': 8,
      },
      paint: { 'text-color': C.labelDark, 'text-halo-color': 'rgba(255,255,255,.85)', 'text-halo-width': 1.5 },
    },
  ],
};

/** Шари, які ховаємо під супутником, щоб знімок не перекривався заливками. */
export const FILL_LAYERS = ['landcover', 'park', 'landuse', 'water', 'building-flat'];
