import { fields } from '@keystatic/core';
import { aboutIconOptions, type AboutIconName } from './about-icons';
import { privacyTextField } from './privacy-schema';

const topic = (label: string, defaultIcon: AboutIconName, defaultColor = '#32664b') => fields.object({
  title: fields.text({ label: 'Überschrift', defaultValue: label, validation: { isRequired: true } }),
  icon: fields.select({ label: 'Icon', options: aboutIconOptions, defaultValue: defaultIcon }),
  lineColor: fields.text({
    label: 'Linienfarbe',
    description: 'Farbe der Linien, der Bereichsüberschrift und des Icons. Hex-Farbcode, zum Beispiel #32664b.',
    defaultValue: defaultColor,
    validation: { isRequired: true, pattern: { regex: /^#[0-9a-fA-F]{6}$/, message: 'Bitte einen Hex-Farbcode mit sechs Zeichen eingeben, zum Beispiel #32664b.' } },
  }),
  text: privacyTextField,
}, { label });

export const aboutTopicsField = fields.object({
  profile: topic('Persönliches Profil', 'person', '#a44c2c'),
  education: topic('Ausbildung', 'education'),
  hobbies: topic('Hobbys', 'gamepad', '#a44c2c'),
  skills: topic('Skills & Interessen', 'code'),
  achievements: topic('Erfolge & Zertifikate', 'trophy', '#88723d'),
  experience: topic('Projekte & Praxis', 'briefcase'),
}, { label: 'Themen rund um dein Profilfoto', description: 'Links: Profil, Hobbys, Zertifikate. Rechts: Ausbildung, Skills, Projekte. Texte lassen sich mit der Werkzeugleiste formatieren. Leere Textfelder zeigen nur die Überschrift.' });
