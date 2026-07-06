import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Todo } from '../../services/TodoService';

interface Props {
  todo: Todo | null;
  coursName: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TodoDetail({ todo, coursName, onClose }: Props) {
  if (!todo) return null;

  const getPriorityLabel = (p: number) => {
    const labels: Record<number, string> = { 5: 'Très haute', 4: 'Haute', 3: 'Moyenne', 2: 'Basse', 1: 'Très basse' };
    return labels[p] || 'Moyenne';
  };

  return (
    <Modal visible={!!todo} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Détail de la tâche</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.todoTitle}>{todo.titre}</Text>

            {todo.description ? (
              <>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.value}>{todo.description}</Text>
              </>
            ) : null}

            <Text style={styles.label}>Priorité</Text>
            <Text style={styles.value}>{getPriorityLabel(todo.priorite)} ({todo.priorite}/5)</Text>

            {todo.heure_pensee ? (
              <>
                <Text style={styles.label}>Heure pensée</Text>
                <Text style={styles.value}>{todo.heure_pensee}</Text>
              </>
            ) : null}

            {coursName && (
              <>
                <Text style={styles.label}>Cours associé</Text>
                <Text style={styles.value}>📚 {coursName}</Text>
              </>
            )}

            <Text style={styles.label}>Statut</Text>
            <Text style={styles.value}>{todo.fait === 1 ? '✅ Fait' : '⏳ En cours'}</Text>

            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{todo.date}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  title: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingVertical: 14 },
  todoTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginTop: 12, marginBottom: 2 },
  value: { fontSize: 15, color: '#1A1A1A' },
});