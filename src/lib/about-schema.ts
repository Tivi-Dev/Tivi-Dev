import { fields } from '@keystatic/core';
import { privacyTextField } from './privacy-schema';

const topic = (label: string) => fields.object({
  title: fields.text({ label: 'Überschrift', defaultValue: label, validation: { isRequired: true } }),
  text: privacyTextField,
}, { label });

export const aboutTopicsField = fields.object({
  profile: topic('Persönliches Profil'),
  experience: topic('Projekte & Praxis'),
  achievements: topic('Erfolge & Zertifikate'),
  education: topic('Ausbildung'),
  skills: topic('Skills & Interessen'),
  hobbies: topic('Hobbys'),
  contact: topic('Kontakt'),
}, { label: 'Themen rund um dein Profilfoto', description: 'Die Positionen entsprechen der Übersicht auf der Website. Texte lassen sich mit der Werkzeugleiste formatieren. Leere Textfelder zeigen nur die Überschrift.' });
