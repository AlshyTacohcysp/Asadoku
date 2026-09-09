import { addMonths } from 'date-fns';
import { getDatabase, withTransaction } from '../db/database';
import { addDaysISO } from '../utils/date';

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
  recurrence: string;
}

export type TodoSaisie = Omit<
  Todo,
  'id' | 'fait' | 'progression' | 'notes_personnelles'
> & { recurrence?: string };

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

function validerTodo(todo: Pick<Todo, 'titre' | 'date' | 'priorite'>): void {
  if (!todo.titre.trim()) throw new Error('Le titre est obligatoire.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todo.date)) throw new Error('Date invalide.');
  if (todo.priorite < 1 || todo.priorite > 5) throw new Error('Priorité invalide.');
}

export async function getTodosByDate(date: string): Promise<Todo[]> {
  const db = await getDatabase();
  return db.getAllAsync<Todo>(
    'SELECT * FROM todo WHERE date = ? ORDER BY fait ASC, priorite DESC, heure_pensee',
    [date],
  );
}

export async function getTodoById(id: number): Promise<Todo | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Todo>('SELECT * FROM todo WHERE id = ?', [id]);
}

export async function getAllTodos(): Promise<Todo[]> {
  const db = await getDatabase();
  return db.getAllAsync<Todo>('SELECT * FROM todo ORDER BY date, priorite DESC');
}

/** Tâches en retard (date passée) non terminées — pour l'onglet « Aujourd'hui ». */
export async function getLateTodos(aujourdhui: string): Promise<Todo[]> {
  const db = await getDatabase();
  return db.getAllAsync<Todo>(
    'SELECT * FROM todo WHERE date < ? AND fait = 0 ORDER BY date, priorite DESC',
    [aujourdhui],
  );
}

/** Crée une tâche et renvoie son id. */
export async function addTodo(todo: TodoSaisie): Promise<number> {
  validerTodo(todo);
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO todo (titre, description, date, heure_pensee, priorite, categorie, cours_id, recurrence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      todo.titre.trim(),
      todo.description?.trim() ?? '',
      todo.date,
      todo.heure_pensee ?? '',
      todo.priorite,
      todo.categorie ?? '',
      todo.cours_id ?? null,
      todo.recurrence ?? 'none',
    ],
  );
  return Number(result.lastInsertRowId);
}

export async function updateTodo(id: number, todo: Partial<Todo>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  const defini = <K extends keyof Todo>(key: K, sql: string) => {
    if (todo[key] !== undefined) {
      fields.push(sql);
      values.push(todo[key] as string | number | null);
    }
  };

  defini('titre', 'titre=?');
  defini('description', 'description=?');
  defini('date', 'date=?');
  defini('heure_pensee', 'heure_pensee=?');
  defini('priorite', 'priorite=?');
  defini('categorie', 'categorie=?');
  defini('cours_id', 'cours_id=?');
  defini('recurrence', 'recurrence=?');
  defini('progression', 'progression=?');
  defini('notes_personnelles', 'notes_personnelles=?');
  defini('fait', 'fait=?');

  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE todo SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function markTodoAsDone(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE todo SET fait = 1 WHERE id = ?', [id]);
}

export async function markTodoAsUndone(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE todo SET fait = 0 WHERE id = ?', [id]);
}

/** Date suivante selon la récurrence (depuis la date d'une tâche). */
export function prochaineDateRecurrente(date: string, recurrence: Recurrence): string | null {
  const base = new Date(`${date}T12:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  switch (recurrence) {
    case 'daily':
      return addDaysISO(date, 1);
    case 'weekly':
      return addDaysISO(date, 7);
    case 'monthly': {
      const next = addMonths(base, 1);
      return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    }
    default:
      return null;
  }
}

/**
 * Marque une tâche comme faite et, si elle est récurrente, crée la
 * prochaine occurrence. L'ensemble est atomique (transaction).
 */
export async function completeAndRepeat(todo: Todo): Promise<void> {
  await withTransaction(async () => {
    const db = await getDatabase();
    await db.runAsync('UPDATE todo SET fait = 1 WHERE id = ?', [todo.id]);

    const prochaine = prochaineDateRecurrente(todo.date, (todo.recurrence || 'none') as Recurrence);
    if (prochaine) {
      await db.runAsync(
        `INSERT INTO todo (titre, description, date, heure_pensee, priorite, categorie, cours_id, recurrence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          todo.titre, todo.description || '', prochaine, todo.heure_pensee || '',
          todo.priorite, todo.categorie || '', todo.cours_id, todo.recurrence || 'none',
        ],
      );
    }
  });
}

export async function deleteTodo(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM todo WHERE id = ?', [id]);
}
