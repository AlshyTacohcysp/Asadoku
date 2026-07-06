import { getDatabase } from '../db/database';

export interface Trajet {
  id?: number;
  depart: string;
  arrivee: string;
  duree_secondes: number;
  jour_semaine: string;
  moyen_transport: string;
}

export async function saveTrajet(trajet: Omit<Trajet, 'id'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO trajet (depart, arrivee, duree_secondes, jour_semaine, moyen_transport)
     VALUES (?, ?, ?, ?, ?)`,
    [trajet.depart, trajet.arrivee, trajet.duree_secondes, trajet.jour_semaine, trajet.moyen_transport]
  );
}

export async function getTrajets(): Promise<Trajet[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Trajet>('SELECT * FROM trajet ORDER BY depart DESC LIMIT 20');
}

export async function getMoyenneTrajet(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ moyenne: number }>(
    'SELECT AVG(duree_secondes) as moyenne FROM trajet'
  );
  return result?.moyenne || 0;
}