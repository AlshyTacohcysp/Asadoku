import { getDatabase } from '../db/database';

export interface SessionRevision {
  id?: number;
  cours_id?: number | null;
  todo_id?: number | null;
  methode: string;
  debut: string;
  fin: string;
  duree_secondes: number;
  notes: string;
}

export async function saveSession(session: Omit<SessionRevision, 'id'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO session_revision (cours_id, todo_id, methode, debut, fin, duree_secondes, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [session.cours_id || null, session.todo_id || null, session.methode, session.debut, session.fin, session.duree_secondes, session.notes]
  );
}

export async function getSessions(): Promise<SessionRevision[]> {
  const db = await getDatabase();
  return await db.getAllAsync<SessionRevision>(
    'SELECT * FROM session_revision ORDER BY debut DESC LIMIT 50'
  );
}