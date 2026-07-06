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
  fait: number;
}

let cacheTodos: Record<string, Todo[]> = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 5000;

// Récupérer les todos du jour (avec cache)
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

// Marquer un todo comme fait
export async function markTodoAsDone(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE todo SET fait = 1 WHERE id = ?', [id]);
  cacheTodos = {}; // Invalider tout le cache
}

// Ajouter un todo
export async function addTodo(todo: Omit<Todo, 'id' | 'fait'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO todo (titre, description, date, heure_pensee, priorite, categorie, cours_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [todo.titre, todo.description, todo.date, todo.heure_pensee, todo.priorite, todo.categorie, todo.cours_id]
  );
  cacheTodos = {};
}