import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

/** Retourne la connexion SQLite unique de l'application (ouverture paresseuse). */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (opening) return opening;

  opening = (async () => {
    const instance = await SQLite.openDatabaseAsync('asadoku.db');
    await instance.execAsync('PRAGMA foreign_keys = ON;');
    await instance.execAsync('PRAGMA journal_mode = WAL;');
    await instance.execAsync('PRAGMA synchronous = NORMAL;');
    db = instance;
    return instance;
  })();

  try {
    return await opening;
  } catch (err) {
    opening = null;
    throw err;
  }
}

/**
 * Exécute `task` dans une transaction SQLite (COMMIT / ROLLBACK automatique).
 * Indispensable pour les opérations multi-écritures (ex. import de données).
 */
export async function withTransaction<T>(task: () => Promise<T>): Promise<T> {
  const database = await getDatabase();
  await database.execAsync('BEGIN IMMEDIATE;');
  try {
    const result = await task();
    await database.execAsync('COMMIT;');
    return result;
  } catch (err) {
    await database.execAsync('ROLLBACK;').catch(() => {});
    throw err;
  }
}

/** Ferme la connexion (utile en test, sinon optionnel). */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    opening = null;
  }
}
