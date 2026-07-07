import * as Notifications from "expo-notifications";
import { Cours } from "./CoursService";

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
  return status === "granted";
}

// Calculer l'heure d'alarme
export function calculateAlarmTime(
  cours: Cours,
  tempsPreparation: number,
  tempsTrajet: number,
  marge: number,
): Date {
  const [h, m] = cours.heure_debut.split(":").map(Number);
  const coursDate = new Date();
  coursDate.setHours(h, m, 0, 0);

  const totalMinutes = tempsPreparation + tempsTrajet + marge;
  const alarmDate = new Date(coursDate.getTime() - totalMinutes * 60 * 1000);

  return alarmDate;
}

// Planifier une alarme pour un cours
export async function scheduleAlarm(
  cours: Cours,
  tempsPreparation = 20,
  tempsTrajet = 15,
  marge = 5,
  soundName?: string,
) {
  const alarmTime = calculateAlarmTime(
    cours,
    tempsPreparation,
    tempsTrajet,
    marge,
  );
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
      sound: soundName ? soundName : "default",
      vibrate: [0, 500, 200, 500],
      data: {
        coursId: cours.id,
        matiere: cours.matiere,
        salle: cours.salle,
        professeur: cours.professeur,
      },
      priority: Notifications.AndroidNotificationPriority.HIGH,
      categoryIdentifier: "alarm",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alarmTime,
    },
  });

  console.log(
    `✅ Alarme planifiée pour ${cours.matiere} à ${alarmTime.toLocaleTimeString("fr-FR")}`,
  );
  return identifier;
}

// Planifier toutes les alarmes
export async function scheduleAllAlarms(
  cours: Cours[],
  tempsPreparation = 20,
  tempsTrajet = 15,
  marge = 5,
  soundName?: string,
) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const c of cours) {
    await scheduleAlarm(c, tempsPreparation, tempsTrajet, marge, soundName);
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

// export async function scheduleTodoAlarm(todo: { id: number; titre: string; date: string; heure_pensee: string }) {
//   if (!todo.heure_pensee) return null;
  
//   const [h, m] = todo.heure_pensee.split(':').map(Number);
//   const alarmDate = new Date(todo.date);
//   alarmDate.setHours(h, m, 0, 0);
  
//   if (alarmDate <= new Date()) return null;
  
//   return await Notifications.scheduleNotificationAsync({
//     content: {
//       title: `📝 Rappel : ${todo.titre}`,
//       body: 'Pensez à faire cette tâche !',
//       sound: true,
//       vibrate: [0, 300, 200, 300],
//       data: { todoId: todo.id },
//       priority: Notifications.AndroidNotificationPriority.HIGH,
//     },
//     trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: alarmDate },
//   });
// }



// Snooze une alarme (report de 5 min, max 3 fois)
export async function snoozeAlarm(
  notificationId: string,
  coursId: number,
  matiere: string,
  salle: string,
  professeur: string,
) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  // Compter les snooze existants pour ce cours
  let snoozeCount = 0;
  for (const notif of scheduled) {
    if (notif.content.data?.coursId === coursId && notif.content.data?.snooze) {
      snoozeCount++;
    }
  }

  if (snoozeCount >= 3) {
    return false; // Max 3 snooze atteint
  }

  // Planifier un rappel dans 5 minutes
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 Rappel : ${matiere} !`,
      body: `Cours à ${salle} - Professeur : ${professeur}\n(Snooze ${snoozeCount + 1}/3)`,
      sound: true,
      vibrate: [0, 500, 200, 500],
      data: { coursId, snooze: true },
      priority: Notifications.AndroidNotificationPriority.HIGH,
      categoryIdentifier: "alarm",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5 * 60, // 5 minutes
    },
  });

  return true;
}

export async function scheduleTodoAlarm(todo: { id: number; titre: string; date: string; heure_pensee: string }) {
  if (!todo.heure_pensee) return null;
  
  const [h, m] = todo.heure_pensee.split(':').map(Number);
  const alarmDate = new Date(todo.date);
  alarmDate.setHours(h, m, 0, 0);
  
  if (alarmDate <= new Date()) return null;
  
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: `📝 ${todo.titre}`,
      body: 'Pensez à faire cette tâche !',
      sound: true,
      vibrate: [0, 300, 200, 300],
      data: { todoId: todo.id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: alarmDate },
  });
}
