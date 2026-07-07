import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getAllTodos,
  markTodoAsDone,
  deleteTodo,
  Todo,
} from "../services/TodoService";
import { getAllCours, Cours } from "../services/CoursService";
import TodoForm from "../components/todos/TodoForm";
import TodoDetail from "../components/todos/TodoDetail";

export default function TodosScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [cours, setCours] = useState<Cours[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const today = new Date().toISOString().split("T")[0];
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [todosData, coursData] = await Promise.all([
        getAllTodos(),
        getAllCours(),
      ]);
      setTodos(todosData);
      setCours(coursData);
    } catch (error) {
      console.error("Erreur:", error);
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

  const handleDelete = (id: number, titre: string) => {
    Alert.alert("Supprimer", `Supprimer "${titre}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await deleteTodo(id);
          loadData();
        },
      },
    ]);
  };

  const getPriorityColor = (p: number) =>
    ({ 5: "#FF3B30", 4: "#FF9500", 3: "#FFCC00", 2: "#34C759", 1: "#8E8E93" })[
      p
    ] || "#8E8E93";
  const getCoursName = (cid: number | null) => {
    const c = cours.find((x) => x.id === cid);
    return c ? `${c.matiere} (${c.heure_debut})` : null;
  };

  const renderItem = ({ item }: { item: Todo }) => (
    <TouchableOpacity
      style={[styles.card, item.fait === 1 && { opacity: 0.5 }]}
      onPress={() => setSelectedTodo(item)}
      onLongPress={() => handleDelete(item.id, item.titre)}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        onPress={() => handleMarkDone(item.id)}
        style={[styles.checkbox, item.fait === 1 && styles.checkboxDone]}
      >
        {item.fait === 1 && (
          <Ionicons name="checkmark" size={16} color="#fff" />
        )}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.todoTitle,
            item.fait === 1 && {
              textDecorationLine: "line-through",
              color: "#8E8E93",
            },
          ]}
        >
          {item.titre}
        </Text>
        {item.cours_id && (
          <Text style={{ fontSize: 12, color: "#4A90D9" }}>
            📚 {getCoursName(item.cours_id)}
          </Text>
        )}
        {item.heure_pensee && (
          <Text style={{ fontSize: 11, color: "#8E8E93" }}>
            🕐 {item.heure_pensee}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.priorityBadge,
          { backgroundColor: getPriorityColor(item.priorite) },
        ]}
      >
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
          P{item.priorite}
        </Text>
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

  const filteredTodos = searchQuery.trim()
    ? todos.filter(
        (todo) =>
          todo.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (todo.description &&
            todo.description.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    : todos;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 Mes tâches</Text>
        <TouchableOpacity onPress={() => setShowForm(true)}>
          <Ionicons name="add-circle" size={32} color="#4A90D9" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#8E8E93"
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher une tâche..."
          placeholderTextColor="#C7C7CC"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filteredTodos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
      />
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
        cours={cours}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 24, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#C7C7CC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxDone: { backgroundColor: "#34C759", borderColor: "#34C759" },
  todoTitle: { fontSize: 15, fontWeight: "600" },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    color: "#1A1A1A",
  },
});
