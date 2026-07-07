import { getDatabase } from '../db/database';

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

let cacheAllCours: Cours[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000;

export async function getCoursByJour(jour: string): Promise<Cours[]> {
  const allCours = await getAllCours();
  return allCours.filter(c => c.jour === jour);
}

export async function getAllCours(): Promise<Cours[]> {
  const now = Date.now();
  if (cacheAllCours && (now - cacheTimestamp) < CACHE_DURATION) {
    return cacheAllCours;
  }
  const db = await getDatabase();
  const result = await db.getAllAsync<Cours>(
    'SELECT * FROM cours WHERE actif = 1 ORDER BY jour, heure_debut'
  );
  cacheAllCours = result;
  cacheTimestamp = now;
  return result;
}

export async function addCours(cours: Omit<Cours, 'id' | 'actif'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO cours (jour, heure_debut, heure_fin, matiere, salle, professeur)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [cours.jour, cours.heure_debut, cours.heure_fin, cours.matiere, cours.salle, cours.professeur]
  );
  cacheAllCours = null;
}

export async function updateCours(id: number, cours: Omit<Cours, 'id' | 'actif'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE cours SET jour=?, heure_debut=?, heure_fin=?, matiere=?, salle=?, professeur=?
     WHERE id=?`,
    [cours.jour, cours.heure_debut, cours.heure_fin, cours.matiere, cours.salle, cours.professeur, id]
  );
  cacheAllCours = null;
}

export async function deleteCours(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM cours WHERE id = ?', [id]);
  cacheAllCours = null;
}