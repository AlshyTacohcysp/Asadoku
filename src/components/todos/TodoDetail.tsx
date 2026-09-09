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
import { updateTodo, type Todo } from '../../services/TodoService';
import { type Cours } from '../../services/CoursService';
import { fromISO, toISO, todayISO } from '../../utils/date';
import { prioriteStyle } from '../../constants/priorite';
import { CATEGORIES, emojiCategorie, nomCategorie } from '../../constants/categories';
import { RADIUS, SPACING } from '../../constants/theme';
import HeurePicker from '../ui/HeurePicker';

interface Props {
  todo: Todo | null;
  cours: Cours[];
  onClose: () => void;
  /** Appelé après une modification (rechargement + resync rappels). */
  onUpdated: () => Promise<void>;
  /** Appelé quand l'utilisateur confirme la suppression. */
  onDeleted: () => void;
}

const RECURRENCE_NOMS = [
  { id: 'none', nom: 'Une fois' },
  { id: 'daily', nom: 'Quotidien' },
  { id: 'weekly', nom: 'Hebdo' },
  { id: 'monthly', nom: 'Mensuel' },
];

export default function TodoDetail({ todo, cours, onClose, onUpdated, onDeleted }: Props) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);

  const [edition, setEdition] = useState(false);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [dateISO, setDateISO] = useState(todayISO());
  const [{ h, m }, setHeure] = useState<{ h: string; m: string }>({ h: '08', m: '00' });
  const [priorite, setPriorite] = useState(3);
  const [categorie, setCategorie] = useState('divers');
  const [recurrence, setRecurrence] = useState('none');
  const [coursId, setCoursId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [showCalendrier, setShowCalendrier] = useState(false);
  const [showHeure, setShowHeure] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!todo) return;
    const [hd, hm] = (todo.heure_pensee || '08:00').split(':');
    setTitre(todo.titre);
    setDescription(todo.description || '');
    setDateISO(todo.date);
    setHeure({ h: hd, m: hm });
    setPriorite(todo.priorite);
    setCategorie(todo.categorie || 'divers');
    setRecurrence(todo.recurrence || 'none');
    setCoursId(todo.cours_id);
    setNotes(todo.notes_personnelles || '');
    setEdition(false);
  }, [todo]);

  if (!todo) return null;

  const sauver = async () => {
    if (!titre.trim()) {
      Alert.alert('Titre requis', 'Donnez un titre à votre tâche.');
      return;
    }
    setSaving(true);
    try {
      await updateTodo(todo.id, {
        titre: titre.trim(),
        description: description.trim(),
        date: dateISO,
        heure_pensee: `${h}:${m}`,
        priorite,
        categorie,
        recurrence,
        cours_id: coursId,
        notes_personnelles: notes.trim(),
      });
      await onUpdated();
      setEdition(false);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible d’enregistrer.');
    } finally {
      setSaving(false);
    }
  };

  const st = prioriteStyle(todo.priorite);
  const nomCoursAssocie = cours.find((c) => c.id === todo.cours_id)?.matiere;

  return (
    <Modal visible={!!todo} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.titreHeader, { color: colors.text }]}>
                {edition ? 'Modifier la tâche' : 'Détail de la tâche'}
              </Text>
              <View style={styles.headerActions}>
                {!edition ? (
                  <TouchableOpacity onPress={() => setEdition(true)} hitSlop={8}>
                    <Ionicons name="pencil" size={20} color={colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => { setEdition(false); onClose(); }} hitSlop={8}>
                    <Ionicons name="close" size={24} color={colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {edition ? (
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                  <Text style={[styles.label, { color: colors.textLight }]}>Titre *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                    value={titre}
                    onChangeText={setTitre}
                  />
                  <Text style={[styles.label, { color: colors.textLight }]}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.multiligne, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={[styles.label, { color: colors.textLight }]}>Date</Text>
                  <View style={styles.ligne}>
                    {[{ libelle: "Auj.", v: todayISO() }, { libelle: 'Demain', v: toISO(new Date(new Date().setDate(new Date().getDate() + 1))) }].map((o) => {
                      const actif = dateISO === o.v;
                      return (
                        <TouchableOpacity key={o.v} style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setDateISO(o.v)}>
                          <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>{o.libelle}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity onPress={() => setShowCalendrier((s) => !s)} style={styles.iconeBtn}>
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
                      onChange={(event, selected) => {
                        setShowCalendrier(false);
                        if (event.type === 'set' && selected) setDateISO(toISO(selected));
                      }}
                    />
                  )}

                  <Text style={[styles.label, { color: colors.textLight }]}>Heure du rappel</Text>
                  <TouchableOpacity style={[styles.heureBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => setShowHeure(true)}>
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                    <Text style={[styles.heureTexte, { color: colors.text }]}>
                      {h}:{m}
                    </Text>
                  </TouchableOpacity>

                  <Text style={[styles.label, { color: colors.textLight }]}>Priorité</Text>
                  <View style={styles.wrap}>
                    {[1, 2, 3, 4, 5].map((p) => {
                      const ps = prioriteStyle(p);
                      const actif = priorite === p;
                      return (
                        <TouchableOpacity key={p} style={[styles.prio, { borderColor: actif ? ps.bg : colors.border }]} onPress={() => setPriorite(p)}>
                          <Text style={[styles.prioTexte, { color: actif ? ps.bg : colors.textLight, fontWeight: actif ? '800' : '700' }]}>{p}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: colors.textLight }]}>Catégorie</Text>
                  <View style={styles.wrap}>
                    {CATEGORIES.map((c) => {
                      const actif = categorie === c.id;
                      return (
                        <TouchableOpacity key={c.id} style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setCategorie(c.id)}>
                          <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>
                            {c.emoji} {c.nom}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: colors.textLight }]}>Répétition</Text>
                  <View style={styles.wrap}>
                    {RECURRENCE_NOMS.map((r) => {
                      const actif = recurrence === r.id;
                      return (
                        <TouchableOpacity key={r.id} style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setRecurrence(r.id)}>
                          <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>{r.nom}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: colors.textLight }]}>Cours associé</Text>
                  <View style={styles.wrap}>
                    <TouchableOpacity style={[styles.chip, coursId === null && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setCoursId(null)}>
                      <Text style={[styles.chipTexte, { color: coursId === null ? colors.onPrimary : colors.text }]}>Aucun</Text>
                    </TouchableOpacity>
                    {cours.map((c) => {
                      const actif = coursId === c.id;
                      return (
                        <TouchableOpacity key={c.id} style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setCoursId(c.id)}>
                          <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>{c.matiere}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: colors.textLight }]}>Notes personnelles</Text>
                  <TextInput
                    style={[styles.input, styles.multiligne, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    textAlignVertical="top"
                    placeholder="Idées, ressources, remarques…"
                    placeholderTextColor={colors.placeholder}
                  />

                  <TouchableOpacity style={[styles.bouton, { backgroundColor: colors.primary }]} onPress={sauver} disabled={saving}>
                    <Text style={[styles.boutonTexte, { color: colors.onPrimary }]}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </KeyboardAvoidingView>
            ) : (
              <ScrollView contentContainerStyle={styles.form}>
                <View style={styles.titreLigne}>
                  <Text style={styles.emoji}>{emojiCategorie(todo.categorie || '')}</Text>
                  <Text style={[styles.titre, { color: colors.text }]}>{todo.titre}</Text>
                </View>

                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeTexte, { color: st.fg }]}>Priorité {todo.priorite}</Text>
                  </View>
                  {todo.fait ? (
                    <View style={[styles.badge, { backgroundColor: colors.success }]}>
                      <Text style={[styles.badgeTexte, { color: '#fff' }]}>✓ Terminée</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
                      <Text style={[styles.badgeTexte, { color: colors.primary }]}>En cours</Text>
                    </View>
                  )}
                </View>

                <Ligne label="🗓️ Date" valeur={format(fromISO(todo.date), 'EEEE d MMMM yyyy', { locale: fr })} colors={colors} styles={styles} />
                {todo.heure_pensee ? <Ligne label="🕐 Heure" valeur={todo.heure_pensee} colors={colors} styles={styles} /> : null}
                {todo.categorie ? <Ligne label="🏷️ Catégorie" valeur={nomCategorie(todo.categorie)} colors={colors} styles={styles} /> : null}
                {nomCoursAssocie ? <Ligne label="📚 Cours" valeur={nomCoursAssocie} colors={colors} styles={styles} /> : null}
                {todo.recurrence && todo.recurrence !== 'none' ? (
                  <Ligne label="🔁 Répétition" valeur={RECURRENCE_NOMS.find((r) => r.id === todo.recurrence)?.nom || todo.recurrence} colors={colors} styles={styles} />
                ) : null}
                {todo.description ? <Ligne label="📄 Description" valeur={todo.description} colors={colors} styles={styles} /> : null}
                {todo.notes_personnelles ? <Ligne label="📌 Notes" valeur={todo.notes_personnelles} colors={colors} styles={styles} /> : null}

                <TouchableOpacity style={[styles.bouton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]} onPress={() => setEdition(true)}>
                  <Ionicons name="pencil" size={17} color={colors.primary} />
                  <Text style={[styles.boutonTexte, { color: colors.primary }]}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.supprimer} onPress={onDeleted}>
                  <Text style={[styles.supprimerTexte, { color: colors.danger }]}>Supprimer cette tâche</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>

        <HeurePicker
          visible={showHeure}
          label="Heure du rappel"
          heure={h}
          minute={m}
          onHeure={(nh) => setHeure({ h: nh, m })}
          onMinute={(nm) => setHeure({ h, m: nm })}
          onClose={() => setShowHeure(false)}
        />
      </View>
    </Modal>
  );
}

function Ligne({ label, valeur, colors, styles }: { label: string; valeur: string; colors: ReturnType<typeof useThemeColors>; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={[styles.ligneDetail, { borderBottomColor: colors.border }]}>
      <Text style={[styles.ligneLabel, { color: colors.textLight }]}>{label}</Text>
      <Text style={[styles.ligneValeur, { color: colors.text }]}>{valeur}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '92%', minHeight: 320 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    titreHeader: { fontSize: 17, fontWeight: '800' },
    headerActions: { flexDirection: 'row', gap: 16 },
    form: { padding: SPACING.md, paddingBottom: 44 },
    titreLigne: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    emoji: { fontSize: 24 },
    titre: { flex: 1, fontSize: 20, fontWeight: '800', lineHeight: 26 },
    badges: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
    badge: { borderRadius: RADIUS.pill, paddingHorizontal: 11, paddingVertical: 5 },
    badgeTexte: { fontSize: 12, fontWeight: '800' },
    ligneDetail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
    ligneLabel: { fontSize: 13, fontWeight: '600' },
    ligneValeur: { flex: 1, marginLeft: 16, fontSize: 14, fontWeight: '600', textAlign: 'right' },
    label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 14, marginBottom: 6 },
    input: { borderRadius: RADIUS.md, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, borderWidth: 1, borderColor: colors.border },
    multiligne: { minHeight: 74 },
    ligne: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    chipTexte: { fontSize: 13, fontWeight: '700' },
    iconeBtn: { padding: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    dateTexte: { fontSize: 13, marginTop: 6, textTransform: 'capitalize' },
    heureBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11, alignSelf: 'flex-start' },
    heureTexte: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    prio: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    prioTexte: { fontSize: 15 },
    bouton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 14, marginTop: 20 },
    boutonTexte: { fontSize: 15, fontWeight: '800' },
    supprimer: { alignItems: 'center', paddingVertical: 12, marginTop: 6 },
    supprimerTexte: { fontSize: 14, fontWeight: '700' },
  });
