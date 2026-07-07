import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Todo, updateTodo } from '../../services/TodoService';
import { Cours } from '../../services/CoursService';

interface Props {
  todo: Todo | null;
  coursName: string | null;
  onClose: () => void;
  onUpdate: () => void;
  cours: Cours[];
}

export default function TodoDetail({ todo, coursName, onClose, onUpdate, cours }: Props) {
  const [editing, setEditing] = useState(false);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState(3);
  const [coursId, setCoursId] = useState<number | null>(null);

  useEffect(() => {
    if (todo) {
      setTitre(todo.titre);
      setDescription(todo.description || '');
      setPriorite(todo.priorite);
      setCoursId(todo.cours_id);
      setEditing(false);
    }
  }, [todo]);

  if (!todo) return null;

  const handleSave = async () => {
    await updateTodo(todo.id, { titre, description, priorite, cours_id: coursId });
    onUpdate();
    setEditing(false);
    Alert.alert('✅', 'Tâche mise à jour !');
  };

  return (
    <Modal visible={!!todo} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{editing ? 'Modifier' : 'Détail'}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {editing ? (
                <TouchableOpacity onPress={handleSave}><Text style={{ color: '#34C759', fontWeight: '700' }}>Sauver</Text></TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setEditing(true)}><Ionicons name="pencil" size={20} color="#4A90D9" /></TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#1A1A1A" /></TouchableOpacity>
            </View>
          </View>
          <ScrollView style={{ padding: 16 }}>
            {editing ? (
              <>
                <Text style={styles.label}>Titre</Text>
                <TextInput style={styles.input} value={titre} onChangeText={setTitre} />
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: 80 }]} value={description} onChangeText={setDescription} multiline />
                <Text style={styles.label}>Priorité</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[1,2,3,4,5].map(p => (
                    <TouchableOpacity key={p} style={[styles.prioBtn, priorite===p && { backgroundColor: '#4A90D9' }]} onPress={() => setPriorite(p)}>
                      <Text style={{ color: priorite===p ? '#fff' : '#1A1A1A', fontWeight: '700' }}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>Cours associé</Text>
                <ScrollView horizontal>
                  <TouchableOpacity style={[styles.coursBtn, coursId===null && { backgroundColor: '#4A90D9' }]} onPress={() => setCoursId(null)}>
                    <Text style={{ color: coursId===null ? '#fff' : '#1A1A1A' }}>Aucun</Text>
                  </TouchableOpacity>
                  {cours.map(c => (
                    <TouchableOpacity key={c.id} style={[styles.coursBtn, coursId===c.id && { backgroundColor: '#4A90D9' }]} onPress={() => setCoursId(c.id)}>
                      <Text style={{ color: coursId===c.id ? '#fff' : '#1A1A1A' }}>{c.matiere}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={styles.todoTitle}>{todo.titre}</Text>
                {todo.description ? <><Text style={styles.label}>Description</Text><Text>{todo.description}</Text></> : null}
                <Text style={styles.label}>Priorité</Text><Text>P{todo.priorite}</Text>
                {coursName && <><Text style={styles.label}>Cours</Text><Text>📚 {coursName}</Text></>}
                {todo.heure_pensee && <><Text style={styles.label}>Heure pensée</Text><Text>{todo.heure_pensee}</Text></>}
                <Text style={styles.label}>Statut</Text><Text>{todo.fait ? '✅ Fait' : '⏳ En cours'}</Text>
              </>
            )}
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
  todoTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#E5E5EA' },
  prioBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  coursBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F5F7FA', marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
});