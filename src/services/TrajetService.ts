import { getDatabase } from '../db/database';
import { nomJour } from '../utils/date';

export interface Trajet {
  id?: number;
  depart: string;
  arrivee: string;
  duree_secondes: number;
  jour_semaine: string;
  moyen_transport: string;
}

export interface StatsTrajets {
  count: number;
  moyenneSecondes: number;
}

export async function saveTrajet(trajet: Omit<Trajet, 'id'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO trajet (depart, arrivee, duree_secondes, jour_semaine, moyen_transport)
     VALUES (?, ?, ?, ?, ?)`,
    [
      trajet.depart,
      trajet.arrivee,
      Math.max(1, Math.round(trajet.duree_secondes)),
      trajet.jour_semaine || nomJour(new Date()),
      trajet.moyen_transport || 'pied',
    ],
  );
}

export async function getTrajets(limit = 20): Promise<Trajet[]> {
  const db = await getDatabase();
  return db.getAllAsync<Trajet>(
    'SELECT * FROM trajet ORDER BY id DESC LIMIT ?',
    [limit],
  );
}

export async function getStatsTrajets(): Promise<StatsTrajets> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number; moyenne: number }>(
    'SELECT COUNT(*) as count, COALESCE(AVG(duree_secondes), 0) as moyenne FROM trajet',
  );
  return { count: row?.count || 0, moyenneSecondes: Math.round(row?.moyenne || 0) };
}

/**
 * Prédiction du temps de trajet : moyenne du jour de semaine courant,
 * sinon moyenne générale, sinon valeur par défaut de 15 minutes.
 */
export async function getPredictionTrajet(): Promise<number> {
  const db = await getDatabase();
  const jourActuel = nomJour(new Date());

  const parJour = await db.getFirstAsync<{ moyenne: number }>(
    'SELECT AVG(duree_secondes) as moyenne FROM trajet WHERE jour_semaine = ?',
    [jourActuel],
  );
  if (parJour?.moyenne) return Math.round(parJour.moyenne);

  const general = await db.getFirstAsync<{ moyenne: number }>(
    'SELECT AVG(duree_secondes) as moyenne FROM trajet',
  );
  return general?.moyenne ? Math.round(general.moyenne) : 15 * 60;
}
