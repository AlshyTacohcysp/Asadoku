/** Jours de la semaine, ordonnés du lundi au dimanche (ordre d'affichage). */
export const JOURS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
] as const;

export type Jour = (typeof JOURS)[number];

/**
 * Index du jour pour une date donnée, dans l'ordre des `JOURS`
 * (0 = lundi, 6 = dimanche), contrairement à `Date.getDay()`.
 */
export function jourIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Nom du jour (français) d'une date, ex. "Jeudi". */
export function nomJour(date: Date): Jour {
  return JOURS[jourIndex(date)];
}
