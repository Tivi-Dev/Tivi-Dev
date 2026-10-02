import { fields } from '@keystatic/core';
import { privacyTextField } from './privacy-schema';

const topic = (label: string, defaultColor = '#32664b') => fields.object({
  title: fields.text({ label: 'Überschrift', defaultValue: label, validation: { isRequired: true } }),
  lineColor: fields.text({
    label: 'Linienfarbe',
    description: 'Farbe der Verbindungslinie und der senkrechten Linie am Bereich. Hex-Farbcode, zum Beispiel #32664b.',
    defaultValue: defaultColor,
    validation: { isRequired: true, pattern: { regex: /^#[0-9a-fA-F]{6}$/, message: 'Bitte einen Hex-Farbcode mit sechs Zeichen eingeben, zum Beispiel #32664b.' } },
  }),
  text: privacyTextField,
}, { label });

export const aboutTopicsField = fields.object({
  profile: topic('Persönliches Profil', '#a44c2c'),
  education: topic('Ausbildung'),
  achievements: topic('Erfolge & Zertifikate', '#88723d'),
  skills: topic('Skills & Interessen'),
  hobbies: topic('Hobbys', '#a44c2c'),
  experience: topic('Projekte & Praxis'),
}, { label: 'Themen rund um dein Profilfoto', description: 'Links: Profil, Zertifikate, Hobbys. Rechts: Ausbildung, Skills, Projekte. Texte lassen sich mit der Werkzeugleiste formatieren. Leere Textfelder zeigen nur die Überschrift.' });
