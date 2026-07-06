import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Modal, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addTodo } from '../../services/TodoService';
import { Cours } from '../../services/CoursService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onTodoAdded: () => void;
  cours: Cours[];
}

export default function TodoForm({ visible, onClose, onTodoAdded, cours }: Props) {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [heurePensee, setHeurePensee] = useState('');
  const [priorite, setPriorite] = useState(3);
  const [coursId, setCoursId] = useState<number | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async () => {
    if (!titre.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }
    try {
      await addTodo({
        titre: titre.trim(),
        description: description.trim(),
        date: today,
        heure_pensee: heurePensee,
        priorite,
        categorie: '',
        cours_id: coursId,
      });
      setTitre('');
      setDescription('');
      setHeurePensee('');
      setPriorite(3);
      setCoursId(null);
      onTodoAdded();
      onClose();
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'ajouter la tâche");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Nouvelle tâche</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.save}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          <Text style={styles.label}>Titre *</Text>
          <TextInput style={styles.input} value={titre} onChangeText={setTitre} placeholder="Ex: Réviser le chapitre 3" placeholderTextColor="#C7C7CC" />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="Détails..." placeholderTextColor="#C7C7CC" multiline numberOfLines={3} />

          <Text style={styles.label}>Heure pensée</Text>
          <TextInput style={styles.input} value={heurePensee} onChangeText={setHeurePensee} placeholder="HH:MM" placeholderTextColor="#C7C7CC" keyboardType="numbers-and-punctuation" />

          <Text style={styles.label}>Priorité : {priorite}</Text>
          <View style={styles.priorityRow}>
            {[1, 2, 3, 4, 5].map(p => (
              <TouchableOpacity key={p} style={[styles.prioBtn, priorite === p && { backgroundColor: '#4A90D9' }]} onPress={() => setPriorite(p)}>
                <Text style={[styles.prioText, priorite === p && { color: '#fff' }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Associer à un cours</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.coursList}>
            <TouchableOpacity style={[styles.coursBtn, coursId === null && { backgroundColor: '#4A90D9' }]} onPress={() => setCoursId(null)}>
              <Text style={[styles.coursBtnText, coursId === null && { color: '#fff' }]}>Aucun</Text>
            </TouchableOpacity>
            {cours.map(c => (
              <TouchableOpacity key={c.id} style={[styles.coursBtn, coursId === c.id && { backgroundColor: '#4A90D9' }]} onPress={() => setCoursId(c.id)}>
                <Text style={[styles.coursBtnText, coursId === c.id && { color: '#fff' }]} numberOfLines={1}>{c.matiere}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  title: { fontSize: 18, fontWeight: '700' },
  save: { fontSize: 16, fontWeight: '700', color: '#4A90D9' },
  form: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 4, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: '#E5E5EA', color: '#1A1A1A' },
  textarea: { height: 80, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  prioBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  prioText: { fontSize: 16, fontWeight: '700' },
  coursList: { marginTop: 4 },
  coursBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  coursBtnText: { fontSize: 13, color: '#1A1A1A' },
});