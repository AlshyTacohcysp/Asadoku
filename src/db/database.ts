import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db; // Retourne la connexion existante
  }
  
  db = await SQLite.openDatabaseAsync('asadoku.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;'); // Mode rapide
  await db.execAsync('PRAGMA synchronous = NORMAL;'); // Plus rapide
  
  return db;
}

// Pour fermer la BDD (optionnel)
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}