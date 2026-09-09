export interface Categorie {
  id: string;
  nom: string;
  emoji: string;
}

export const CATEGORIES: Categorie[] = [
  { id: 'divers', nom: 'Divers', emoji: '📝' },
  { id: 'cours', nom: 'Cours', emoji: '📚' },
  { id: 'maison', nom: 'Maison', emoji: '🏠' },
  { id: 'sante', nom: 'Santé', emoji: '💪' },
  { id: 'objectif', nom: 'Objectif', emoji: '🎯' },
  { id: 'projet', nom: 'Projet', emoji: '💼' },
];

export function emojiCategorie(id: string): string {
  const found = CATEGORIES.find((c) => c.id === id);
  return found ? found.emoji : '📝';
}

export function nomCategorie(id: string): string {
  const found = CATEGORIES.find((c) => c.id === id);
  return found ? found.nom : 'Divers';
}
