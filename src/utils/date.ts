import { addDays, format, isAfter, parseISO, set } from 'date-fns';
import { fr } from 'date-fns/locale';
import { JOURS, Jour, jourIndex, nomJour } from '../constants/jour';

/**
 * Helpers de dates fiables et locales.
 *
 * Les dates "calendrier" sont stockées en `YYYY-MM-DD` (local) et les
 * heures en `HH:mm`. On évite `toISOString().split('T')` qui décale le
 * jour selon le fuseau horaire.
 */

/** Date du jour au format `YYYY-MM-DD` (heure locale). */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Date locale au format `YYYY-MM-DD`. */
export function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** `YYYY-MM-DD` -> Date locale (minuit). */
export function fromISO(dateISO: string): Date {
  // parseISO interprète une date sans fuseau en heure locale.
  return parseISO(dateISO);
}

/** Ajoute des jours à une date ISO et renvoie la date ISO locale. */
export function addDaysISO(dateISO: string, days: number): string {
  return toISO(addDays(fromISO(dateISO), days));
}

/** Formate une Date en français : "jeudi 9 septembre 2026". */
export function formatLongue(date: Date): string {
  return format(date, 'EEEE d MMMM yyyy', { locale: fr });
}

/** Formate une Date en français court : "jeu. 9 sept.". */
export function formatCourte(date: Date): string {
  return format(date, 'EEE d MMM', { locale: fr });
}

/** `HH:mm` -> { heures, minutes }. */
export function parseHeure(heure: string): { heures: number; minutes: number } {
  const [h = '0', m = '0'] = heure.split(':');
  return { heures: Number(h) || 0, minutes: Number(m) || 0 };
}

/**
 * Prochaine occurrence d'un créneau hebdomadaire (ex. "Mercredi 10:30").
 * Renvoie null si le créneau est déjà passé cette semaine ET qu'il n'y a
 * pas de prochaine semaine dans l'horizon (jamais le cas ici : +7 jours).
 */
export function prochaineOccurrence(
  jour: Jour | string,
  heure: string,
  from = new Date(),
): Date {
  const cible = JOURS.indexOf(jour as Jour);
  const delta = (cible - jourIndex(from) + 7) % 7;
  const { heures, minutes } = parseHeure(heure);

  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const tentative = set(addDays(base, delta), { hours: heures, minutes, seconds: 0, milliseconds: 0 });

  // Créneau déjà passé aujourd'hui -> semaine suivante.
  return isAfter(tentative, from) ? tentative : addDays(tentative, 7);
}

/** `HH:mm` d'une Date locale. */
export function formatHeure(date: Date): string {
  return format(date, 'HH:mm');
}

/** Nombre de minutes entre `now` et `date` (positif si futur), arrondi à l'entier. */
export function minutesAvant(date: Date, now = new Date()): number {
  return Math.max(0, Math.round((date.getTime() - now.getTime()) / 60000));
}

/** Nombre de minutes d'un décalage {heures, minutes} simple. */
export function minutesDepuisMinuit(heure: string): number {
  const { heures, minutes } = parseHeure(heure);
  return heures * 60 + minutes;
}

export { nomJour };

export type { Jour };
