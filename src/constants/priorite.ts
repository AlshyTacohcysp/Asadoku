/**
 * Échelle de priorité des tâches : dégradé sémantique lisible
 * quel que soit le thème (le texte du badge est choisi pour le contraste).
 */
export interface PrioriteStyle {
  bg: string;
  fg: string;
  label: string;
}

const ECHELLE: Record<number, PrioriteStyle> = {
  5: { bg: '#E5484D', fg: '#FFFFFF', label: 'Urgent' },
  4: { bg: '#F76B15', fg: '#FFFFFF', label: 'Haute' },
  3: { bg: '#FFC53D', fg: '#4A3300', label: 'Moyenne' },
  2: { bg: '#30A46C', fg: '#FFFFFF', label: 'Basse' },
  1: { bg: '#9BA1A6', fg: '#FFFFFF', label: 'Optionnel' },
};

export function prioriteStyle(priorite: number): PrioriteStyle {
  return ECHELLE[priorite] ?? ECHELLE[3];
}

export const PRIORITE_MAX = 5;
export const PRIORITE_MIN = 1;
