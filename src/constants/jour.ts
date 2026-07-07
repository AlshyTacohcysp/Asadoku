export const JOURS = [
  'Lundi',
  'Mardi', 
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
] as const;

export type Jour = typeof JOURS[number];