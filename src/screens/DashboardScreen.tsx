import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { differenceInMinutes, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppStyles, useThemeColors } from '../context/ThemeContext';
import { getAllCours, type Cours } from '../services/CoursService';
import { getTodosByDate, type Todo } from '../services/TodoService';
import { getStatsTrajets, saveTrajet } from '../services/TrajetService';
import { getParametres, totalAvanceMinutes } from '../services/ParametresService';
import { nomJour, todayISO, minutesDepuisMinuit } from '../utils/date';
import { RADIUS, SPACING } from '../constants/theme';
import { prioriteStyle } from '../constants/priorite';
import ChronometreTrajet from '../components/trajet/ChronoTerTrajet';
import type { RootTabParamList } from '../navigation/types';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'Accueil'>;

export default function DashboardScreen() {
  const navigation = useNavigation<Navigation>();
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);

  const [cours, setCours] = useState<Cours[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [moyenneTrajet, setMoyenneTrajet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showChrono, setShowChrono] = useState(false);
  // « maintenant » rafraîchi régulièrement pour le compte à rebours.
  const [maintenant, setMaintenant] = useState(() => new Date());

  const aujourdhui = aujourdhuiISO(maintenant);

  // Horloge douce (30 s) : met à jour « prochain cours / dans X min ».
  useEffect(() => {
    const t = setInterval(() => setMaintenant(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [listeCours, todosJour, trajets] = await Promise.all([
        getAllCours(),
        getTodosByDate(todayISO()),
        getStatsTrajets(),
      ]);
      setCours(listeCours);
      setTodos(todosJour);
      setMoyenneTrajet(trajets.moyenneSecondes);
    } catch (err) {
      console.error('Erreur chargement du tableau de bord :', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Rechargement à chaque prise de focus de l'onglet (données toujours fraîches).
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const coursDuJour = useMemo(
    () => cours.filter((c) => c.jour === nomJour(aujourdhui)),
    [cours, aujourdhui],
  );
  const demain = new Date(aujourdhui);
  demain.setDate(aujourdhui.getDate() + 1);
  const coursDemain = useMemo(
    () => cours.filter((c) => c.jour === nomJour(demain)),
    [cours, demain],
  );

  const { prochainCours, coursEnCours } = useMemo(() => {
    const minutes = maintenant.getHours() * 60 + maintenant.getMinutes();
    const enCours = coursDuJour.find((c) => {
      const debut = minutesDepuisMinuit(c.heure_debut);
      const fin = minutesDepuisMinuit(c.heure_fin);
      return minutes >= debut && minutes < fin;
    });
    const prochain = coursDuJour.find(
      (c) => minutesDepuisMinuit(c.heure_debut) > minutes,
    );
    return { prochainCours: prochain, coursEnCours: enCours };
  }, [coursDuJour, maintenant]);

  const todosAFaire = useMemo(
    () => todos.filter((t) => !t.fait).sort((a, b) => (a.heure_pensee || '99:99').localeCompare(b.heure_pensee || '99:99')),
    [todos],
  );
  const todosFinis = todos.length - todosAFaire.length;

  const ouvrirAlarmeSysteme = async () => {
    // Cible : cours en cours/prochain aujourd'hui, sinon premier cours des
    // prochains jours, sinon message d'absence.
    let cible = prochainCours ?? coursEnCours;
    let jourCible = aujourdhui;
    if (!cible) {
      for (let i = 1; i <= 7; i += 1) {
        const d = new Date(aujourdhui);
        d.setDate(aujourdhui.getDate() + i);
        const liste = cours.filter((c) => c.jour === nomJour(d));
        if (liste.length > 0) {
          cible = liste[0];
          jourCible = d;
          break;
        }
      }
    }
    if (!cible) {
      Alert.alert('Aucun cours à venir', 'Votre emploi du temps est vide pour la semaine.');
      return;
    }

    const params = await getParametres();
    const debut = new Date(jourCible);
    const [hd, hm] = cible.heure_debut.split(':').map(Number);
    debut.setHours(hd, hm, 0, 0);
    const depart = new Date(debut.getTime() - totalAvanceMinutes(params) * 60_000);

    if (depart.getTime() <= Date.now()) {
      const restant = differenceInMinutes(debut, new Date());
      Alert.alert(
        coursEnCours && cible.id === coursEnCours.id
          ? 'Cours déjà commencé'
          : 'Délai trop court',
        coursEnCours && cible.id === coursEnCours.id
          ? `Le cours de ${cible.matiere} est en cours.`
          : `Le cours de ${cible.matiere} commence dans ${restant} min : impossible de programmer une alarme système.`,
      );
      return;
    }

    const message = `Alarme à ${format(depart, 'HH:mm')} pour ${cible.matiere} (cours à ${cible.heure_debut}).`;

    if (Platform.OS === 'android') {
      try {
        const { startActivityAsync } = require('expo-intent-launcher');
        await startActivityAsync('android.intent.action.SET_ALARM', {
          extra: {
            'android.intent.extra.alarm.HOUR': depart.getHours(),
            'android.intent.extra.alarm.MINUTES': depart.getMinutes(),
            'android.intent.extra.alarm.MESSAGE': `Départ pour ${cible.matiere}`,
          },
        });
        return;
      } catch {
        // L'intent système a échoué → on affiche l'heure à régler.
      }
    }
    Alert.alert('Alarme système', `${message}\n\nRéglez-la dans l'application Horloge.`);
  };

  const enregistrerTrajet = useCallback(
    async (duree: number) => {
      const maintenantISO = new Date();
      await saveTrajet({
        depart: new Date(Date.now() - duree * 1000).toISOString(),
        arrivee: maintenantISO.toISOString(),
        duree_secondes: duree,
        jour_semaine: nomJour(new Date()),
        moyen_transport: 'pied',
      });
      const stats = await getStatsTrajets();
      setMoyenneTrajet(stats.moyenneSecondes);
    },
    [],
  );

  if (loading && cours.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contenu}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.titre, { color: colors.text }]}>Bonjour 👋</Text>
            <Text style={[styles.date, { color: colors.textLight }]}>
              {format(aujourdhui, 'EEEE d MMMM', { locale: fr })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Réglages')} hitSlop={8}>
            <Text style={{ fontSize: 24 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Carte principale : prochain cours */}
        <View style={[styles.card, { borderLeftColor: colors.primary }]}>
          <Text style={[styles.carteTitre, { color: colors.textLight }]}>📚 Prochain cours</Text>
          {coursEnCours ? (
            <View>
              <View style={styles.bandeauEnCours}>
                <View style={[styles.dot, { backgroundColor: colors.success }]} />
                <Text style={[styles.enCoursTexte, { color: colors.success }]}>En cours</Text>
              </View>
              <Text style={[styles.matiere, { color: colors.text }]}>{coursEnCours.matiere}</Text>
              <Text style={[styles.detail, { color: colors.textLight }]}>
                Jusqu'à {coursEnCours.heure_fin} · {coursEnCours.salle}
              </Text>
              {coursEnCours.professeur ? (
                <Text style={[styles.detail, { color: colors.textLight }]}>{coursEnCours.professeur}</Text>
              ) : null}
            </View>
          ) : prochainCours ? (
            <View>
              <Text style={[styles.matiere, { color: colors.text }]}>{prochainCours.matiere}</Text>
              <Text style={[styles.detail, { color: colors.textLight }]}>
                {prochainCours.heure_debut} – {prochainCours.heure_fin} · {prochainCours.salle}
              </Text>
              <View style={[styles.pill, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.pillTexte, { color: colors.primary }]}>
                  Dans {differenceInMinutes(debutCours(prochainCours, aujourdhui), maintenant)} min
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.vide, { color: colors.textLight }]}>
              {coursDuJour.length > 0 ? "Plus de cours aujourd'hui 🎉" : "Aucun cours aujourd'hui"}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.lien, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => navigation.navigate('Cours')}
          >
            <Text style={[styles.lienTexte, { color: colors.primary }]}>Voir l'emploi du temps</Text>
          </TouchableOpacity>
        </View>

        {/* Demain */}
        {coursDemain.length > 0 && (
          <View style={styles.card}>
            <Text style={[styles.carteTitre, { color: colors.textLight }]}>📅 Demain · {nomJour(demain)}</Text>
            {coursDemain.slice(0, 2).map((c) => (
              <View key={c.id} style={styles.ligneCours}>
                <View style={styles.blocHeure}>
                  <Text style={[styles.heure, { color: colors.text }]}>{c.heure_debut}</Text>
                  <Text style={[styles.heureFin, { color: colors.textLight }]}>{c.heure_fin}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.matierePetit, { color: colors.text }]}>{c.matiere}</Text>
                  <Text style={[styles.detail, { color: colors.textLight }]}>📍 {c.salle}</Text>
                </View>
              </View>
            ))}
            {coursDemain.length > 2 && (
              <Text style={[styles.plus, { color: colors.primary }]}>
                +{coursDemain.length - 2} autre(s) cours
              </Text>
            )}
          </View>
        )}

        {/* À faire aujourd'hui */}
        <View style={styles.card}>
          <View style={styles.titreLigne}>
            <Text style={[styles.carteTitre, { color: colors.textLight }]}>📝 Aujourd'hui</Text>
            <Text style={[styles.compte, { color: colors.textLight }]}>
              {todosAFaire.length} à faire{todosFinis > 0 ? ` · ${todosFinis} ✔` : ''}
            </Text>
          </View>
          {todosAFaire.length === 0 && todos.length === 0 ? (
            <Text style={[styles.vide, { color: colors.textLight }]}>Aucune tâche planifiée.</Text>
          ) : todosAFaire.length === 0 ? (
            <Text style={[styles.vide, { color: colors.success }]}>Tout est terminé, bravo ! 🎉</Text>
          ) : (
            todosAFaire.slice(0, 4).map((todo) => {
              const prio = prioriteStyle(todo.priorite);
              return (
                <TouchableOpacity
                  key={todo.id}
                  style={styles.ligneTodo}
                  onPress={() => navigation.navigate('Tâches')}
                >
                  <View style={[styles.pastille, { backgroundColor: prio.bg }]}>
                    <Text style={[styles.pastilleTexte, { color: prio.fg }]}>P{todo.priorite}</Text>
                  </View>
                  <Text style={[styles.todoTitre, { color: colors.text }]} numberOfLines={1}>
                    {todo.titre}
                  </Text>
                  {todo.heure_pensee ? (
                    <Text style={[styles.todoHeure, { color: colors.textLight }]}>{todo.heure_pensee}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
          {todosAFaire.length > 4 && (
            <TouchableOpacity onPress={() => navigation.navigate('Tâches')}>
              <Text style={[styles.plus, { color: colors.primary }]}>+{todosAFaire.length - 4} autres…</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actions rapides */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.action, { backgroundColor: colors.surface }]}
            onPress={() => setShowChrono(true)}
          >
            <Text style={styles.actionEmoji}>🚶</Text>
            <Text style={[styles.actionTexte, { color: colors.text }]}>Chrono trajet</Text>
            {moyenneTrajet > 0 ? (
              <Text style={[styles.actionSous, { color: colors.textLight }]}>
                ~{Math.round(moyenneTrajet / 60)} min en moyenne
              </Text>
            ) : (
              <Text style={[styles.actionSous, { color: colors.textLight }]}>Chronométrer un trajet</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.action, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Étude')}
          >
            <Text style={styles.actionEmoji}>⏱️</Text>
            <Text style={[styles.actionTexte, { color: colors.onPrimary }]}>Réviser</Text>
            <Text style={[styles.actionSous, { color: colors.onPrimary, opacity: 0.8 }]}>
              Lancer une session
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.alarmeSecours} onPress={ouvrirAlarmeSysteme}>
          <Text style={[styles.alarmeSecoursTexte, { color: colors.primary }]}>
            ⏰ Régler une alarme système de secours
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showChrono} animationType="slide" onRequestClose={() => setShowChrono(false)}>
        <SafeAreaView style={[styles.screen, { paddingTop: 0 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitre, { color: colors.text }]}>🚶 Chronomètre de trajet</Text>
            <TouchableOpacity onPress={() => setShowChrono(false)} hitSlop={10}>
              <Text style={[styles.fermer, { color: colors.primary }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
          <ChronometreTrajet
            referenceSecondes={moyenneTrajet}
            onTrajetEnd={enregistrerTrajet}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function debutCours(cours: Cours, jour: Date): Date {
  const d = new Date(jour);
  const [h, m] = cours.heure_debut.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function aujourdhuiISO(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    contenu: { paddingHorizontal: SPACING.md, paddingBottom: 40 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 4,
    },
    titre: { fontSize: 26, fontWeight: '800' },
    date: { fontSize: 14, color: colors.textLight, textTransform: 'capitalize', marginTop: 2 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    carteTitre: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    titreLigne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    matiere: { fontSize: 20, fontWeight: '800' },
    matierePetit: { fontSize: 15, fontWeight: '700' },
    detail: { fontSize: 13, marginTop: 3 },
    vide: { fontSize: 15, textAlign: 'center', marginVertical: 10 },
    lien: { borderRadius: RADIUS.sm, padding: 10, alignItems: 'center', marginTop: 12 },
    lienTexte: { fontSize: 13, fontWeight: '700' },
    pill: { alignSelf: 'flex-start', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
    pillTexte: { fontSize: 12, fontWeight: '700' },
    bandeauEnCours: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    enCoursTexte: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    ligneCours: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    blocHeure: { width: 52 },
    heure: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
    heureFin: { fontSize: 12 },
    plus: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 6 },
    compte: { fontSize: 13, fontWeight: '600' },
    ligneTodo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pastille: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    pastilleTexte: { fontSize: 11, fontWeight: '800' },
    todoTitre: { flex: 1, fontSize: 14, fontWeight: '600' },
    todoHeure: { fontSize: 12, fontVariant: ['tabular-nums'] },
    actions: { flexDirection: 'row', gap: 12 },
    action: { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center' },
    actionEmoji: { fontSize: 24 },
    actionTexte: { fontSize: 15, fontWeight: '800', marginTop: 6 },
    actionSous: { fontSize: 11, marginTop: 2, textAlign: 'center' },
    alarmeSecours: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.lg,
      padding: 14,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    alarmeSecoursTexte: { fontSize: 13, fontWeight: '700' },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitre: { fontSize: 18, fontWeight: '800' },
    fermer: { fontSize: 15, fontWeight: '700' },
  });
