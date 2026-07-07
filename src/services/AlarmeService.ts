import * as Notifications from 'expo-notifications';
import { Cours } from './CoursService';

let snoozeCount: Record<string, number> = {};

// Configurer le comportement des notifications (son, vibreur, affichage)
export async function setupNotifications() {
  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldVibrate: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

// Demander la permission
export async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Calculer l'heure d'alarme
export function calculateAlarmTime(cours: Cours, tempsPreparation: number, tempsTrajet: number, marge: number): Date {
  const [h, m] = cours.heure_debut.split(':').map(Number);
  const coursDate = new Date();
  coursDate.setHours(h, m, 0, 0);
  
  const totalMinutes = tempsPreparation + tempsTrajet + marge;
  const alarmDate = new Date(coursDate.getTime() - totalMinutes * 60 * 1000);
  
  return alarmDate;
}

// Planifier une alarme pour un cours
export async function scheduleAlarm(cours: Cours, tempsPreparation = 20, tempsTrajet = 15, marge = 5) {
  const alarmTime = calculateAlarmTime(cours, tempsPreparation, tempsTrajet, marge);
  const now = new Date();

  // Si l'alarme est dans le passé, ne pas la planifier
  if (alarmTime <= now) {
    console.log(`⏰ Alarme ignorée pour ${cours.matiere} (déjà passée)`);
    return null;
  }

  // Annuler les anciennes alarmes pour ce cours
  await cancelAlarmByCoursId(cours.id);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚨 Départ pour ${cours.matiere} !`,
      body: `Cours à ${cours.heure_debut} en ${cours.salle}\nProfesseur : ${cours.professeur}`,
      sound: true,
      vibrate: [0, 500, 200, 500],
      data: { coursId: cours.id },
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alarmTime,
    },
  });

  console.log(`✅ Alarme planifiée pour ${cours.matiere} à ${alarmTime.toLocaleTimeString('fr-FR')}`);
  return identifier;
}

// Planifier toutes les alarmes
export async function scheduleAllAlarms(cours: Cours[], tempsPreparation = 20, tempsTrajet = 15, marge = 5) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  for (const c of cours) {
    await scheduleAlarm(c, tempsPreparation, tempsTrajet, marge);
  }
}

// Annuler une alarme
export async function cancelAlarmByCoursId(coursId: number) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.coursId === coursId) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

