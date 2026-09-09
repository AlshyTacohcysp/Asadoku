import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { parseHeure, prochaineOccurrence } from '../utils/date';
import { getAllCours, type Cours } from './CoursService';
import { getAllTodos } from './TodoService';
import { getParametres, totalAvanceMinutes } from './ParametresService';

/**
 * Planificateur unique de toutes les notifications de l'application.
 *
 * Philosophie : la base de données est la source de vérité. À chaque
 * changement (cours ajouté/modifié/supprimé, tâche cochée, paramètres
 * sauvegardés, import…), on appelle `syncNotifications()` qui recalcule
 * intégralement l'échéancier (alarmes de cours + rappels de tâches).
 */

export const SNOOZE_MAX = 3;

// iOS limite à 64 le nombre de notifications en attente.
const BUDGET_TOTAL = 60;

export interface SyncResult {
  permission: boolean;
  cours: number;
  rappels: number;
  ignores: number;
}

// ---------------------------------------------------------------------------
// Configuration du canal Android + handler global
// ---------------------------------------------------------------------------

/** Configure le handler (premier plan) et les canaux Android. */
export async function setupNotifications(): Promise<void> {
  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldVibrate: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });

  if (Platform.OS === 'android') {
    // Canal principal (alarmes de cours) : son + vibration, priorité haute.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Alarmes et rappels',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 200, 500],
      enableVibrate: true,
      sound: 'default',
    }).catch(() => {});
  }
}

/** Demande l'autorisation de notification et renvoie l'état accordé. */
export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** État courant de l'autorisation. */
export async function hasNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  return current.status === 'granted';
}

// ---------------------------------------------------------------------------
// Calcul des échéances
// ---------------------------------------------------------------------------

interface AlarmeCours {
  cours: Cours;
  /** Départ (heure de l'alarme) pour la prochaine occurrence. */
  depart: Date;
  /** Début du cours correspondant. */
  debutCours: Date;
}

/**
 * Calcule l'alarme de la prochaine occurrence d'un cours : le jour de la
 * semaine du cours est respecté (les jours passés cette semaine renvoient
 * à la semaine suivante), et l'heure tient compte des délais utilisateur.
 */
export async function prochaineAlarmeCours(cours: Cours): Promise<AlarmeCours | null> {
  const params = await getParametres();
  const debut = prochaineOccurrence(cours.jour, cours.heure_debut);
  const avance = totalAvanceMinutes(params);
  const depart = new Date(debut.getTime() - avance * 60_000);

  // L'alarme serait déjà dans le passé (cours trop proche) : inutile.
  if (depart.getTime() <= Date.now()) return null;
  return { cours, depart, debutCours: debut };
}

// ---------------------------------------------------------------------------
// Synchronisation complète
// ---------------------------------------------------------------------------

/**
 * Recalcule et replanifie l'intégralité des notifications.
 * Appeler après chaque mutation des données (cours, tâches, paramètres, import).
 */
export async function syncNotifications(): Promise<SyncResult> {
  const result: SyncResult = { permission: false, cours: 0, rappels: 0, ignores: 0 };

  try {
    const hasPerm = await hasNotificationPermission();
    if (!hasPerm) return result;
    result.permission = true;

    // Annule tout (y compris snoozes obsolètes), puis reconstruit depuis la BDD.
    await Notifications.cancelAllScheduledNotificationsAsync();

    const params = await getParametres();
    const coursList = await getAllCours();
    const todos = await getAllTodos();

    // 1. Alarmes de cours (prioritaires dans le budget iOS).
    for (const cours of coursList) {
      if (result.cours >= BUDGET_TOTAL) { result.ignores += 1; continue; }
      const planning = await prochaineAlarmeCours(cours);
      if (!planning) continue;

      const identifiant = await scheduleNotification(
        {
          title: `🚨 Départ pour ${cours.matiere}`,
          body: `Cours à ${cours.heure_debut} — ${cours.salle}${cours.professeur ? ` · ${cours.professeur}` : ''}. Alarme ${params.temps_preparation + params.temps_trajet + params.marge_securite} min avant.`,
          soundName: soundPour(params),
          data: {
            kind: 'cours',
            coursId: cours.id,
            matiere: cours.matiere,
            salle: cours.salle,
            professeur: cours.professeur,
            heureCours: cours.heure_debut,
          },
        },
        planning.depart,
      );
      if (identifiant) result.cours += 1;
    }

    // 2. Rappels de tâches à venir (dans la limite du budget restant).
    const budgetRestant = BUDGET_TOTAL - result.cours;
    const futurs = todos
      .filter((t) => !t.fait && t.heure_pensee)
      .map((todo) => {
        const { heures, minutes } = parseHeure(todo.heure_pensee);
        const quand = new Date(`${todo.date}T00:00:00`);
        quand.setHours(heures, minutes, 0, 0);
        return { todo, quand };
      })
      .filter((x) => x.quand.getTime() > Date.now())
      .sort((a, b) => a.quand.getTime() - b.quand.getTime())
      .slice(0, budgetRestant);

    for (const { todo, quand } of futurs) {
      const identifiant = await scheduleNotification(
        {
          title: `📝 Rappel : ${todo.titre}`,
          body: 'Pensez à faire cette tâche !',
          soundName: 'default',
          data: { kind: 'todo', todoId: todo.id, titre: todo.titre },
        },
        quand,
      );
      if (identifiant) result.rappels += 1;
      else result.ignores += 1;
    }
  } catch (error) {
    console.error('❌ Synchronisation des notifications :', error);
    result.ignores += 1;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Notification individuelle
// ---------------------------------------------------------------------------

async function scheduleNotification(
  input: {
    title: string;
    body: string;
    soundName: string;
    data: Record<string, unknown>;
  },
  date: Date,
): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: input.soundName,
        data: input.data,
        // Le canal Android par défaut est configuré avec son + vibration.
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      },
    });
  } catch (error) {
    console.warn('⚠️ Notification non planifiée :', error);
    return null;
  }
}

/**
 * Résout le son demandé. iOS attend un nom de fichier (ou « default ») :
 * on extrait le nom du chemin choisi par l'utilisateur si un son
 * personnalisé a été enregistré.
 */
function soundPour(params: { sonnerie: string; sonnerie_path: string }): string {
  if (Platform.OS === 'ios' && params.sonnerie === 'custom' && params.sonnerie_path) {
    return params.sonnerie_path.split('/').pop() || 'default';
  }
  return 'default';
}

// ---------------------------------------------------------------------------
// Snooze (report de 5 minutes, 3 max)
// ---------------------------------------------------------------------------

/** Reporte une alarme de cours de 5 minutes (action "Snooze" de la notification). */
export async function snoozeAlarm(
  _notificationId: string,
  coursId: number,
  matiere: string,
  salle: string,
  professeur: string,
): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const snoozes = scheduled.filter(
    (n) => n.content.data?.coursId === coursId && n.content.data?.snooze === true,
  ).length;

  if (snoozes >= SNOOZE_MAX) return false;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 Rappel : ${matiere}`,
        body: `Cours à ${salle}${professeur ? ` — ${professeur}` : ''} (Snooze ${snoozes + 1}/${SNOOZE_MAX})`,
        sound: 'default',
        data: { kind: 'cours', coursId, matiere, salle, professeur, snooze: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5 * 60,
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      },
    });
    return true;
  } catch (error) {
    console.warn('⚠️ Snooze impossible :', error);
    return false;
  }
}

/** Catégorie d'actions affichée sur les notifications d'alarme. */
export async function configureAlarmCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('alarm', [
    {
      identifier: 'snooze',
      buttonTitle: 'Snooze (5 min)',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'ok',
      buttonTitle: 'OK',
      options: { opensAppToForeground: false },
    },
  ]);
}
