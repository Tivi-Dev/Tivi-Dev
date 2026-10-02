import { fields } from '@keystatic/core';
import { privacyTextField } from './privacy-schema';

const topic = (label: string) => fields.object({
  title: fields.text({ label: 'Überschrift', defaultValue: label, validation: { isRequired: true } }),
  text: privacyTextField,
}, { label });

export const aboutTopicsField = fields.object({
  profile: topic('Persönliches Profil'),
  education: topic('Ausbildung'),
  skills: topic('Skills & Interessen'),
  experience: topic('Projekte & Praxis'),
  achievements: topic('Erfolge & Zertifikate'),
  hobbies: topic('Hobbys'),
  contact: topic('Kontakt'),
}, { label: 'Themen rund um dein Profilfoto', description: 'Reihenfolge im Uhrzeigersinn: Profil → Ausbildung → Skills → Projekte → Zertifikate → Hobbys → Kontakt. Texte lassen sich mit der Werkzeugleiste formatieren. Leere Textfelder zeigen nur die Überschrift.' });
