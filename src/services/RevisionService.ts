import { getDatabase } from '../db/database';

export interface SessionRevision {
  id: number;
  cours_id: number | null;
  todo_id: number | null;
  methode: string;
  debut: string;
  fin: string;
  duree_secondes: number;
  nombre_cycles: number;
  concentration: number;
  difficulte: number;
  notes: string;
  progression: number;
  nombre_pauses: number;
  duree_pauses_secondes: number;
  /** Nom de la matière (jointure) — présent uniquement via `getSessions`. */
  matiere?: string;
}

export type SessionSaisie = Partial<SessionRevision> &
  Pick<SessionRevision, 'methode' | 'debut'>;

/** Enregistre une session d'étude terminée (ou interrompue). */
export async function saveSession(session: SessionSaisie): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO session_revision
       (cours_id, todo_id, methode, debut, fin, duree_secondes, nombre_cycles,
        concentration, difficulte, notes, progression, nombre_pauses, duree_pauses_secondes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.cours_id ?? null,
      session.todo_id ?? null,
      session.methode,
      session.debut,
      session.fin ?? new Date().toISOString(),
      session.duree_secondes ?? 0,
      session.nombre_cycles ?? 0,
      session.concentration ?? 3,
      session.difficulte ?? 3,
      session.notes ?? '',
      session.progression ?? 0,
      session.nombre_pauses ?? 0,
      session.duree_pauses_secondes ?? 0,
    ],
  );
}

/** Sessions récentes avec le nom de la matière associée. */
export async function getSessions(limit = 50): Promise<SessionRevision[]> {
  const db = await getDatabase();
  return db.getAllAsync<SessionRevision>(
    `SELECT s.*, c.matiere
     FROM session_revision s
     LEFT JOIN cours c ON c.id = s.cours_id
     ORDER BY s.debut DESC
     LIMIT ?`,
    [limit],
  );
}
