import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStyles, useThemeColors } from '../context/ThemeContext';
import { getAllCours, type Cours } from '../services/CoursService';
import { saveSession, getSessions, type SessionRevision } from '../services/RevisionService';
import { getParametres } from '../services/ParametresService';
import { formatChrono, formatDuree } from '../utils/format';
import { RADIUS, SPACING } from '../constants/theme';
import type { IconName } from '../navigation/types';

interface Methode {
  id: string;
  nom: string;
  icon: IconName;
  travail: number; // secondes
  pause: number; // secondes
  desc: string;
}

const METHODES: Methode[] = [
  { id: 'Pomodoro', nom: 'Pomodoro', icon: 'timer-outline', travail: 25 * 60, pause: 5 * 60, desc: '25 min + 5 min de pause' },
  { id: 'Feynman', nom: 'Feynman', icon: 'chatbubble-outline', travail: 30 * 60, pause: 10 * 60, desc: 'Expliquer à voix haute' },
  { id: 'MindMap', nom: 'Mind Map', icon: 'git-branch-outline', travail: 45 * 60, pause: 15 * 60, desc: 'Carte mentale' },
  { id: 'Exercices', nom: 'Exercices', icon: 'create-outline', travail: 60 * 60, pause: 10 * 60, desc: 'Exercices pratiques' },
  { id: 'Lecture', nom: 'Lecture', icon: 'book-outline', travail: 30 * 60, pause: 10 * 60, desc: 'Lecture active' },
  { id: 'Flashcards', nom: 'Flashcards', icon: 'card-outline', travail: 20 * 60, pause: 5 * 60, desc: 'Cartes mémoire' },
];

export default function EtudeScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);

  const [cours, setCours] = useState<Cours[]>([]);
  const [coursChoisi, setCoursChoisi] = useState<number | null>(null);
  const [methodeId, setMethodeId] = useState('Pomodoro');
  const [historique, setHistorique] = useState<SessionRevision[]>([]);
  const [vue, setVue] = useState<'minuteur' | 'historique'>('minuteur');
  const [rafraichissement, setRafraichissement] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesOuvertes, setNotesOuvertes] = useState(false);

  // Minuteur (époch-based : insensible à la dérive des setInterval).
  const [phase, setPhase] = useState<'travail' | 'pause'>('travail');
  const [resteMs, setResteMs] = useState(METHODES[0].travail * 1000);
  const [actif, setActif] = useState(false); // le compte à rebours tourne
  const [enPause, setEnPause] = useState(false); // pause manuelle
  const [cycles, setCycles] = useState(0);

  const methode = METHODES.find((m) => m.id === methodeId) ?? METHODES[0];
  const phaseRef = useRef<'travail' | 'pause'>('travail');
  const finBlocRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dernierTickRef = useRef(0);
  const focusSecRef = useRef(0); // travail effectif
  const pauseSecRef = useRef(0); // temps de pause (auto + manuelle)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const debutSessionRef = useRef(new Date().toISOString());

  const majPhase = useCallback((p: 'travail' | 'pause') => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const arreterTic = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lancerCompteARebours = useCallback(
    (dureeMs: number) => {
      arreterTic();
      finBlocRef.current = Date.now() + dureeMs;
      dernierTickRef.current = Date.now();
      setActif(true);
      setEnPause(false);
      timerRef.current = setInterval(() => {
        const maintenant = Date.now();
        const delta = Math.min(3, (maintenant - dernierTickRef.current) / 1000);
        dernierTickRef.current = maintenant;
        if (phaseRef.current === 'travail') focusSecRef.current += delta;
        else pauseSecRef.current += delta;

        const restant = finBlocRef.current - maintenant;
        if (restant <= 0) {
          // Fin de bloc : on enchaîne travail -> pause -> travail automatiquement.
          arreterTic();
          setActif(false);
          if (phaseRef.current === 'travail') {
            setCycles((c) => c + 1);
            majPhase('pause');
            setResteMs(methode.pause * 1000);
            // Pause lancée automatiquement.
            lancerCompteARebours(methode.pause * 1000);
          } else {
            majPhase('travail');
            setResteMs(methode.travail * 1000);
            lancerCompteARebours(methode.travail * 1000);
          }
          return;
        }
        setResteMs(restant);
      }, 300);
    },
    [methode.pause, methode.travail, arreterTic, majPhase],
  );

  const demarrer = () => {
    if (actif) return;
    dernierTickRef.current = Date.now();
    const duree = (phase === 'travail' ? methode.travail : methode.pause) * 1000;
    setResteMs(duree);
    lancerCompteARebours(duree);
  };

  const suspendre = () => {
    arreterTic();
    setActif(false);
    setEnPause(true);
  };

  const reprendre = () => {
    lancerCompteARebours(resteMs);
  };

  const reinitialiserTout = useCallback(() => {
    arreterTic();
    setActif(false);
    setEnPause(false);
    setPhase('travail');
    phaseRef.current = 'travail';
    setResteMs(methode.travail * 1000);
    setCycles(0);
    focusSecRef.current = 0;
    pauseSecRef.current = 0;
    setNotes('');
    setNotesOuvertes(false);
  }, [arreterTic, methode.travail]);

  const arreter = () => {
    arreterTic();
    const focusSec = Math.max(0, Math.round(focusSecRef.current));
    const pauseSec = Math.max(0, Math.round(pauseSecRef.current));

    if (focusSec < 20) {
      Alert.alert('Session trop courte', 'Aucune session n’a été enregistrée (moins de 20 s de travail).');
      reinitialiserTout();
      return;
    }

    // Sauvegarde immédiate avant réinitialisation.
    const session: Parameters<typeof saveSession>[0] = {
      cours_id: coursChoisi,
      todo_id: null,
      methode: methode.id,
      debut: debutSessionRef.current,
      fin: new Date().toISOString(),
      duree_secondes: focusSec,
      nombre_cycles: cycles,
      concentration: 3,
      difficulte: 3,
      notes,
      progression: 0,
      nombre_pauses: cycles > 0 ? cycles : enPause ? 1 : 0,
      duree_pauses_secondes: pauseSec,
    };
    saveSession(session)
      .then(() => {
        Alert.alert(
          'Session enregistrée ✅',
          `${methode.nom} — ${formatDuree(focusSec)} de travail${cycles > 0 ? `, ${cycles} cycle(s)` : ''}${notes.trim() ? '. Notes conservées.' : ''}`,
          [{ text: 'Parfait' }],
        );
      })
      .catch(() => {
        Alert.alert('Erreur', "Impossible d'enregistrer la session.");
      })
      .finally(() => {
        chargerHistorique();
        reinitialiserTout();
      });
  };

  const charger = useCallback(async () => {
    const [listeCours, sessions, params] = await Promise.all([
      getAllCours(),
      getSessions(),
      getParametres(),
    ]);
    setCours(listeCours);
    setHistorique(sessions);
    // Méthode par défaut issue des paramètres (uniquement au premier chargement).
    const parDefaut = METHODES.find((m) => m.id === params.methode_defaut);
    setMethodeId((actuelle) => (actuelle === 'Pomodoro' && parDefaut ? parDefaut.id : actuelle));
  }, []);

  const chargerHistorique = useCallback(async () => {
    setHistorique(await getSessions());
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const choisirMethode = (id: string) => {
    if (actif || enPause) {
      Alert.alert('Session en cours', 'Arrêtez le minuteur avant de changer de méthode.');
      return;
    }
    const m = METHODES.find((x) => x.id === id);
    if (!m) return;
    setMethodeId(id);
    setResteMs(m.travail * 1000);
    setCycles(0);
    majPhase('travail');
    focusSecRef.current = 0;
    pauseSecRef.current = 0;
  };

  const peutDemarrer = !actif && !enPause;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>⏱️ Étude</Text>
          <Text style={[styles.sousTitre, { color: colors.textLight }]}>Pomodoro & techniques de révision</Text>
        </View>
        <View style={styles.headerActions}>
          {[['minuteur', 'timer-outline'], ['historique', 'time-outline']].map(([v, icone]) => {
            const actifVue = vue === v;
            return (
              <TouchableOpacity key={v} onPress={() => setVue(v as 'minuteur' | 'historique')} style={[styles.segmentVue, actifVue && { backgroundColor: colors.primary }]}>
                <Ionicons name={icone as IconName} size={17} color={actifVue ? colors.onPrimary : colors.textLight} />
                <Text style={[styles.segmentVueTexte, { color: actifVue ? colors.onPrimary : colors.textLight }]}>
                  {v === 'minuteur' ? 'Minuteur' : 'Historique'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {vue === 'historique' ? (
        <ScrollView
          contentContainerStyle={styles.contenu}
          refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={async () => { setRafraichissement(true); await chargerHistorique(); setRafraichissement(false); }} tintColor={colors.primary} />}
        >
          <Text style={[styles.sectionTitre, { color: colors.text }]}>Sessions récentes</Text>
          {historique.length === 0 ? (
            <Text style={[styles.vide, { color: colors.textLight }]}>
              Aucune session pour le moment. Lancez votre premier minuteur !
            </Text>
          ) : (
            historique.map((s) => (
              <View key={s.id} style={[styles.historiqueItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.historiqueIcone, { backgroundColor: colors.primarySoft }]}>
                  <Text style={{ fontSize: 18 }}>{s.matiere ? '📚' : '🎯'}</Text>
                </View>
                <View style={styles.historiqueInfos}>
                  <Text style={[styles.historiqueTitre, { color: colors.text }]} numberOfLines={1}>
                    {s.matiere ? s.matiere : 'Séance libre'} · {s.methode}
                  </Text>
                  <Text style={[styles.historiqueMeta, { color: colors.textLight }]}>
                    {format(new Date(s.debut), 'EEE d MMM · HH:mm', { locale: fr })}
                    {s.nombre_cycles > 0 ? ` · ${s.nombre_cycles} cycle(s)` : ''}
                  </Text>
                </View>
                <Text style={[styles.historiqueDuree, { color: colors.primary }]}>{formatDuree(s.duree_secondes)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
          {/* Méthodes */}
          <Text style={[styles.sectionTitre, { color: colors.text }]}>Méthode</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodesRow}>
            {METHODES.map((m) => {
              const actifId = methodeId === m.id;
              return (
                <TouchableOpacity key={m.id} style={[styles.methodeCard, { backgroundColor: colors.surface, borderColor: actifId ? colors.primary : colors.border }]} onPress={() => choisirMethode(m.id)} activeOpacity={0.8}>
                  <View style={[styles.methodeIcone, { backgroundColor: actifId ? colors.primary : colors.primarySoft }]}>
                    <Ionicons name={m.icon} size={20} color={actifId ? colors.onPrimary : colors.primary} />
                  </View>
                  <Text style={[styles.methodeNom, { color: actifId ? colors.primary : colors.text }]}>{m.nom}</Text>
                  <Text style={[styles.methodeDesc, { color: colors.textLight }]}>{m.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Matières */}
          <Text style={[styles.sectionTitre, { color: colors.text }]}>Matière</Text>
          <View style={styles.wrap}>
            <TouchableOpacity style={[styles.chip, coursChoisi === null && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setCoursChoisi(null)}>
              <Text style={[styles.chipTexte, { color: coursChoisi === null ? colors.onPrimary : colors.text }]}>Séance libre</Text>
            </TouchableOpacity>
            {cours.map((c) => {
              const actifId = coursChoisi === c.id;
              return (
                <TouchableOpacity key={c.id} style={[styles.chip, actifId && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setCoursChoisi(c.id)}>
                  <Text style={[styles.chipTexte, { color: actifId ? colors.onPrimary : colors.text }]}>{c.matiere}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Minuteur */}
          <View style={[styles.timerCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.phase, { color: phase === 'pause' ? colors.success : colors.danger }]}>
              {phase === 'pause' ? '🟢 PAUSE' : enPause ? '⏸️ EN PAUSE' : '🔴 TRAVAIL'}
            </Text>
            <Text style={[styles.timer, { color: colors.text }]}>{formatChrono(Math.ceil(resteMs / 1000))}</Text>
            <Text style={[styles.timerSous, { color: colors.textLight }]}>
              {methode.nom} · {formatDuree((phase === 'pause' ? methode.pause : methode.travail) * 1000)} par bloc
            </Text>

            <View style={styles.cycles}>
              {Array.from({ length: Math.max(1, cycles) }, (_, i) => (
                <View key={i} style={[styles.cycleDone, { backgroundColor: colors.primary }]} />
              ))}
              <Text style={[styles.cyclesTexte, { color: colors.textLight }]}>
                {cycles === 0 ? "Encore aucun cycle terminé" : `${cycles} cycle${cycles > 1 ? 's' : ''} terminé${cycles > 1 ? 's' : ''}`}
              </Text>
            </View>

            <View style={styles.controles}>
              {peutDemarrer ? (
                <TouchableOpacity style={[styles.controle, { backgroundColor: colors.success }]} onPress={demarrer}>
                  <Ionicons name="play" size={22} color="#fff" />
                  <Text style={styles.controleTexte}>Démarrer</Text>
                </TouchableOpacity>
              ) : actif ? (
                <TouchableOpacity style={[styles.controle, { backgroundColor: colors.warning }]} onPress={suspendre}>
                  <Ionicons name="pause" size={22} color="#fff" />
                  <Text style={styles.controleTexte}>Pause</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.controle, { backgroundColor: colors.success }]} onPress={reprendre}>
                  <Ionicons name="play" size={22} color="#fff" />
                  <Text style={styles.controleTexte}>Reprendre</Text>
                </TouchableOpacity>
              )}
              {(actif || enPause) && (
                <TouchableOpacity style={[styles.controle, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]} onPress={arreter}>
                  <Ionicons name="stop" size={20} color={colors.danger} />
                  <Text style={[styles.controleTexte, { color: colors.danger }]}>Arrêter</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.statutSession}>
              <Text style={[styles.statutTexte, { color: colors.textLight }]}>
                ⏱️ Travail : {formatDuree(focusSecRef.current || 0)} · ☕ Pause : {formatDuree(pauseSecRef.current || 0)}
              </Text>
              <TouchableOpacity onPress={() => setNotesOuvertes((v) => !v)} hitSlop={8}>
                <Text style={[styles.notesToggle, { color: colors.primary }]}>{notesOuvertes ? 'Masquer' : '📝 Notes'}</Text>
              </TouchableOpacity>
            </View>

            {notesOuvertes && (
              <TextInput
                style={[styles.notes, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes de la session (seront sauvegardées)…"
                placeholderTextColor={colors.placeholder}
                multiline
                textAlignVertical="top"
              />
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingTop: 10,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: { fontSize: 24, fontWeight: '800' },
    sousTitre: { fontSize: 12, marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 8 },
    segmentVue: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill },
    segmentVueTexte: { fontSize: 13, fontWeight: '700' },
    contenu: { padding: SPACING.md, paddingBottom: 40 },
    sectionTitre: { fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 6 },
    methodesRow: { gap: 10, paddingRight: 8 },
    methodeCard: { width: 150, borderWidth: 1.5, borderRadius: RADIUS.lg, padding: 12, marginRight: 0 },
    methodeIcone: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    methodeNom: { fontSize: 14, fontWeight: '800', marginTop: 8 },
    methodeDesc: { fontSize: 11, marginTop: 3, lineHeight: 15 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    chipTexte: { fontSize: 13, fontWeight: '700' },
    timerCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', shadowColor: colors.shadow, shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    phase: { fontSize: 14, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    timer: { fontSize: 62, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 6, letterSpacing: 2 },
    timerSous: { fontSize: 13, marginTop: 2 },
    cycles: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
    cycleDone: { width: 9, height: 9, borderRadius: 5 },
    cyclesTexte: { fontSize: 12, marginLeft: 6 },
    controles: { flexDirection: 'row', gap: 10, marginTop: 22 },
    controle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 13, borderRadius: RADIUS.md },
    controleTexte: { color: '#fff', fontSize: 15, fontWeight: '800' },
    statutSession: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, width: '100%' },
    statutTexte: { fontSize: 12 },
    notesToggle: { fontSize: 13, fontWeight: '700' },
    notes: { width: '100%', minHeight: 90, borderWidth: 1, borderRadius: RADIUS.md, padding: 12, fontSize: 14, marginTop: 12, textAlignVertical: 'top' },
    historiqueItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.md, borderWidth: 1, padding: 12, marginBottom: 10 },
    historiqueIcone: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    historiqueInfos: { flex: 1 },
    historiqueTitre: { fontSize: 15, fontWeight: '800' },
    historiqueMeta: { fontSize: 12, marginTop: 3 },
    historiqueDuree: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
    vide: { textAlign: 'center', fontSize: 14, marginVertical: 30, lineHeight: 20 },
  });
