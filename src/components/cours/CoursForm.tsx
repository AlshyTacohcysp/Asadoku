import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { JOURS } from '../../constants/jour';
import { addCours } from '../../services/CoursService';

interface CoursFormProps {
  visible: boolean;
  onClose: () => void;
  onCoursAdded: () => void;
}

export default function CoursForm({ visible, onClose, onCoursAdded }: CoursFormProps) {
  const [jour, setJour] = useState('Lundi');
  const [heureDebut, setHeureDebut] = useState('08:00');
  const [heureFin, setHeureFin] = useState('10:00');
  const [matiere, setMatiere] = useState('');
  const [salle, setSalle] = useState('');
  const [professeur, setProfesseur] = useState('');

  const handleSubmit = async () => {
    // Validation simple
    if (!matiere.trim()) {
      Alert.alert('Erreur', 'Le nom de la matière est obligatoire');
      return;
    }
    if (!salle.trim()) {
      Alert.alert('Erreur', 'La salle est obligatoire');
      return;
    }

    try {
      await addCours({
        jour,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        matiere: matiere.trim(),
        salle: salle.trim(),
        professeur: professeur.trim(),
      });

      // Réinitialiser le formulaire
      setMatiere('');
      setSalle('');
      setProfesseur('');
      setHeureDebut('08:00');
      setHeureFin('10:00');
      setJour('Lundi');

      onCoursAdded();
      onClose();
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'ajouter le cours");
      console.error(error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Nouveau cours</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.saveButton}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          {/* Jour */}
          <Text style={styles.label}>Jour</Text>
          <View style={styles.joursContainer}>
            {JOURS.map((j) => (
              <TouchableOpacity
                key={j}
                style={[styles.jourButton, jour === j && styles.jourButtonActive]}
                onPress={() => setJour(j)}
              >
                <Text style={[styles.jourText, jour === j && styles.jourTextActive]}>
                  {j.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Matière */}
          <Text style={styles.label}>Matière *</Text>
          <TextInput
            style={styles.input}
            value={matiere}
            onChangeText={setMatiere}
            placeholder="Ex: Mathématiques"
            placeholderTextColor={COLORS.grey}
          />

          {/* Salle */}
          <Text style={styles.label}>Salle *</Text>
          <TextInput
            style={styles.input}
            value={salle}
            onChangeText={setSalle}
            placeholder="Ex: Amphi A"
            placeholderTextColor={COLORS.grey}
          />

          {/* Professeur */}
          <Text style={styles.label}>Professeur</Text>
          <TextInput
            style={styles.input}
            value={professeur}
            onChangeText={setProfesseur}
            placeholder="Ex: M. Dupont"
            placeholderTextColor={COLORS.grey}
          />

          {/* Heure début */}
          <Text style={styles.label}>Heure de début</Text>
          <TextInput
            style={styles.input}
            value={heureDebut}
            onChangeText={setHeureDebut}
            placeholder="HH:MM"
            placeholderTextColor={COLORS.grey}
            keyboardType="numbers-and-punctuation"
          />

          {/* Heure fin */}
          <Text style={styles.label}>Heure de fin</Text>
          <TextInput
            style={styles.input}
            value={heureFin}
            onChangeText={setHeureFin}
            placeholder="HH:MM"
            placeholderTextColor={COLORS.grey}
            keyboardType="numbers-and-punctuation"
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveButton: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  form: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.grey,
  },
  joursContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  jourButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.grey,
  },
  jourButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  jourText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  jourTextActive: {
    color: COLORS.surface,
  },
});