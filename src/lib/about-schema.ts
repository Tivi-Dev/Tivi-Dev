import { fields } from '@keystatic/core';
import { privacyTextField } from './privacy-schema';

const topic = (label: string) => fields.object({
  title: fields.text({ label: 'Überschrift', defaultValue: label, validation: { isRequired: true } }),
  text: privacyTextField,
}, { label });

export const aboutTopicsField = fields.object({
  profile: topic('Persönliches Profil'),
  education: topic('Ausbildung'),
  achievements: topic('Erfolge & Zertifikate'),
  skills: topic('Skills & Interessen'),
  hobbies: topic('Hobbys'),
  experience: topic('Projekte & Praxis'),
}, { label: 'Themen rund um dein Profilfoto', description: 'Links: Profil, Zertifikate, Hobbys. Rechts: Ausbildung, Skills, Projekte. Texte lassen sich mit der Werkzeugleiste formatieren. Leere Textfelder zeigen nur die Überschrift.' });
