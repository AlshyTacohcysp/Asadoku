import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppStyles, useThemeColors } from '../../context/ThemeContext';
import { addTodo, type TodoSaisie } from '../../services/TodoService';
import { getAllCours, type Cours } from '../../services/CoursService';
import { addDaysISO, fromISO, toISO, todayISO } from '../../utils/date';
import { prioriteStyle } from '../../constants/priorite';
import { CATEGORIES } from '../../constants/categories';
import { RADIUS, SPACING } from '../../constants/theme';
import HeurePicker from '../ui/HeurePicker';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Appelé après insertion (pour recharger + resynchroniser les rappels). */
  onTodoAdded: () => Promise<void>;
  cours: Cours[];
}

const RECURRENCES = [
  { id: 'none', nom: 'Une fois' },
  { id: 'daily', nom: 'Quotidien' },
  { id: 'weekly', nom: 'Hebdo' },
  { id: 'monthly', nom: 'Mensuel' },
];


export default function TodoForm({ visible, onClose, onTodoAdded, cours }: Props) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [dateISO, setDateISO] = useState(() => todayISO());
  const [{ h, m }, setHeure] = useState<{ h: string; m: string }>({ h: '08', m: '00' });
  const [priorite, setPriorite] = useState(3);
  const [categorie, setCategorie] = useState('divers');
  const [recurrence, setRecurrence] = useState('none');
  const [coursId, setCoursId] = useState<number | null>(null);
  const [showHeure, setShowHeure] = useState(false);
  const [showCalendrier, setShowCalendrier] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tous les cours disponibles (chips) — recharge si la liste change.
  const [tousCours, setTousCours] = useState<Cours[]>(cours);
  useEffect(() => {
    setTousCours(cours);
  }, [cours]);
  useEffect(() => {
    if (visible && tousCours.length === 0) {
      getAllCours().then(setTousCours).catch(() => {});
    }
  }, [visible, tousCours.length]);

  useEffect(() => {
    if (!visible) {
      setTitre('');
      setDescription('');
      setDateISO(todayISO());
      setHeure({ h: '08', m: '00' });
      setPriorite(3);
      setCategorie('divers');
      setRecurrence('none');
      setCoursId(null);
      setSaving(false);
    }
  }, [visible]);

  const soumettre = async () => {
    if (!titre.trim()) {
      Alert.alert('Titre requis', 'Donnez un titre à votre tâche.');
      return;
    }
    setSaving(true);
    try {
      const saisie: TodoSaisie = {
        titre: titre.trim(),
        description: description.trim(),
        date: dateISO,
        heure_pensee: `${h}:${m}`,
        priorite,
        categorie,
        cours_id: coursId,
        recurrence,
      };
      await addTodo(saisie);
      await onTodoAdded();
      onClose();
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible d’ajouter la tâche.');
    } finally {
      setSaving(false);
    }
  };

  const rappelFutur = (() => {
    const total = Number(h) * 60 + Number(m);
    const maintenant = new Date();
    const maintenantMin = maintenant.getHours() * 60 + maintenant.getMinutes();
    return dateISO > todayISO() || (dateISO === todayISO() && total > maintenantMin);
  })();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.textLight} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Nouvelle tâche</Text>
          <TouchableOpacity onPress={soumettre} disabled={saving} hitSlop={10}>
            <Text style={[styles.save, { color: colors.primary, opacity: saving ? 0.5 : 1 }]}>{saving ? '…' : 'Ajouter'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={[styles.label, { color: colors.textLight }]}>Titre *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={titre}
            onChangeText={setTitre}
            placeholder="Ex : Réviser le chapitre 3"
            placeholderTextColor={colors.placeholder}
            autoFocus={false}
          />

          <Text style={[styles.label, { color: colors.textLight }]}>Description (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.multiligne, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Précisions, consignes…"
            placeholderTextColor={colors.placeholder}
            multiline
            textAlignVertical="top"
          />

          {/* Date */}
          <Text style={[styles.label, { color: colors.textLight }]}>Date</Text>
          <View style={styles.dateLigne}>
            {[
              { libelle: "Auj.", valeur: todayISO() },
              { libelle: 'Demain', valeur: addDaysISO(todayISO(), 1) },
              { libelle: '+7 j', valeur: addDaysISO(todayISO(), 7) },
            ].map((opt) => {
              const actif = dateISO === opt.valeur;
              return (
                <TouchableOpacity
                  key={opt.valeur}
                  style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setDateISO(opt.valeur)}
                >
                  <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>{opt.libelle}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.calendrier}
              onPress={() => setShowCalendrier((s) => !s)}
              accessibilityLabel="Choisir une date"
            >
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.dateTexte, { color: colors.textLight }]}>
            {format(fromISO(dateISO), 'EEEE d MMMM yyyy', { locale: fr })}
          </Text>
          {showCalendrier && (
            <DateTimePicker
              value={fromISO(dateISO)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              locale="fr-FR"
              minimumDate={undefined}
              onChange={(event, selected) => {
                setShowCalendrier(false);
                if (event.type === 'set' && selected) setDateISO(toISO(selected));
              }}
            />
          )}

          {/* Heure pensée */}
          <Text style={[styles.label, { color: colors.textLight }]}>Heure du rappel</Text>
          <TouchableOpacity
            style={[styles.heureBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowHeure(true)}
          >
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={[styles.heureTexte, { color: colors.text }]}>
              {h}:{m}
            </Text>
          </TouchableOpacity>
          {!rappelFutur && (
            <Text style={[styles.hint, { color: colors.warning }]}>
              ⚠️ Heure déjà passée pour aujourd'hui : aucun rappel ne sera programmé.
            </Text>
          )}

          {/* Catégorie */}
          <Text style={[styles.label, { color: colors.textLight }]}>Catégorie</Text>
          <View style={styles.wrap}>
            {CATEGORIES.map((c) => {
              const actif = categorie === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setCategorie(c.id)}
                >
                  <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>
                    {c.emoji} {c.nom}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Priorité */}
          <Text style={[styles.label, { color: colors.textLight }]}>Priorité</Text>
          <View style={styles.wrap}>
            {[1, 2, 3, 4, 5].map((p) => {
              const st = prioriteStyle(p);
              const actif = priorite === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.prio, { borderColor: actif ? st.bg : colors.border, backgroundColor: colors.surface }]}
                  onPress={() => setPriorite(p)}
                  accessibilityLabel={`Priorité ${p}`}
                >
                  <Text style={[styles.prioTexte, { color: actif ? st.bg : colors.textLight, fontWeight: actif ? '800' : '700' }]}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Répétition */}
          <Text style={[styles.label, { color: colors.textLight }]}>Répétition</Text>
          <View style={styles.wrap}>
            {RECURRENCES.map((r) => {
              const actif = recurrence === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setRecurrence(r.id)}
                >
                  <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>{r.nom}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {recurrence !== 'none' && (
            <Text style={[styles.hint, { color: colors.textLight }]}>
              🔁 Une nouvelle occurrence sera créée automatiquement quand vous cocherez la tâche.
            </Text>
          )}

          {/* Cours associé */}
          <Text style={[styles.label, { color: colors.textLight }]}>Associer à un cours (optionnel)</Text>
          <View style={styles.wrap}>
            <TouchableOpacity
              style={[styles.chip, coursId === null && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setCoursId(null)}
            >
              <Text style={[styles.chipTexte, { color: coursId === null ? colors.onPrimary : colors.text }]}>Aucun</Text>
            </TouchableOpacity>
            {tousCours.map((c) => {
              const actif = coursId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setCoursId(c.id)}
                >
                  <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>
                    {c.matiere} · {c.jour.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {tousCours.length === 0 && (
              <Text style={[styles.hint, { color: colors.textLight }]}>Ajoutez d'abord un cours dans l'onglet Cours.</Text>
            )}
          </View>
        </ScrollView>

        <HeurePicker
          visible={showHeure}
          label="Heure du rappel"
          heure={h}
          minute={m}
          onHeure={(nh) => setHeure({ h: nh, m })}
          onMinute={(nm) => setHeure({ h, m: nm })}
          onClose={() => setShowHeure(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: { fontSize: 17, fontWeight: '800' },
    save: { fontSize: 15, fontWeight: '800' },
    form: { padding: SPACING.md, paddingBottom: 40 },
    label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 16, marginBottom: 7 },
    input: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
    multiligne: { minHeight: 78 },
    dateLigne: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    chip: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipTexte: { fontSize: 13, fontWeight: '700' },
    calendrier: {
      padding: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.surface,
    },
    dateTexte: { fontSize: 13, marginTop: 7, textTransform: 'capitalize' },
    heureBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 13,
      alignSelf: 'flex-start',
    },
    heureTexte: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
    hint: { fontSize: 12, marginTop: 7, lineHeight: 17 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    prio: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    prioTexte: { fontSize: 15 },
  });
