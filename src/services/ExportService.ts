import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '../db/database';

export async function exportData(): Promise<string> {
  const db = await getDatabase();
  
  // Récupérer toutes les données
  const cours = await db.getAllAsync('SELECT * FROM cours');
  const todos = await db.getAllAsync('SELECT * FROM todo');
  const trajets = await db.getAllAsync('SELECT * FROM trajet');
  const sessions = await db.getAllAsync('SELECT * FROM session_revision');
  
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    cours,
    todos,
    trajets,
    sessions,
  };
  
  const json = JSON.stringify(data, null, 2);
  const filename = `asadoku-sauvegarde-${new Date().toISOString().split('T')[0]}.json`;
  const path = `${FileSystem.documentDirectory}${filename}`;
  
  await FileSystem.writeAsStringAsync(path, json);
  
  // Partager le fichier
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'Sauvegarder Asadoku',
  });
  
  return path;
}

export async function importData(): Promise<boolean> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    
    if (result.canceled) return false;
    
    const file = result.assets[0];
    const content = await FileSystem.readAsStringAsync(file.uri);
    const data = JSON.parse(content);
    
    if (!data.version || !data.cours || !data.todos) {
      throw new Error('Format invalide');
    }
    
    const db = await getDatabase();
    
    // Supprimer les données existantes
    await db.execAsync('DELETE FROM session_revision');
    await db.execAsync('DELETE FROM trajet');
    await db.execAsync('DELETE FROM alarme');
    await db.execAsync('DELETE FROM todo');
    await db.execAsync('DELETE FROM cours');
    
    // Insérer les données importées
    for (const c of data.cours) {
      await db.runAsync(
        'INSERT INTO cours (id, jour, heure_debut, heure_fin, matiere, salle, professeur, actif) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.jour, c.heure_debut, c.heure_fin, c.matiere, c.salle, c.professeur || '', c.actif || 1]
      );
    }
    
    for (const t of data.todos) {
      await db.runAsync(
        'INSERT INTO todo (id, titre, description, date, heure_pensee, priorite, categorie, cours_id, fait) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.titre, t.description || '', t.date, t.heure_pensee || '', t.priorite, t.categorie || '', t.cours_id || null, t.fait || 0]
      );
    }
    
    for (const tr of data.trajets || []) {
      await db.runAsync(
        'INSERT INTO trajet (depart, arrivee, duree_secondes, jour_semaine, moyen_transport) VALUES (?, ?, ?, ?, ?)',
        [tr.depart, tr.arrivee, tr.duree_secondes, tr.jour_semaine, tr.moyen_transport || 'pied']
      );
    }
    
    for (const s of data.sessions || []) {
      await db.runAsync(
        'INSERT INTO session_revision (cours_id, todo_id, methode, debut, fin, duree_secondes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [s.cours_id || null, s.todo_id || null, s.methode, s.debut, s.fin, s.duree_secondes, s.notes || '']
      );
    }
    
    return true;
  } catch (error) {
    console.error('Erreur import:', error);
    throw error;
  }
}