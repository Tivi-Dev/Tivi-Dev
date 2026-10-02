export const aboutIconNames = ["person","education","code","trophy","gamepad","briefcase","heart","book","globe","music","camera","star","none"] as const;
export type AboutIconName = typeof aboutIconNames[number];

export const aboutIcons: Record<AboutIconName, { label: string; path: string }> = {
  person: { label: 'Person / Profil', path: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21v-2a7 7 0 0 1 14 0v2' },
  education: { label: 'Ausbildung', path: 'm2 8 10-5 10 5-10 5ZM6 10v7q6 5 12 0v-7M22 8v9' },
  code: { label: 'Code / Entwicklung', path: 'm8 5-6 7 6 7m8-14 6 7-6 7M14 3l-4 18' },
  trophy: { label: 'Auszeichnung / Zertifikat', path: 'm9 14-2 8 5-3 5 3-2-8M18 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z' },
  gamepad: { label: 'Gaming / Hobbys', path: 'M5 7h14l3 13h-5l-3-4h-4l-3 4H2ZM6 10v5M4 12.5h4M17 11h.01M19 14h.01' },
  briefcase: { label: 'Arbeit / Projekte', path: 'M4 7h16v14H4ZM9 7V3h6v4M4 12h16M10 12v3h4v-3' },
  heart: { label: 'Herz', path: 'M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 5 2 10 8 15 6-5 12-10 8-15Z' },
  book: { label: 'Buch', path: 'M3 4q5-2 9 1 4-3 9-1v15q-5-2-9 1-4-3-9-1ZM12 5v15' },
  globe: { label: 'Welt / Web', path: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2q-8 10 0 20M12 2q8 10 0 20' },
  music: { label: 'Musik', path: 'M9 18V5l12-2v13M9 5v5l12-2M9 18a3 3 0 1 1-3-3h3M21 16a3 3 0 1 1-3-3h3' },
  camera: { label: 'Kamera', path: 'M3 6h4l2-3h6l2 3h4v15H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' },
  star: { label: 'Stern', path: 'm12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z' },
  none: { label: 'Kein Icon', path: '' },
};

export const aboutIconOptions = aboutIconNames.map(value => ({ label: aboutIcons[value].label, value }));
