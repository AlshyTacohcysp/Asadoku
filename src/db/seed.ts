import { getDatabase } from './database';

export async function seedDatabase(): Promise<void> {
  const db = await getDatabase();

  // Vérifier si des données existent déjà
  const countResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cours'
  );

  if (countResult && countResult.count > 0) {
    console.log('📦 Données déjà présentes, pas besoin de seed');
    return;
  }

  // 1. Insérer les paramètres par défaut
  await db.runAsync(
    `INSERT INTO parametres (nom, temps_preparation, temps_trajet, marge_securite)
     VALUES (?, ?, ?, ?)`,
    ['Alex', 20, 15, 5]
  );

  // 2. Insérer des cours d'exemple
  const coursData = [
    ['Lundi', '08:30', '10:30', 'Mathématiques', 'Amphi A', 'M. Dupont'],
    ['Lundi', '10:45', '12:45', 'Physique', 'Salle 101', 'Mme Martin'],
    ['Mardi', '09:00', '11:00', 'Informatique', 'Salle 204', 'M. Bernard'],
    ['Mardi', '14:00', '16:00', 'Anglais', 'Salle 305', 'Mme Smith'],
    ['Mercredi', '08:30', '10:30', 'Mathématiques', 'Amphi A', 'M. Dupont'],
    ['Jeudi', '10:00', '12:00', 'Chimie', 'Labo 1', 'M. Petit'],
    ['Vendredi', '13:00', '15:00', 'Projet Tutoré', 'Salle 102', 'M. Durand'],
  ];

  for (const cours of coursData) {
    await db.runAsync(
      `INSERT INTO cours (jour, heure_debut, heure_fin, matiere, salle, professeur)
       VALUES (?, ?, ?, ?, ?, ?)`,
      cours
    );
  }

  // 3. Insérer des todos d'exemple
  const today = new Date().toISOString().split('T')[0]; // Date du jour

  const todoData = [
    ['Réviser le chapitre 3 de Maths', 'Faire les exercices 1 à 10', today, '08:00', 5, 1],
    ['Préparer le TP de Physique', 'Lire le protocole expérimental', today, '09:00', 4, 2],
    ['Faire les flashcards d\'Anglais', 'Vocabulaire unité 5', today, '10:00', 3, 4],
    ['Avancer le projet tutoré', 'Rédiger l\'introduction', today, '11:00', 2, 7],
  ];

  for (const todo of todoData) {
    await db.runAsync(
      `INSERT INTO todo (titre, description, date, heure_pensee, priorite, cours_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      todo
    );
  }

  console.log('✅ Données de test insérées avec succès !');
  console.log('   - 7 cours créés');
  console.log('   - 4 todos créés');
}