import React, { useEffect, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles, useThemeColors } from '../../context/ThemeContext';
import { addCours, updateCours, verifierConflitCours, type Cours } from '../../services/CoursService';
import { syncNotifications } from '../../services/AlarmeService';
import { JOURS } from '../../constants/jour';
import { RADIUS, SPACING } from '../../constants/theme';
import HeurePicker from '../ui/HeurePicker';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingCours?: Cours | null;
}

function enMinutes(h: string, m: string): number {
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}
function enHHMM(total: number): { h: string; m: string } {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return { h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0') };
}

const DUREE_PAR_DEFAUT = 2 * 60;

export default function CoursForm({ visible, onClose, onSaved, editingCours }: Props) {
  const colors = useThemeColors();
  const styles = useAppStyles(createStyles);

  const [jour, setJour] = useState<(typeof JOURS)[number]>('Lundi');
  const [matiere, setMatiere] = useState('');
  const [salle, setSalle] = useState('');
  const [professeur, setProfesseur] = useState('');
  const [debutMin, setDebutMin] = useState(8 * 60);
  const [finMin, setFinMin] = useState(10 * 60);
  // Dès que l'utilisateur ajuste la fin manuellement, l'auto-report cesse.
  const finManuelle = useRef(false);
  const [picker, setPicker] = useState<'debut' | 'fin' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editingCours) {
      setJour(editingCours.jour as (typeof JOURS)[number]);
      setMatiere(editingCours.matiere);
      setSalle(editingCours.salle);
      setProfesseur(editingCours.professeur || '');
      const [hd, hdM] = editingCours.heure_debut.split(':');
      const [hf, hfM] = editingCours.heure_fin.split(':');
      setDebutMin(enMinutes(hd, hdM));
      setFinMin(enMinutes(hf, hfM));
      finManuelle.current = true;
    } else {
      setJour('Lundi');
      setMatiere('');
      setSalle('');
      setProfesseur('');
      setDebutMin(8 * 60);
      setFinMin(10 * 60);
      finManuelle.current = false;
    }
    setPicker(null);
    setSaving(false);
  }, [visible, editingCours]);

  const changerDebut = (minutes: number) => {
    const borné = Math.max(0, Math.min(24 * 60 - 15, minutes));
    setDebutMin(borné);
    if (!finManuelle.current) {
      const duree = finMin - debutMin > 0 ? finMin - debutMin : DUREE_PAR_DEFAUT;
      setFinMin(Math.min(24 * 60, borné + duree));
    }
  };

  const changerFin = (minutes: number) => {
    finManuelle.current = true;
    setFinMin(Math.min(24 * 60, minutes));
  };

  const validerEtSauver = async (forcer: boolean) => {
    if (!matiere.trim() || !salle.trim()) {
      Alert.alert('Champs requis', 'La matière et la salle sont obligatoires.');
      return;
    }
    if (finMin <= debutMin) {
      Alert.alert('Horaires invalides', "L'heure de fin doit être postérieure à l'heure de début.");
      return;
    }
    const saisie = {
      jour,
      heure_debut: `${enHHMM(debutMin).h}:${enHHMM(debutMin).m}`,
      heure_fin: `${enHHMM(finMin).h}:${enHHMM(finMin).m}`,
      matiere: matiere.trim(),
      salle: salle.trim(),
      professeur: professeur.trim(),
    };

    if (!forcer) {
      const conflit = await verifierConflitCours(saisie, editingCours?.id);
      if (conflit) {
        Alert.alert(
          'Créneau en conflit',
          `Un autre cours occupe déjà le ${jour} sur ce créneau. Ajouter quand même ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Ajouter quand même', style: 'destructive', onPress: () => validerEtSauver(true) },
          ],
        );
        return;
      }
    }

    setSaving(true);
    try {
      if (editingCours) {
        await updateCours(editingCours.id, saisie);
      } else {
        await addCours(saisie);
      }
      // Recalcule alarmes + rappels (jour et horaires peuvent avoir changé).
      await syncNotifications().catch(() => {});
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Enregistrement impossible', err instanceof Error ? err.message : 'Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const { h: dh, m: dm } = enHHMM(debutMin);
  const { h: fh, m: fm } = enHHMM(finMin);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.textLight} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {editingCours ? 'Modifier le cours' : 'Nouveau cours'}
          </Text>
          <TouchableOpacity onPress={() => validerEtSauver(false)} disabled={saving} hitSlop={10}>
            <Text style={[styles.save, { color: colors.primary, opacity: saving ? 0.5 : 1 }]}>
              {saving ? '…' : 'Enregistrer'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.label, { color: colors.textLight }]}>Jour</Text>
          <View style={styles.jours}>
            {JOURS.map((j) => {
              const actif = jour === j;
              return (
                <TouchableOpacity
                  key={j}
                  style={[styles.chip, actif && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setJour(j)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipTexte, { color: actif ? colors.onPrimary : colors.text }]}>
                    {j.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.textLight }]}>Matière *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={matiere}
            onChangeText={setMatiere}
            placeholder="Ex : Mathématiques"
            placeholderTextColor={colors.placeholder}
            returnKeyType="next"
          />

          <Text style={[styles.label, { color: colors.textLight }]}>Salle *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={salle}
            onChangeText={setSalle}
            placeholder="Ex : Amphi A"
            placeholderTextColor={colors.placeholder}
          />

          <Text style={[styles.label, { color: colors.textLight }]}>Professeur (optionnel)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={professeur}
            onChangeText={setProfesseur}
            placeholder="Ex : M. Dupont"
            placeholderTextColor={colors.placeholder}
          />

          <View style={styles.heuresLigne}>
            <View style={styles.heuresBloc}>
              <Text style={[styles.label, { color: colors.textLight }]}>Début</Text>
              <TouchableOpacity
                style={[styles.heureBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setPicker('debut')}
              >
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.heureTexte, { color: colors.text }]}>
                  {dh}:{dm}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.heuresBloc}>
              <Text style={[styles.label, { color: colors.textLight }]}>Fin</Text>
              <TouchableOpacity
                style={[styles.heureBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setPicker('fin')}
              >
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.heureTexte, { color: colors.text }]}>
                  {fh}:{fm}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.info, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="notifications-outline" size={16} color={colors.primary} />
            <Text style={[styles.infoTexte, { color: colors.primary }]}>
              Une alarme « départ » sera automatiquement planifiée pour chaque occurrence de ce cours.
            </Text>
          </View>
        </ScrollView>

        <HeurePicker
          visible={picker === 'debut'}
          label="Heure de début"
          heure={dh}
          minute={dm}
          onHeure={(h) => changerDebut(Number(h) * 60 + (Number(dm) || 0))}
          onMinute={(m) => changerDebut((Number(dh) || 0) * 60 + Number(m))}
          onClose={() => setPicker(null)}
        />
        <HeurePicker
          visible={picker === 'fin'}
          label="Heure de fin"
          heure={fh}
          minute={fm}
          onHeure={(h) => changerFin(Number(h) * 60 + (Number(fm) || 0))}
          onMinute={(m) => changerFin((Number(fh) || 0) * 60 + Number(m))}
          onClose={() => setPicker(null)}
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
    label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 14, marginBottom: 6 },
    jours: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipTexte: { fontSize: 13, fontWeight: '700' },
    input: {
      borderRadius: RADIUS.md,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    heuresLigne: { flexDirection: 'row', gap: 12, marginTop: 4 },
    heuresBloc: { flex: 1 },
    heureBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 13,
    },
    heureTexte: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
    info: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: RADIUS.md,
      padding: 12,
      marginTop: 18,
    },
    infoTexte: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  });
