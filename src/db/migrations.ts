import { getDatabase } from './database';

export async function createTables(): Promise<void> {
  const db = await getDatabase();

  // Table PARAMETRES (configuration de l'étudiant)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS parametres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT DEFAULT 'Étudiant',
      email TEXT DEFAULT '',
      telephone TEXT DEFAULT '',
      temps_preparation INTEGER DEFAULT 20,
      temps_trajet INTEGER DEFAULT 15,
      marge_securite INTEGER DEFAULT 5,
      adresse_domicile TEXT DEFAULT '',
      adresse_etablissement TEXT DEFAULT '',
      methode_defaut TEXT DEFAULT 'Pomodoro',
      sonnerie TEXT DEFAULT 'default'
    );
  `);

  // Table COURS (emploi du temps)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jour TEXT NOT NULL,
      heure_debut TEXT NOT NULL,
      heure_fin TEXT NOT NULL,
      matiere TEXT NOT NULL,
      salle TEXT NOT NULL,
      professeur TEXT DEFAULT '',
      actif INTEGER DEFAULT 1
    );
  `);

  // Table TODO (tâches)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS todo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titre TEXT NOT NULL,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      heure_pensee TEXT DEFAULT '',
      priorite INTEGER DEFAULT 3 CHECK(priorite >= 1 AND priorite <= 5),
      categorie TEXT DEFAULT '',
      cours_id INTEGER,
      methode_revision TEXT DEFAULT '',
      progression INTEGER DEFAULT 0,
      notes_personnelles TEXT DEFAULT '',
      fait INTEGER DEFAULT 0,
      FOREIGN KEY (cours_id) REFERENCES cours(id) ON DELETE SET NULL
    );
  `);

  // Table ALARME
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS alarme (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cours_id INTEGER NOT NULL,
      heure_alarme TEXT NOT NULL,
      date_alarme TEXT NOT NULL,
      declenchee INTEGER DEFAULT 0,
      message TEXT DEFAULT '',
      snooze_count INTEGER DEFAULT 0,
      triggered_at TEXT DEFAULT '',
      FOREIGN KEY (cours_id) REFERENCES cours(id) ON DELETE CASCADE
    );
  `);

  // Table TRAJET
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS trajet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      depart TEXT NOT NULL,
      arrivee TEXT NOT NULL,
      duree_secondes INTEGER NOT NULL,
      jour_semaine TEXT DEFAULT '',
      moyen_transport TEXT DEFAULT 'pied',
      condition_meteo TEXT DEFAULT ''
    );
  `);

  // Table SESSION_REVISION
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS session_revision (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cours_id INTEGER,
      todo_id INTEGER,
      methode TEXT NOT NULL,
      debut TEXT NOT NULL,
      fin TEXT DEFAULT '',
      duree_secondes INTEGER DEFAULT 0,
      nombre_cycles INTEGER DEFAULT 0,
      concentration INTEGER DEFAULT 3,
      difficulte INTEGER DEFAULT 3,
      notes TEXT DEFAULT '',
      progression REAL DEFAULT 0.0,
      nombre_pauses INTEGER DEFAULT 0,
      duree_pauses_secondes INTEGER DEFAULT 0,
      FOREIGN KEY (cours_id) REFERENCES cours(id) ON DELETE SET NULL,
      FOREIGN KEY (todo_id) REFERENCES todo(id) ON DELETE SET NULL
    );
  `);

  console.log('✅ Tables créées avec succès !');
}