/**
 * Гід для мешканців ЖК — вкладка «Resident guide»: що є в будинку, години, спільнота, поруч.
 * Duna Tower — з гостьового путівника Duna Residences (duna-101.lovable.app) і статті в блозі.
 * Рядки англійською; іспанські — у словнику lib/i18n/es/developments.ts.
 */
export type GuideAmenity = { icon: string; name: string; level?: string; hours: string; note?: string };
export type GuideLink = { icon: string; label: string; value: string; href: string };

export type ResidentGuide = {
  lead: string;
  amenities: GuideAmenity[];
  community: GuideLink[];
  /** Навколо будинку: стаття в блозі й приблизний час на машині */
  around: { article: string; drives: [place: string, bestFor: string, time: string][] };
  health: string[];
  source: { label: string; href: string };
};

export const RESIDENT_GUIDES: Record<string, ResidentGuide> = {
  'duna-tower': {
    lead: 'Duna Tower runs as an aparthotel, Duna Residences, inside Próspera in Crawfish Rock, on Roatán’s north shore. Here is what owners, residents and guests use every day: what is in the building and when, how to reach the team, and what is nearby.',
    amenities: [
      { icon: 'headset', name: 'Front desk', hours: 'Monday–Friday, 9:00 AM–5:00 PM' },
      { icon: 'wallet', name: '2 Cans convenience store', level: 'Level 1', hours: 'Open 24/7', note: 'Self-checkout; pay with $LIVES or PayPal.' },
      { icon: 'drop', name: 'Infinity pool', level: 'Level 8', hours: 'Quiet hours from 10:00 PM' },
      { icon: 'heater', name: 'Sauna', level: 'Level 8', hours: 'Open 24/7' },
    ],
    community: [
      { icon: 'camera', label: 'Instagram', value: '@dunaresidences', href: 'https://www.instagram.com/dunaresidences/' },
      { icon: 'chat', label: 'Residents’ Discord: news, meetups and workshops', value: 'discord.gg/FKSGnQWxXp', href: 'https://discord.gg/FKSGnQWxXp' },
      { icon: 'island', label: 'Próspera spaces, events and services', value: 'prospera.co', href: 'https://prospera.co' },
    ],
    around: {
      article: '/blog/best-places-near-duna-tower-roatan',
      drives: [
        ['French Harbour', 'Groceries, seafood, golf', '15 minutes'],
        ['Airport (RTB)', 'Flights, Coxen Hole errands', '15 minutes'],
        ['Sandy Bay', 'Gardens, museum, dolphins', '20 minutes'],
        ['West End', 'Sunsets, food, diving', '30 minutes'],
        ['West Bay', 'The beach and the reef', '35 minutes'],
      ],
    },
    health: [
      'For a doctor, the building’s guide points residents to Ad Astra Clinic in Próspera.',
      'In an emergency anywhere in Honduras, call 911.',
    ],
    source: { label: 'Duna Residences guidebook', href: 'https://duna-101.lovable.app/guide' },
  },
};
