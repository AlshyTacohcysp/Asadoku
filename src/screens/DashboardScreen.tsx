import React, { useEffect, useState } from "react";

import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants/theme";
import { getCoursByJour, Cours } from "../services/CoursService";
import { getTodosByDate, Todo } from "../services/TodoService";
import ChronometreTrajet from "../components/trajet/ChronoTerTrajet";
import { saveTrajet, getMoyenneTrajet } from "../services/TrajetService";

function getPriorityColor(priorite: number): string {
  const colors: Record<number, string> = {
    5: "#FF3B30",
    4: "#FF9500",
    3: "#FFCC00",
    2: "#34C759",
    1: "#8E8E93",
  };
  return colors[priorite] || "#8E8E93";
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [coursDuJour, setCoursDuJour] = useState<Cours[]>([]);
  const [coursDemain, setCoursDemain] = useState<Cours[]>([]);
  const [todosDuJour, setTodosDuJour] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChrono, setShowChrono] = useState(false);
  const [moyenneTrajet, setMoyenneTrajet] = useState(0);

  const aujourdhui = new Date();
  const dateTexte = aujourdhui.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const joursFrancais = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  const jourActuel = joursFrancais[aujourdhui.getDay()];
  const dateISO = aujourdhui.toISOString().split("T")[0];

  useEffect(() => {
    async function loadData() {
      try {
        const [cours, todos, moyenne] = await Promise.all([
          getCoursByJour(jourActuel),
          getTodosByDate(dateISO),
          getMoyenneTrajet(),
        ]);
        const demain = new Date();
        demain.setDate(demain.getDate() + 1);
        const jourDemain = joursFrancais[demain.getDay()];
        const coursDemainData = await getCoursByJour(jourDemain);
        setCoursDuJour(cours);
        setCoursDemain(coursDemainData);
        setTodosDuJour(todos);
        setMoyenneTrajet(Math.round(moyenne));
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function refreshMoyenne() {
      const m = await getMoyenneTrajet();
      setMoyenneTrajet(Math.round(m));
    }
    refreshMoyenne();
  }, [showChrono]);

  const heureActuelle = aujourdhui.getHours() * 60 + aujourdhui.getMinutes();
  const prochainCours = coursDuJour.find((c) => {
    const [h, m] = c.heure_debut.split(":").map(Number);
    return h * 60 + m > heureActuelle;
  });

  const todosAffiches = todosDuJour.slice(0, 3);

  const handleAlarmeSecours = async () => {
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);
    const jourDemain = joursFrancais[demain.getDay()];
    const coursDemainData = await getCoursByJour(jourDemain);
    if (coursDemainData.length === 0) {
      Alert.alert("Pas de cours demain", "Profitez de votre journee !");
      return;
    }
    const premier = coursDemainData[0];
    const [h, m] = premier.heure_debut.split(":").map(Number);
    let ah = h,
      am = m - 30;
    if (am < 0) {
      ah -= 1;
      am += 60;
    }
    if (Platform.OS === "android") {
      try {
        const { startActivityAsync } = require("expo-intent-launcher");
        await startActivityAsync("android.intent.action.SET_ALARM", {
          extra: {
            "android.intent.extra.alarm.HOUR": ah,
            "android.intent.extra.alarm.MINUTES": am,
            "android.intent.extra.alarm.MESSAGE": `Depart pour ${premier.matiere}`,
          },
        });
      } catch {
        Alert.alert(
          "Alarme",
          `Reglez votre alarme a ${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")} pour ${premier.matiere}.`,
        );
      }
    } else {
      Alert.alert(
        "Alarme",
        `Reglez votre alarme a ${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")} pour ${premier.matiere}.`,
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#4A90D9"
          style={{ marginTop: 100 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.date}>{dateTexte}</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📚 Prochain cours</Text>
            {prochainCours ? (
              <View>
                <Text style={styles.matiere}>{prochainCours.matiere}</Text>
                <Text style={styles.detail}>
                  🕐 {prochainCours.heure_debut} - {prochainCours.heure_fin}
                </Text>
                <Text style={styles.detail}>📍 {prochainCours.salle}</Text>
                <Text style={styles.detail}>👨‍🏫 {prochainCours.professeur}</Text>
              </View>
            ) : coursDuJour.length > 0 ? (
              <Text style={styles.emptyText}>Plus de cours aujourd'hui 🎉</Text>
            ) : (
              <Text style={styles.emptyText}>Aucun cours aujourd'hui</Text>
            )}
          </View>

          {coursDemain.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 Demain</Text>
              {coursDemain.slice(0, 2).map((c) => (
                <View key={c.id} style={{ marginBottom: 8 }}>
                  <Text style={styles.matiere}>{c.matiere}</Text>
                  <Text style={styles.detail}>
                    🕐 {c.heure_debut} - {c.heure_fin} 📍 {c.salle}
                  </Text>
                </View>
              ))}
              {coursDemain.length > 2 && (
                <Text style={styles.moreText}>
                  +{coursDemain.length - 2} autres cours
                </Text>
              )}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 À faire aujourd'hui</Text>
            {todosAffiches.length > 0 ? (
              todosAffiches.map((todo) => (
                <View key={todo.id} style={styles.todoItem}>
                  <View style={styles.todoHeader}>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: getPriorityColor(todo.priorite) },
                      ]}
                    >
                      <Text style={styles.priorityText}>P{todo.priorite}</Text>
                    </View>
                    <Text style={styles.todoTitle} numberOfLines={1}>
                      {todo.titre}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Aucune tâche</Text>
            )}
            {todosDuJour.length > 3 && (
              <Text style={styles.moreText}>
                +{todosDuJour.length - 3} autres tâches
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowChrono(true)}
            >
              <Text style={styles.actionText}>🚶 Trajet</Text>
              {moyenneTrajet > 0 && (
                <Text style={styles.actionSubtext}>
                  ~{Math.round(moyenneTrajet / 60)} min
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => navigation.navigate("Étude")}
            >
              <Text style={[styles.actionText, styles.actionTextWhite]}>
                ⏱️ Révision
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.alarmeSecours}
            onPress={handleAlarmeSecours}
          >
            <Text style={styles.alarmeText}>⏰ Definir alarme systeme</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showChrono} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700" }}>
              🚶 Chronometre trajet
            </Text>
            <TouchableOpacity onPress={() => setShowChrono(false)}>
              <Text
                style={{ fontSize: 16, color: "#4A90D9", fontWeight: "600" }}
              >
                Fermer
              </Text>
            </TouchableOpacity>
          </View>
          <ChronometreTrajet
            onTrajetEnd={async (duree: number) => {
              const now = new Date().toISOString();
              await saveTrajet({
                depart: new Date(Date.now() - duree * 1000).toISOString(),
                arrivee: now,
                duree_secondes: duree,
                jour_semaine: joursFrancais[new Date().getDay()],
                moyen_transport: "pied",
              });
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  date: { fontSize: 16, color: "#8E8E93", textTransform: "capitalize" },
  content: { paddingHorizontal: 16, paddingBottom: 30 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  matiere: { fontSize: 16, fontWeight: "700", color: "#4A90D9" },
  detail: { fontSize: 14, color: "#8E8E93" },
  todoItem: { marginBottom: 8 },
  todoHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  priorityText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  todoTitle: { flex: 1, fontSize: 14, color: "#1A1A1A" },
  emptyText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 16,
  },
  moreText: {
    fontSize: 12,
    color: "#4A90D9",
    textAlign: "center",
    marginTop: 8,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  actionButtonPrimary: { backgroundColor: "#4A90D9", borderColor: "#4A90D9" },
  actionText: { fontSize: 14, color: "#1A1A1A", fontWeight: "600" },
  actionTextWhite: { color: "#fff" },
  actionSubtext: { fontSize: 11, color: "#8E8E93", marginTop: 2 },
  alarmeSecours: {
    backgroundColor: "#34C759",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  alarmeText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
