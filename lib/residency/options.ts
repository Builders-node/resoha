/**
 * Довідники для форми документів резидентства (Admin → Residency docs).
 * Назви країн і національностей у двох мовах; жіночий рід — для «con nacionalidad …»,
 * чоловічий — для «Pasaporte …». Країни поза списком адмін вписує вручну.
 */
export type Country = { code: string; es: string; en: string; esF: string; esM: string; enAdj: string };

export const COUNTRIES: Country[] = [
  { code: 'US', es: 'Estados Unidos', en: 'United States', esF: 'estadounidense', esM: 'estadounidense', enAdj: 'American' },
  { code: 'CA', es: 'Canadá', en: 'Canada', esF: 'canadiense', esM: 'canadiense', enAdj: 'Canadian' },
  { code: 'GB', es: 'Reino Unido', en: 'United Kingdom', esF: 'británica', esM: 'británico', enAdj: 'British' },
  { code: 'IE', es: 'Irlanda', en: 'Ireland', esF: 'irlandesa', esM: 'irlandés', enAdj: 'Irish' },
  { code: 'DE', es: 'Alemania', en: 'Germany', esF: 'alemana', esM: 'alemán', enAdj: 'German' },
  { code: 'AT', es: 'Austria', en: 'Austria', esF: 'austriaca', esM: 'austriaco', enAdj: 'Austrian' },
  { code: 'CH', es: 'Suiza', en: 'Switzerland', esF: 'suiza', esM: 'suizo', enAdj: 'Swiss' },
  { code: 'FR', es: 'Francia', en: 'France', esF: 'francesa', esM: 'francés', enAdj: 'French' },
  { code: 'BE', es: 'Bélgica', en: 'Belgium', esF: 'belga', esM: 'belga', enAdj: 'Belgian' },
  { code: 'NL', es: 'Países Bajos', en: 'Netherlands', esF: 'neerlandesa', esM: 'neerlandés', enAdj: 'Dutch' },
  { code: 'ES', es: 'España', en: 'Spain', esF: 'española', esM: 'español', enAdj: 'Spanish' },
  { code: 'IT', es: 'Italia', en: 'Italy', esF: 'italiana', esM: 'italiano', enAdj: 'Italian' },
  { code: 'SE', es: 'Suecia', en: 'Sweden', esF: 'sueca', esM: 'sueco', enAdj: 'Swedish' },
  { code: 'NO', es: 'Noruega', en: 'Norway', esF: 'noruega', esM: 'noruego', enAdj: 'Norwegian' },
  { code: 'PL', es: 'Polonia', en: 'Poland', esF: 'polaca', esM: 'polaco', enAdj: 'Polish' },
  { code: 'UA', es: 'Ucrania', en: 'Ukraine', esF: 'ucraniana', esM: 'ucraniano', enAdj: 'Ukrainian' },
  { code: 'RU', es: 'Rusia', en: 'Russia', esF: 'rusa', esM: 'ruso', enAdj: 'Russian' },
  { code: 'IL', es: 'Israel', en: 'Israel', esF: 'israelí', esM: 'israelí', enAdj: 'Israeli' },
  { code: 'AU', es: 'Australia', en: 'Australia', esF: 'australiana', esM: 'australiano', enAdj: 'Australian' },
  { code: 'MX', es: 'México', en: 'Mexico', esF: 'mexicana', esM: 'mexicano', enAdj: 'Mexican' },
  { code: 'BR', es: 'Brasil', en: 'Brazil', esF: 'brasileña', esM: 'brasileño', enAdj: 'Brazilian' },
  { code: 'AR', es: 'Argentina', en: 'Argentina', esF: 'argentina', esM: 'argentino', enAdj: 'Argentine' },
  { code: 'CO', es: 'Colombia', en: 'Colombia', esF: 'colombiana', esM: 'colombiano', enAdj: 'Colombian' },
];

export type EntryPoint = { id: string; es: string; en: string };

export const ENTRY_POINTS: EntryPoint[] = [
  { id: 'rtb', es: 'Aeropuerto Internacional Juan Manuel Gálvez, Roatán', en: 'Juan Manuel Gálvez International Airport, Roatán' },
  { id: 'sap', es: 'Aeropuerto Internacional Ramón Villeda Morales, San Pedro Sula', en: 'Ramón Villeda Morales International Airport, San Pedro Sula' },
  { id: 'xpl', es: 'Aeropuerto Internacional de Palmerola, Comayagua', en: 'Palmerola International Airport, Comayagua' },
  { id: 'lce', es: 'Aeropuerto Internacional Golosón, La Ceiba', en: 'Golosón International Airport, La Ceiba' },
];

export const MARITAL_LABELS: [value: 'single' | 'married' | 'divorced' | 'widowed', label: string][] = [
  ['single', 'Single'], ['married', 'Married'], ['divorced', 'Divorced'], ['widowed', 'Widowed'],
];
