export const JOURS = [
  'Lundi',
  'Mardi', 
  'Mercredi',
  'Jeudi',
  'Vendredi',
] as const;

export type Jour = typeof JOURS[number];