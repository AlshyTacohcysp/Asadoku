import { getDatabase } from './database';

/**
 * Le seed n'est exécuté qu'une seule fois dans la vie de l'application :
 * il est gardé par l'existence d'une ligne dans `parametres` (jamais par le
 * nombre de cours, afin de ne pas réinjecter des données de démo après que
 * l'utilisateur a vidé son emploi du temps).
 */
export async function seedDatabase(): Promise<void> {
  const db = await getDatabase();

  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM parametres',
  );
  if (existing && existing.count > 0) {
    console.log('📦 Base déjà initialisée — seed ignoré');
    return;
  }

  console.log('🌱 Première ouverture : création des données de démarrage…');

  // 1. Paramètres par défaut
  await db.runAsync(
    `INSERT INTO parametres (nom, temps_preparation, temps_trajet, marge_securite)
     VALUES (?, ?, ?, ?)`,
    ['Alex', 20, 15, 5],
  );

  // 2. Cours d'exemple (les ids sont récupérés pour lier les tâches)
  const coursData: Array<{ jour: string; hd: string; hf: string; matiere: string; salle: string; prof: string }> = [
    { jour: 'Lundi', hd: '08:30', hf: '10:30', matiere: 'Mathématiques', salle: 'Amphi A', prof: 'M. Dupont' },
    { jour: 'Lundi', hd: '10:45', hf: '12:45', matiere: 'Physique', salle: 'Salle 101', prof: 'Mme Martin' },
    { jour: 'Mardi', hd: '09:00', hf: '11:00', matiere: 'Informatique', salle: 'Salle 204', prof: 'M. Bernard' },
    { jour: 'Mardi', hd: '14:00', hf: '16:00', matiere: 'Anglais', salle: 'Salle 305', prof: 'Mme Smith' },
    { jour: 'Mercredi', hd: '08:30', hf: '10:30', matiere: 'Mathématiques', salle: 'Amphi A', prof: 'M. Dupont' },
    { jour: 'Jeudi', hd: '10:00', hf: '12:00', matiere: 'Chimie', salle: 'Labo 1', prof: 'M. Petit' },
    { jour: 'Vendredi', hd: '13:00', hf: '15:00', matiere: 'Projet Tutoré', salle: 'Salle 102', prof: 'M. Durand' },
  ];

  const ids: number[] = [];
  for (const c of coursData) {
    const result = await db.runAsync(
      `INSERT INTO cours (jour, heure_debut, heure_fin, matiere, salle, professeur)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [c.jour, c.hd, c.hf, c.matiere, c.salle, c.prof],
    );
    ids.push(Number(result.lastInsertRowId));
  }

  // 3. Tâches d'exemple du jour (liées aux cours insérés ci-dessus)
  const aujourdhui = new Date();
  const dateISO = `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}-${String(aujourdhui.getDate()).padStart(2, '0')}`;

  const todoData = [
    { titre: 'Réviser le chapitre 3 de Maths', description: 'Faire les exercices 1 à 10', heure: '08:00', priorite: 5, coursId: ids[0] },
    { titre: 'Préparer le TP de Physique', description: "Lire le protocole expérimental", heure: '09:00', priorite: 4, coursId: ids[1] },
    { titre: "Faire les flashcards d'Anglais", description: 'Vocabulaire unité 5', heure: '10:00', priorite: 3, coursId: ids[3] },
    { titre: 'Avancer le projet tutoré', description: "Rédiger l'introduction", heure: '11:00', priorite: 2, coursId: ids[6] },
  ];

  for (const t of todoData) {
    await db.runAsync(
      `INSERT INTO todo (titre, description, date, heure_pensee, priorite, cours_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [t.titre, t.description, dateISO, t.heure, t.priorite, t.coursId ?? null],
    );
  }

  console.log(`✅ Données de démarrage : ${coursData.length} cours, ${todoData.length} tâches`);
}
