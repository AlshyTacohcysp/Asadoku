import React, { useState, useEffect } from "react";
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
import { addCours, updateCours, Cours } from "../../services/CoursService";
import { JOURS } from "../../constants/jour";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCoursAdded: () => void;
  editingCours?: Cours | null;
}

const HEURES = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

export default function CoursForm({
  visible,
  onClose,
  onCoursAdded,
  editingCours,
}: Props) {
  const [jour, setJour] = useState("Lundi");
  const [heureDebutH, setHeureDebutH] = useState("08");
  const [heureDebutM, setHeureDebutM] = useState("00");
  const [heureFinH, setHeureFinH] = useState("10");
  const [heureFinM, setHeureFinM] = useState("00");
  const [matiere, setMatiere] = useState("");
  const [salle, setSalle] = useState("");
  const [professeur, setProfesseur] = useState("");
  const [showHeureDebut, setShowHeureDebut] = useState(false);
  const [showHeureFin, setShowHeureFin] = useState(false);

  useEffect(() => {
    if (editingCours) {
      setJour(editingCours.jour);
      const [hdH, hdM] = editingCours.heure_debut.split(":");
      const [hfH, hfM] = editingCours.heure_fin.split(":");
      setHeureDebutH(hdH);
      setHeureDebutM(hdM);
      setHeureFinH(hfH);
      setHeureFinM(hfM);
      setMatiere(editingCours.matiere);
      setSalle(editingCours.salle);
      setProfesseur(editingCours.professeur || "");
    } else {
      setJour("Lundi");
      setHeureDebutH("08");
      setHeureDebutM("00");
      setHeureFinH("10");
      setHeureFinM("00");
      setMatiere("");
      setSalle("");
      setProfesseur("");
    }
  }, [editingCours]);

  const handleHeureDebutChange = (h: string) => {
    setHeureDebutH(h);
    // Auto +2h pour la fin
    const finH = (parseInt(h) + 2) % 24;
    setHeureFinH(String(finH).padStart(2, "0"));
  };

  const handleSubmit = async () => {
    if (!matiere.trim() || !salle.trim()) {
      Alert.alert("Erreur", "Matière et salle obligatoires");
      return;
    }
    try {
      const data = {
        jour,
        heure_debut: `${heureDebutH}:${heureDebutM}`,
        heure_fin: `${heureFinH}:${heureFinM}`,
        matiere: matiere.trim(),
        salle: salle.trim(),
        professeur: professeur.trim(),
      };
      if (editingCours) {
        await updateCours(editingCours.id, data);
      } else {
        await addCours(data);
      }
      onCoursAdded();
      onClose();
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'enregistrer");
    }
  };

  const HeurePicker = ({
    visible,
    heure,
    minute,
    onHeure,
    onMinute,
    onClose,
    label,
  }: any) => {
    if (!visible) return null;
    return (
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{label}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text
                style={{ color: "#4A90D9", fontWeight: "700", fontSize: 16 }}
              >
                OK
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", height: 200 }}>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {HEURES.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.pickerItem,
                    heure === h && styles.pickerItemActive,
                  ]}
                  onPress={() => onHeure(h)}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      heure === h && styles.pickerItemTextActive,
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
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {MINUTES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.pickerItem,
                    minute === m && styles.pickerItemActive,
                  ]}
                  onPress={() => onMinute(m)}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      minute === m && styles.pickerItemTextActive,
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
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {editingCours ? "Modifier" : "Nouveau cours"}
          </Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.save}>
              {editingCours ? "Modifier" : "Ajouter"}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.form}>
          <Text style={styles.label}>Jour</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {JOURS.map((j) => (
              <TouchableOpacity
                key={j}
                style={[styles.jourBtn, jour === j && styles.jourBtnActive]}
                onPress={() => setJour(j)}
              >
                <Text
                  style={[styles.jourText, jour === j && styles.jourTextActive]}
                >
                  {j.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Matière *</Text>
          <TextInput
            style={styles.input}
            value={matiere}
            onChangeText={setMatiere}
            placeholder="Ex: Mathématiques"
            placeholderTextColor="#C7C7CC"
          />

          <Text style={styles.label}>Salle *</Text>
          <TextInput
            style={styles.input}
            value={salle}
            onChangeText={setSalle}
            placeholder="Ex: Amphi A"
            placeholderTextColor="#C7C7CC"
          />

          <Text style={styles.label}>Professeur</Text>
          <TextInput
            style={styles.input}
            value={professeur}
            onChangeText={setProfesseur}
            placeholder="Ex: M. Dupont"
            placeholderTextColor="#C7C7CC"
          />

          <Text style={styles.label}>Heure de début</Text>
          <TouchableOpacity
            style={styles.heureBtn}
            onPress={() => setShowHeureDebut(true)}
          >
            <Ionicons name="time-outline" size={20} color="#4A90D9" />
            <Text style={styles.heureText}>
              {heureDebutH}:{heureDebutM}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Heure de fin</Text>
          <TouchableOpacity
            style={styles.heureBtn}
            onPress={() => setShowHeureFin(true)}
          >
            <Ionicons name="time-outline" size={20} color="#4A90D9" />
            <Text style={styles.heureText}>
              {heureFinH}:{heureFinM}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <HeurePicker
          visible={showHeureDebut}
          heure={heureDebutH}
          minute={heureDebutM}
          onHeure={setHeureDebutH}
          onMinute={setHeureDebutM}
          onClose={() => setShowHeureDebut(false)}
          label="Heure de début"
        />
        <HeurePicker
          visible={showHeureFin}
          heure={heureFinH}
          minute={heureFinM}
          onHeure={handleHeureDebutChange}
          onMinute={setHeureFinM}
          onClose={() => setShowHeureFin(false)}
          label="Heure de fin"
        />
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
  jourBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  jourBtnActive: { backgroundColor: "#4A90D9", borderColor: "#4A90D9" },
  jourText: { fontSize: 13, color: "#1A1A1A", fontWeight: "500" },
  jourTextActive: { color: "#fff" },
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
