import { getDatabase } from '../db/database';
import { JOURS } from '../constants/jour';
import { minutesDepuisMinuit } from '../utils/date';

export interface Cours {
  id: number;
  jour: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
  professeur: string;
  actif: number;
}

export type CoursSaisie = Omit<Cours, 'id' | 'actif'>;

const SELECT = 'SELECT * FROM cours';

function validerSaisie(cours: CoursSaisie): void {
  if (!cours.matiere.trim()) throw new Error('Le nom de la matière est obligatoire.');
  if (!cours.salle.trim()) throw new Error('La salle est obligatoire.');
  if (!JOURS.includes(cours.jour as (typeof JOURS)[number])) {
    throw new Error('Jour invalide.');
  }
  if (minutesDepuisMinuit(cours.heure_fin) <= minutesDepuisMinuit(cours.heure_debut)) {
    throw new Error("L'heure de fin doit être après l'heure de début.");
  }
}

/**
 * Vérifie qu'aucun cours actif n'empiète sur le créneau proposé
 * (même jour, mêmes horaires ou chevauchement partiel).
 */
export async function verifierConflitCours(
  saisie: CoursSaisie,
  idExclu?: number,
): Promise<boolean> {
  const debut = minutesDepuisMinuit(saisie.heure_debut);
  const fin = minutesDepuisMinuit(saisie.heure_fin);
  const db = await getDatabase();
  const rows = await db.getAllAsync<Cours>(
    'SELECT * FROM cours WHERE jour = ? AND actif = 1',
    [saisie.jour],
  );
  return rows.some((c) => {
    if (idExclu !== undefined && c.id === idExclu) return false;
    const cDebut = minutesDepuisMinuit(c.heure_debut);
    const cFin = minutesDepuisMinuit(c.heure_fin);
    return debut < cFin && fin > cDebut;
  });
}

export async function getCoursByJour(jour: string): Promise<Cours[]> {
  const all = await getAllCours();
  return all.filter((c) => c.jour === jour);
}

export async function getAllCours(): Promise<Cours[]> {
  const db = await getDatabase();
  return db.getAllAsync<Cours>(`${SELECT} WHERE actif = 1 ORDER BY jour, heure_debut`);
}

export async function getCoursById(id: number): Promise<Cours | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Cours>(`${SELECT} WHERE id = ?`, [id]);
}

export async function addCours(saisie: CoursSaisie): Promise<number> {
  validerSaisie(saisie);
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO cours (jour, heure_debut, heure_fin, matiere, salle, professeur)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [saisie.jour, saisie.heure_debut, saisie.heure_fin, saisie.matiere.trim(), saisie.salle.trim(), saisie.professeur.trim()],
  );
  return Number(result.lastInsertRowId);
}

export async function updateCours(id: number, saisie: CoursSaisie): Promise<void> {
  validerSaisie(saisie);
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE cours SET jour = ?, heure_debut = ?, heure_fin = ?, matiere = ?, salle = ?, professeur = ?
     WHERE id = ?`,
    [saisie.jour, saisie.heure_debut, saisie.heure_fin, saisie.matiere.trim(), saisie.salle.trim(), saisie.professeur.trim(), id],
  );
}

export async function deleteCours(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM cours WHERE id = ?', [id]);
}
