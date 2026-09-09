import { getDatabase } from '../db/database';

export interface Parametres {
  id: number;
  nom: string;
  email: string;
  telephone: string;
  /** Minutes de préparation avant un cours (alarme). */
  temps_preparation: number;
  /** Minutes de trajet estimé (alarme). */
  temps_trajet: number;
  /** Marge de sécurité en minutes (alarme). */
  marge_securite: number;
  adresse_domicile: string;
  adresse_etablissement: string;
  methode_defaut: string;
  /** Son de notification : 'default' | 'alarm' | 'notification' | 'ringtone' | 'custom'. */
  sonnerie: string;
  /** Chemin du fichier son lorsqu'un son personnalisé est choisi. */
  sonnerie_path: string;
}

export const PARAMETRES_DEFAUTS: Omit<Parametres, 'id'> = {
  nom: 'Étudiant',
  email: '',
  telephone: '',
  temps_preparation: 20,
  temps_trajet: 15,
  marge_securite: 5,
  adresse_domicile: '',
  adresse_etablissement: '',
  methode_defaut: 'Pomodoro',
  sonnerie: 'default',
  sonnerie_path: '',
};

/** Total minutes avant le cours pour déclencher l'alarme (prépa + trajet + marge). */
export function totalAvanceMinutes(p: Pick<Parametres, 'temps_preparation' | 'temps_trajet' | 'marge_securite'>): number {
  return p.temps_preparation + p.temps_trajet + p.marge_securite;
}

/**
 * Retourne les paramètres enregistrés, ou les valeurs par défaut si la
 * table est vide (base pas encore initialisée).
 */
export async function getParametres(): Promise<Parametres> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Parametres>('SELECT * FROM parametres ORDER BY id LIMIT 1');
  if (!row) return { id: 0, ...PARAMETRES_DEFAUTS };
  return { ...PARAMETRES_DEFAUTS, ...row };
}

/** Crée ou met à jour la ligne unique de paramètres. */
export async function saveParametres(
  partial: Partial<Omit<Parametres, 'id'>>,
): Promise<Parametres> {
  const db = await getDatabase();
  const current = await getParametres();

  const next: Parametres = { ...current, ...partial };

  if (current.id === 0) {
    await db.runAsync(
      `INSERT INTO parametres
        (nom, email, telephone, temps_preparation, temps_trajet, marge_securite,
         adresse_domicile, adresse_etablissement, methode_defaut, sonnerie, sonnerie_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        next.nom, next.email, next.telephone, next.temps_preparation, next.temps_trajet,
        next.marge_securite, next.adresse_domicile, next.adresse_etablissement,
        next.methode_defaut, next.sonnerie, next.sonnerie_path,
      ],
    );
  } else {
    await db.runAsync(
      `UPDATE parametres SET
         nom = ?, email = ?, telephone = ?, temps_preparation = ?, temps_trajet = ?,
         marge_securite = ?, adresse_domicile = ?, adresse_etablissement = ?,
         methode_defaut = ?, sonnerie = ?, sonnerie_path = ?
       WHERE id = ?`,
      [
        next.nom, next.email, next.telephone, next.temps_preparation, next.temps_trajet,
        next.marge_securite, next.adresse_domicile, next.adresse_etablissement,
        next.methode_defaut, next.sonnerie, next.sonnerie_path, next.id,
      ],
    );
  }
  return getParametres();
}
