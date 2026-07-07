import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addTodo } from "../../services/TodoService";
import { Cours } from "../../services/CoursService";
import { scheduleTodoAlarm } from "../../services/AlarmeService";

interface Props {
  visible: boolean;
  onClose: () => void;
  onTodoAdded: () => void;
  cours: Cours[];
}

const HEURES = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];
const CATEGORIES = [
  "📚 Cours",
  "🏠 Maison",
  "💼 Pro",
  "🎯 Objectif",
  "📝 Divers",
];
const RECURRENCES = [
  { id: "none", nom: "Aucune" },
  { id: "daily", nom: "Quotidien" },
  { id: "weekly", nom: "Hebdo" },
  { id: "monthly", nom: "Mensuel" },
];

export default function TodoForm({
  visible,
  onClose,
  onTodoAdded,
  cours,
}: Props) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [heureH, setHeureH] = useState("08");
  const [heureM, setHeureM] = useState("00");
  const [priorite, setPriorite] = useState(3);
  const [coursId, setCoursId] = useState<number | null>(null);
  const [categorie, setCategorie] = useState("📝 Divers");
  const [recurrence, setRecurrence] = useState("none");
  const [showHeure, setShowHeure] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async () => {
    if (!titre.trim()) {
      Alert.alert("Erreur", "Le titre est obligatoire");
      return;
    }
    try {
      await addTodo({
        titre: titre.trim(),
        description: description.trim(),
        date: today,
        heure_pensee: `${heureH}:${heureM}`,
        priorite,
        categorie: categorie,
        cours_id: coursId,
        recurrence: recurrence,
      });
      setTitre("");
      setDescription("");
      setHeureH("08");
      setHeureM("00");
      setPriorite(3);
      setCoursId(null);
      setCategorie("📝 Divers");
      setRecurrence("none");
      onTodoAdded();
      onClose();
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible d'ajouter");
    }
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Nouvelle tâche</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.save}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {/* Formulaire */}
        <ScrollView style={styles.form}>
          {/* Catégorie */}
          <Text style={styles.label}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.tagBtn,
                  categorie === cat && styles.tagBtnActive,
                ]}
                onPress={() => setCategorie(cat)}
              >
                <Text
                  style={[
                    styles.tagBtnText,
                    categorie === cat && styles.tagBtnTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Titre */}
          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={styles.input}
            value={titre}
            onChangeText={setTitre}
            placeholder="Ex: Réviser le chapitre 3"
            placeholderTextColor="#C7C7CC"
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Détails..."
            placeholderTextColor="#C7C7CC"
            multiline
          />

          {/* Heure pensée */}
          <Text style={styles.label}>Heure pensée</Text>
          <TouchableOpacity
            style={styles.heureBtn}
            onPress={() => setShowHeure(true)}
          >
            <Ionicons name="time-outline" size={20} color="#4A90D9" />
            <Text style={styles.heureText}>
              {heureH}:{heureM}
            </Text>
          </TouchableOpacity>

          {/* Priorité */}
          <Text style={styles.label}>Priorité : {priorite}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            {[1, 2, 3, 4, 5].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.prioBtn, priorite === p && styles.prioBtnActive]}
                onPress={() => setPriorite(p)}
              >
                <Text
                  style={[
                    styles.prioText,
                    priorite === p && styles.prioTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Répétition */}
          <Text style={styles.label}>Répétition</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            {RECURRENCES.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.tagBtn,
                  recurrence === r.id && styles.tagBtnActive,
                ]}
                onPress={() => setRecurrence(r.id)}
              >
                <Text
                  style={[
                    styles.tagBtnText,
                    recurrence === r.id && styles.tagBtnTextActive,
                  ]}
                >
                  {r.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cours associé */}
          <Text style={styles.label}>Associer à un cours</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.tagBtn, coursId === null && styles.tagBtnActive]}
              onPress={() => setCoursId(null)}
            >
              <Text
                style={[
                  styles.tagBtnText,
                  coursId === null && styles.tagBtnTextActive,
                ]}
              >
                Aucun
              </Text>
            </TouchableOpacity>
            {cours.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.tagBtn, coursId === c.id && styles.tagBtnActive]}
                onPress={() => setCoursId(c.id)}
              >
                <Text
                  style={[
                    styles.tagBtnText,
                    coursId === c.id && styles.tagBtnTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {c.matiere}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ScrollView>

        {/* Picker d'heure */}
        {showHeure && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Heure pensée</Text>
                <TouchableOpacity onPress={() => setShowHeure(false)}>
                  <Text
                    style={{
                      color: "#4A90D9",
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    OK
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", height: 200 }}>
                <ScrollView style={{ flex: 1 }}>
                  {HEURES.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.pickerItem,
                        heureH === h && styles.pickerItemActive,
                      ]}
                      onPress={() => setHeureH(h)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          heureH === h && styles.pickerItemTextActive,
                        ]}
                      >
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    alignSelf: "center",
                    marginHorizontal: 4,
                  }}
                >
                  :
                </Text>
                <ScrollView style={{ flex: 1 }}>
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.pickerItem,
                        heureM === m && styles.pickerItemActive,
                      ]}
                      onPress={() => setHeureM(m)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          heureM === m && styles.pickerItemTextActive,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  title: { fontSize: 18, fontWeight: "700" },
  save: { fontSize: 16, fontWeight: "700", color: "#4A90D9" },
  form: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 4,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    color: "#1A1A1A",
  },
  heureBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    gap: 10,
  },
  heureText: { fontSize: 16, color: "#1A1A1A", fontWeight: "600" },
  prioBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  prioBtnActive: { backgroundColor: "#4A90D9" },
  prioText: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  prioTextActive: { color: "#fff" },
  tagBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  tagBtnActive: { backgroundColor: "#4A90D9" },
  tagBtnText: { fontSize: 13, color: "#1A1A1A" },
  tagBtnTextActive: { color: "#fff" },
  pickerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  pickerTitle: { fontSize: 16, fontWeight: "700" },
  pickerItem: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 8,
  },
  pickerItemActive: { backgroundColor: "#E8F0FE" },
  pickerItemText: { fontSize: 18, color: "#1A1A1A" },
  pickerItemTextActive: { color: "#4A90D9", fontWeight: "700" },
});
