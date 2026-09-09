import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStyles, useThemeColors } from '../context/ThemeContext';
import {
  getTodosByDate,
  getLateTodos,
  markTodoAsDone,
  markTodoAsUndone,
  completeAndRepeat,
  deleteTodo,
  type Todo,
} from '../services/TodoService';
import { getAllCours, type Cours } from '../services/CoursService';
import { syncNotifications } from '../services/AlarmeService';
import { addDaysISO, fromISO, toISO, todayISO } from '../utils/date';
import { prioriteStyle } from '../constants/priorite';
import { emojiCategorie } from '../constants/categories';
import { RADIUS, SPACING } from '../constants/theme';
import TodoForm from '../components/todos/TodoForm';
import TodoDetail from '../components/todos/TodoDetail';
import EmptyState from '../components/ui/EmptyState';

const ETIQUETTES_JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function TodosScreen() {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [cours, setCours] = useState<Cours[]>([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [vue, setVue] = useState<'today' | 'semaine'>('today');
  const [dateSelection, setDateSelection] = useState(() => todayISO());
  const [showForm, setShowForm] = useState(false);
  const [selection, setSelection] = useState<Todo | null>(null);

  const aujourdhui = todayISO();

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [listeCours] = await Promise.all([getAllCours()]);
      setCours(listeCours);
      if (vue === 'today') {
        const [duJour, enRetard] = await Promise.all([
          getTodosByDate(aujourdhui),
          getLateTodos(aujourdhui),
        ]);
        setTodos([
          ...enRetard.map((t) => ({ ...t, _retard: true })),
          ...duJour,
        ]);
      } else {
        setTodos(await getTodosByDate(dateSelection));
      }
    } catch (err) {
      console.error('Erreur de chargement des tâches :', err);
    } finally {
      setLoading(false);
    }
  }, [vue, dateSelection, aujourdhui]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  // Recharge quand on change de mode ou de jour sélectionné.
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vue, dateSelection]);

  const changerVue = (v: 'today' | 'semaine') => {
    setVue(v);
    setDateSelection(aujourdhui);
  };

  const semaines = useMemo(() => {
    const lundi = startOfWeek(fromISO(dateSelection), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => toISO(new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + i)));
  }, [dateSelection]);

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return todos;
    return todos.filter(
      (t) =>
        t.titre.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q),
    );
  }, [todos, recherche]);

  const triés = useMemo(() => {
    return [...resultats].sort((a, b) => {
      if (vue === 'today') {
        if (!!(a as Todo & { _retard?: boolean })._retard !== !!(b as Todo & { _retard?: boolean })._retard) {
          return (a as Todo & { _retard?: boolean })._retard ? -1 : 1;
        }
      }
      if (a.fait !== b.fait) return a.fait - b.fait;
      const hA = a.heure_pensee || '99:99';
      const hB = b.heure_pensee || '99:99';
      if (hA !== hB) return hA.localeCompare(hB);
      return b.priorite - a.priorite;
    });
  }, [resultats, vue]);

  const aFaire = todos.filter((t) => !t.fait).length;
  const termine = todos.length - aFaire;

  const nomCours = useCallback(
    (id: number | null) => {
      const c = cours.find((x) => x.id === id);
      return c ? c.matiere : null;
    },
    [cours],
  );

  const resynchroniser = async () => {
    try {
      await syncNotifications();
    } catch {
      // silencieux : les rappels seront resynchronisés au prochain lancement.
    }
  };

  const basculerFait = async (todo: Todo) => {
    try {
      if (todo.fait) {
        await markTodoAsUndone(todo.id);
      } else if (todo.recurrence && todo.recurrence !== 'none') {
        await completeAndRepeat(todo);
      } else {
        await markTodoAsDone(todo.id);
      }
      await resynchroniser();
      await charger();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la tâche.');
      console.error(err);
    }
  };

  const supprimer = (todo: Todo) => {
    Alert.alert(
      'Supprimer la tâche ?',
      `« ${todo.titre} » sera définitivement supprimée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTodo(todo.id);
              await resynchroniser();
              setSelection(null);
              await charger();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer la tâche.');
            }
          },
        },
      ],
    );
  };

  const renderTodo = ({ item }: { item: Todo }) => {
    const retard = (item as Todo & { _retard?: boolean })._retard === true;
    const prio = prioriteStyle(item.priorite);
    const emoji = emojiCategorie(item.categorie || '');
    const fait = item.fait === 1;

    return (
      <TouchableOpacity
        style={[styles.carte, fait && { opacity: 0.55 }]}
        onPress={() => setSelection(item)}
        onLongPress={() => supprimer(item)}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          onPress={() => basculerFait(item)}
          style={[styles.checkbox, { borderColor: fait ? colors.success : colors.placeholder }, fait && { backgroundColor: colors.success, borderColor: colors.success }]}
          hitSlop={8}
          accessibilityLabel={fait ? 'Marquer comme à faire' : 'Marquer comme faite'}
        >
          {fait && <Ionicons name="checkmark" size={14} color="#fff" />}
        </TouchableOpacity>

        <View style={styles.contenu}>
          <View style={styles.ligneTitre}>
            {!fait && <Text style={styles.emoji}>{emoji}</Text>}
            <Text
              style={[styles.titre, { color: fait ? colors.textLight : colors.text }, fait && styles.titreBarré]}
              numberOfLines={2}
            >
              {item.titre}
            </Text>
          </View>

          <View style={styles.meta}>
            {retard && (
              <View style={[styles.badgeRetard, { backgroundColor: colors.danger }]}>
                <Text style={styles.badgeRetardTexte}>
                  En retard · {format(fromISO(item.date), 'd MMM', { locale: fr })}
                </Text>
              </View>
            )}
            {item.heure_pensee && (
              <Text style={[styles.metaTexte, { color: colors.textLight }]}>
                🕐 {item.heure_pensee}
              </Text>
            )}
            {item.cours_id && nomCours(item.cours_id) && (
              <Text style={[styles.metaTexte, { color: colors.primary }]}>
                📚 {nomCours(item.cours_id)}
              </Text>
            )}
            {item.recurrence && item.recurrence !== 'none' && (
              <Text style={[styles.metaTexte, { color: colors.warning }]}>
                🔁 {RECURRENCE_NOMS[item.recurrence] || item.recurrence}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.badge, { backgroundColor: prio.bg }]}>
          <Text style={[styles.badgeTexte, { color: prio.fg }]}>P{item.priorite}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const listeVide = recherche
    ? () => (
        <EmptyState icon="search-outline" titre="Aucun résultat" message="Essayez un autre terme de recherche." />
      )
    : vue === 'today'
      ? () => (
          <EmptyState
            icon="checkmark-done-circle-outline"
            titre="Aucune tâche pour aujourd'hui"
            message="Profitez-en, ou planifiez une nouvelle tâche."
            actionLabel="Nouvelle tâche"
            onAction={() => setShowForm(true)}
          />
        )
      : () => (
          <EmptyState
            icon="calendar-outline"
            titre="Journée libre"
            message="Aucune tâche planifiée ce jour-là."
            actionLabel="Ajouter une tâche"
            onAction={() => setShowForm(true)}
          />
        );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>📝 Mes tâches</Text>
          <Text style={[styles.sousTitre, { color: colors.textLight }]}>
            {vue === 'today' ? `${aFaire} en cours · ${termine} terminée(s)` : format(fromISO(dateSelection), 'EEEE d MMMM', { locale: fr })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.boutonAjout}
          onPress={() => setShowForm(true)}
          accessibilityLabel="Ajouter une tâche"
        >
          <Ionicons name="add" size={26} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.recherche}>
        <Ionicons name="search" size={18} color={colors.placeholder} />
        <TextInput
          style={[styles.rechercheInput, { color: colors.text }]}
          value={recherche}
          onChangeText={setRecherche}
          placeholder="Rechercher une tâche…"
          placeholderTextColor={colors.placeholder}
        />
        {recherche.length > 0 && (
          <TouchableOpacity onPress={() => setRecherche('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.placeholder} />
          </TouchableOpacity>
        )}
      </View>

      {/* Bascule Aujourd'hui / Semaine */}
      <View style={[styles.segmente, { backgroundColor: colors.surfaceAlt }]}>
        {(['today', 'semaine'] as const).map((v) => {
          const actif = vue === v;
          return (
            <TouchableOpacity
              key={v}
              style={[styles.segment, actif && { backgroundColor: colors.surface, shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }]}
              onPress={() => changerVue(v)}
            >
              <Text style={[styles.segmentTexte, { color: actif ? colors.primary : colors.textLight }, actif && styles.segmentTexteActif]}>
                {v === 'today' ? "Aujourd'hui" : 'Semaine'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bandeau semaine */}
      {vue === 'semaine' && (
        <View style={styles.semaineHeader}>
          <TouchableOpacity
            onPress={() => setDateSelection(addDaysISO(dateSelection, -7))}
            hitSlop={8}
            style={styles.semaineNav}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.semaineTitre, { color: colors.text }]}>
            {format(startOfWeek(fromISO(dateSelection), { weekStartsOn: 1 }), 'd MMM', { locale: fr })}
          </Text>
          <TouchableOpacity
            onPress={() => setDateSelection(addDaysISO(dateSelection, 7))}
            hitSlop={8}
            style={styles.semaineNav}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {vue === 'semaine' && (
        <View style={styles.jours}>
          {semaines.map((iso, i) => {
            const date = fromISO(iso);
            const actif = iso === dateSelection;
            const estAujourdhui = iso === aujourdhui;
            return (
              <TouchableOpacity
                key={iso}
                style={[
                  styles.jour,
                  { borderColor: colors.border },
                  actif && { backgroundColor: colors.primary, borderColor: colors.primary },
                  estAujourdhui && !actif && { borderColor: colors.primary },
                ]}
                onPress={() => setDateSelection(iso)}
              >
                <Text style={[styles.jourLettre, { color: actif ? colors.onPrimary : colors.textLight }]}>
                  {ETIQUETTES_JOURS[i]}
                </Text>
                <Text style={[styles.jourNum, { color: actif ? colors.onPrimary : colors.text }]}>
                  {date.getDate()}
                </Text>
                {estAujourdhui ? (
                  <Text style={[styles.jourPoint, { color: actif ? colors.onPrimary : colors.primary }]}>●</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {loading && todos.length === 0 ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={triés}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTodo}
          contentContainerStyle={styles.liste}
          ListEmptyComponent={listeVide()}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={charger} tintColor={colors.primary} />}
        />
      )}

      <TodoForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onTodoAdded={async () => {
          await resynchroniser();
          await charger();
        }}
        cours={cours}
      />
      <TodoDetail
        todo={selection}
        cours={cours}
        onClose={() => setSelection(null)}
        onUpdated={async () => {
          await resynchroniser();
          await charger();
        }}
        onDeleted={() => supprimer(selection!)}
      />
    </SafeAreaView>
  );
}

const RECURRENCE_NOMS: Record<string, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingTop: 10,
      paddingBottom: 8,
    },
    title: { fontSize: 24, fontWeight: '800' },
    sousTitre: { fontSize: 13, marginTop: 2 },
    boutonAjout: {
      backgroundColor: colors.primary,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
      shadowColor: colors.shadow,
    },
    recherche: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: SPACING.md,
      marginBottom: 10,
      borderRadius: RADIUS.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
    },
    rechercheInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
    segmente: {
      flexDirection: 'row',
      marginHorizontal: SPACING.md,
      borderRadius: RADIUS.md,
      padding: 3,
      marginBottom: 12,
    },
    segment: { flex: 1, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
    segmentTexte: { fontSize: 13, fontWeight: '700' },
    segmentTexteActif: { fontWeight: '800' },
    semaineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      marginBottom: 6,
    },
    semaineNav: { padding: 4 },
    semaineTitre: { fontSize: 13, fontWeight: '700', minWidth: 70, textAlign: 'center', textTransform: 'capitalize' },
    jours: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.md, marginBottom: 10 },
    jour: { width: 42, borderWidth: 1, borderRadius: RADIUS.sm, alignItems: 'center', paddingVertical: 6 },
    jourLettre: { fontSize: 11, fontWeight: '700' },
    jourNum: { fontSize: 15, fontWeight: '800', marginTop: 1 },
    jourPoint: { fontSize: 5, lineHeight: 7, marginTop: 3 },
    liste: { paddingHorizontal: SPACING.md, paddingBottom: 30, flexGrow: 1 },
    carte: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      padding: 12,
      marginBottom: 9,
      shadowColor: colors.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    contenu: { flex: 1 },
    ligneTitre: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
    emoji: { fontSize: 14 },
    titre: { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 20 },
    titreBarré: { textDecorationLine: 'line-through' },
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, alignItems: 'center' },
    metaTexte: { fontSize: 12, fontWeight: '600' },
    badgeRetard: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    badgeRetardTexte: { color: '#fff', fontSize: 10, fontWeight: '800' },
    badge: { minWidth: 32, paddingHorizontal: 7, paddingVertical: 4, borderRadius: RADIUS.sm, alignItems: 'center', marginLeft: 8 },
    badgeTexte: { fontSize: 11, fontWeight: '800' },
  });
