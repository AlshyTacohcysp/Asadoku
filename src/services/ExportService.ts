import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { getDatabase, withTransaction } from '../db/database';
import { getParametres, PARAMETRES_DEFAUTS } from './ParametresService';
import { todayISO } from '../utils/date';

/** Version du format de sauvegarde (incrémenter à chaque évolution). */
export const FORMAT_VERSION = 3;

export interface Sauvegarde {
  version: number;
  exportDate: string;
  parametres?: unknown;
  cours: unknown[];
  todos: unknown[];
  trajets: unknown[];
  sessions: unknown[];
}

function validerSauvegarde(data: unknown): Sauvegarde {
  if (!data || typeof data !== 'object') throw new Error('Fichier de sauvegarde invalide.');
  const raw = data as Partial<Sauvegarde>;
  const version = Number(raw.version);
  if (!version || version < 2) {
    throw new Error('Version de sauvegarde non prise en charge.');
  }
  if (!Array.isArray(raw.cours) || !Array.isArray(raw.todos)) {
    throw new Error('Contenu de sauvegarde incomplet.');
  }
  return {
    version,
    exportDate: raw.exportDate || new Date().toISOString(),
    parametres: raw.parametres,
    cours: raw.cours,
    todos: raw.todos,
    trajets: Array.isArray(raw.trajets) ? raw.trajets : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
  };
}

/** Exporte toutes les données utilisateur vers un fichier partageable. */
export async function exportData(): Promise<{ path: string; filename: string }> {
  const db = await getDatabase();

  const [cours, todos, trajets, sessions, parametres] = await Promise.all([
    db.getAllAsync('SELECT * FROM cours ORDER BY id'),
    db.getAllAsync('SELECT * FROM todo ORDER BY id'),
    db.getAllAsync('SELECT * FROM trajet ORDER BY id'),
    db.getAllAsync('SELECT * FROM session_revision ORDER BY id'),
    getParametres(),
  ]);

  const data: Sauvegarde = {
    version: FORMAT_VERSION,
    exportDate: new Date().toISOString(),
    parametres: { ...parametres },
    cours,
    todos,
    trajets,
    sessions,
  };

  const filename = `asadoku-sauvegarde-${todayISO()}.json`;
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2));

  if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Sauvegarder Asadoku',
      UTI: 'public.json',
    });
  }

  return { path, filename };
}

/**
 * Remplace toutes les données par celles d'un fichier de sauvegarde.
 * L'opération est atomique : en cas d'erreur, les données actuelles sont
 * conservées (transaction). Les notifications sont re-synchronisées par
 * l'appelant après l'import.
 */
export async function importData(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: Platform.OS === 'ios' ? 'public.json' : 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return false;

  const file = result.assets[0];
  const content = await FileSystem.readAsStringAsync(file.uri);
  const data = validerSauvegarde(JSON.parse(content));

  await withTransaction(async () => {
    const db = await getDatabase();

    // On efface dans l'ordre inverse des dépendances (FK).
    await db.execAsync('DELETE FROM session_revision;');
    await db.execAsync('DELETE FROM trajet;');
    await db.execAsync('DELETE FROM alarme;');
    await db.execAsync('DELETE FROM todo;');
    await db.execAsync('DELETE FROM cours;');

    for (const c of data.cours as Array<Record<string, unknown>>) {
      await db.runAsync(
        `INSERT INTO cours (id, jour, heure_debut, heure_fin, matiere, salle, professeur, actif)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(c.id), String(c.jour), String(c.heure_debut), String(c.heure_fin),
          String(c.matiere), String(c.salle || ''), String(c.professeur || ''),
          c.actif === 0 ? 0 : 1,
        ],
      );
    }

    for (const t of data.todos as Array<Record<string, unknown>>) {
      await db.runAsync(
        `INSERT INTO todo (id, titre, description, date, heure_pensee, priorite, categorie,
                           cours_id, recurrence, progression, notes_personnelles, fait)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(t.id), String(t.titre), String(t.description || ''), String(t.date),
          String(t.heure_pensee || ''), Number(t.priorite ?? 3), String(t.categorie || ''),
          t.cours_id == null ? null : Number(t.cours_id), String(t.recurrence || 'none'),
          Number(t.progression || 0), String(t.notes_personnelles || ''),
          t.fait ? 1 : 0,
        ],
      );
    }

    for (const tr of data.trajets as Array<Record<string, unknown>>) {
      await db.runAsync(
        `INSERT INTO trajet (depart, arrivee, duree_secondes, jour_semaine, moyen_transport)
         VALUES (?, ?, ?, ?, ?)`,
        [
          String(tr.depart), String(tr.arrivee), Number(tr.duree_secondes || 0),
          String(tr.jour_semaine || ''), String(tr.moyen_transport || 'pied'),
        ],
      );
    }

    for (const s of data.sessions as Array<Record<string, unknown>>) {
      await db.runAsync(
        `INSERT INTO session_revision
           (cours_id, todo_id, methode, debut, fin, duree_secondes, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          s.cours_id == null ? null : Number(s.cours_id),
          s.todo_id == null ? null : Number(s.todo_id),
          String(s.methode), String(s.debut), String(s.fin || ''),
          Number(s.duree_secondes || 0), String(s.notes || ''),
        ],
      );
    }

    // Paramètres (facultatifs dans les anciennes sauvegardes).
    await db.runAsync('DELETE FROM parametres;');
    if (data.parametres && typeof data.parametres === 'object') {
      const p = data.parametres as Record<string, unknown>;
      await db.runAsync(
        `INSERT INTO parametres
           (nom, email, telephone, temps_preparation, temps_trajet, marge_securite,
            adresse_domicile, adresse_etablissement, methode_defaut, sonnerie, sonnerie_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(p.nom || PARAMETRES_DEFAUTS.nom), String(p.email || ''), String(p.telephone || ''),
          Number(p.temps_preparation ?? PARAMETRES_DEFAUTS.temps_preparation),
          Number(p.temps_trajet ?? PARAMETRES_DEFAUTS.temps_trajet),
          Number(p.marge_securite ?? PARAMETRES_DEFAUTS.marge_securite),
          String(p.adresse_domicile || ''), String(p.adresse_etablissement || ''),
          String(p.methode_defaut || PARAMETRES_DEFAUTS.methode_defaut),
          String(p.sonnerie || PARAMETRES_DEFAUTS.sonnerie),
          String(p.sonnerie_path || ''),
        ],
      );
    } else {
      // Sauvegardes antérieures à la v3 : on recrée la ligne par défaut.
      await db.runAsync(
        `INSERT INTO parametres
           (nom, temps_preparation, temps_trajet, marge_securite, methode_defaut, sonnerie, sonnerie_path)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          PARAMETRES_DEFAUTS.nom, PARAMETRES_DEFAUTS.temps_preparation,
          PARAMETRES_DEFAUTS.temps_trajet, PARAMETRES_DEFAUTS.marge_securite,
          PARAMETRES_DEFAUTS.methode_defaut, PARAMETRES_DEFAUTS.sonnerie, '',
        ],
      );
    }
  });

  return true;
}
