import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTodosByDate, markTodoAsDone, Todo } from '../services/TodoService';
import { getAllCours, Cours } from '../services/CoursService';
import TodoForm from '../components/todos/TodoForm';
import TodoDetail from '../components/todos/TodoDetail';

export default function TodosScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [cours, setCours] = useState<Cours[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [todosData, coursData] = await Promise.all([
        getTodosByDate(today),
        getAllCours(),
      ]);
      setTodos(todosData);
      setCours(coursData);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkDone = async (id: number) => {
    await markTodoAsDone(id);
    loadData();
  };

  const getPriorityColor = (p: number) => {
    const colors: Record<number, string> = {
      5: '#FF3B30', 4: '#FF9500', 3: '#FFCC00', 2: '#34C759', 1: '#8E8E93',
    };
    return colors[p] || '#8E8E93';
  };

  const getCoursName = (coursId: number | null) => {
    if (!coursId) return null;
    const c = cours.find(co => co.id === coursId);
    return c ? `${c.matiere} (${c.heure_debut})` : null;
  };

  const renderItem = ({ item }: { item: Todo }) => (
    <TouchableOpacity
      style={[styles.card, item.fait === 1 && styles.cardDone]}
      onPress={() => setSelectedTodo(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <TouchableOpacity
          onPress={() => handleMarkDone(item.id)}
          style={[styles.checkbox, item.fait === 1 && styles.checkboxDone]}
        >
          {item.fait === 1 && <Ionicons name="checkmark" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.todoTitle, item.fait === 1 && styles.todoTitleDone]}>
          {item.titre}
        </Text>
        {item.cours_id && (
          <Text style={styles.coursAssocie}>📚 {getCoursName(item.cours_id)}</Text>
        )}
        {item.heure_pensee ? (
          <Text style={styles.heure}>🕐 Pensé à {item.heure_pensee}</Text>
        ) : null}
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priorite) }]}>
          <Text style={styles.priorityText}>P{item.priorite}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 Mes tâches</Text>
        <TouchableOpacity onPress={() => setShowForm(true)}>
          <Ionicons name="add-circle" size={32} color="#4A90D9" />
        </TouchableOpacity>
      </View>

      {todos.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkbox-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyText}>Aucune tâche aujourd'hui</Text>
          <Text style={styles.emptyHint}>Ajoutez une tâche avec le +</Text>
        </View>
      ) : (
        <FlatList
          data={todos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        />
      )}

      <TodoForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onTodoAdded={loadData}
        cours={cours}
      />

      <TodoDetail
        todo={selectedTodo}
        coursName={selectedTodo ? getCoursName(selectedTodo.cours_id) : null}
        onClose={() => setSelectedTodo(null)}
        onUpdate={loadData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 24, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  cardDone: { opacity: 0.5 },
  cardLeft: { marginRight: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: { backgroundColor: '#34C759', borderColor: '#34C759' },
  cardContent: { flex: 1 },
  todoTitle: { fontSize: 15, fontWeight: '600' },
  todoTitleDone: { textDecorationLine: 'line-through', color: '#8E8E93' },
  coursAssocie: { fontSize: 12, color: '#4A90D9', marginTop: 4 },
  heure: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  cardRight: { marginLeft: 8 },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#8E8E93', marginTop: 12 },
  emptyHint: { fontSize: 13, color: '#C7C7CC', marginTop: 4 },
});