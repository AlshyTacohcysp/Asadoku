import { getDatabase } from '../db/database';

export interface Todo {
  id: number;
  titre: string;
  description: string;
  date: string;
  heure_pensee: string;
  priorite: number;
  categorie: string;
  cours_id: number | null;
  progression: number;
  notes_personnelles: string;
  fait: number;
}

let cacheTodos: Record<string, Todo[]> = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 5000;

export async function getTodosByDate(date: string): Promise<Todo[]> {
  const now = Date.now();
  if (cacheTodos[date] && (now - cacheTimestamp) < CACHE_DURATION) {
    return cacheTodos[date];
  }
  const db = await getDatabase();
  const result = await db.getAllAsync<Todo>(
    'SELECT * FROM todo WHERE date = ? ORDER BY priorite DESC, heure_pensee',
    [date]
  );
  cacheTodos[date] = result;
  cacheTimestamp = now;
  return result;
}

export async function getAllTodos(): Promise<Todo[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Todo>(
    'SELECT * FROM todo ORDER BY fait ASC, priorite DESC, date DESC'
  );
}

export async function addTodo(todo: Omit<Todo, 'id' | 'fait' | 'progression' | 'notes_personnelles'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO todo (titre, description, date, heure_pensee, priorite, categorie, cours_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [todo.titre, todo.description, todo.date, todo.heure_pensee, todo.priorite, todo.categorie, todo.cours_id]
  );
  cacheTodos = {};
}

export async function updateTodo(id: number, todo: Partial<Todo>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  if (todo.titre !== undefined) { fields.push('titre=?'); values.push(todo.titre); }
  if (todo.description !== undefined) { fields.push('description=?'); values.push(todo.description); }
  if (todo.heure_pensee !== undefined) { fields.push('heure_pensee=?'); values.push(todo.heure_pensee); }
  if (todo.priorite !== undefined) { fields.push('priorite=?'); values.push(todo.priorite); }
  if (todo.cours_id !== undefined) { fields.push('cours_id=?'); values.push(todo.cours_id); }
  if (todo.notes_personnelles !== undefined) { fields.push('notes_personnelles=?'); values.push(todo.notes_personnelles); }
  if (todo.fait !== undefined) { fields.push('fait=?'); values.push(todo.fait); }
  if (fields.length > 0) {
    values.push(id);
    await db.runAsync(`UPDATE todo SET ${fields.join(',')} WHERE id=?`, values);
    cacheTodos = {};
  }
}

export async function markTodoAsDone(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE todo SET fait = 1 WHERE id = ?', [id]);
  cacheTodos = {};
}

export async function deleteTodo(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM todo WHERE id = ?', [id]);
  cacheTodos = {};
}