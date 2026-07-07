import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllCours } from "../services/CoursService";
import { scheduleAllAlarms } from "../services/AlarmeService";
import { exportData, importData } from "../services/ExportService";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useTheme } from "../context/ThemeContext";

export default function ParametresScreen() {
  const [nom, setNom] = useState("");
  const [tempsPrep, setTempsPrep] = useState(20);
  const [tempsTrajet, setTempsTrajet] = useState(15);
  const [marge, setMarge] = useState(5);
  const [adresseDomicile, setAdresseDomicile] = useState("");
  const [adresseEtablissement, setAdresseEtablissement] = useState("");
  const [methodeDefaut, setMethodeDefaut] = useState("Pomodoro");
  const [sonnerie, setSonnerie] = useState("default");
  const [sonPath, setSonPath] = useState(""); // Chemin du son personnalisé
  const { isDark, toggle } = useTheme();

  useEffect(() => {
    loadParams();
  }, []);

  const loadParams = async () => {
    setNom((await AsyncStorage.getItem("profil_nom")) || "");
    setTempsPrep(Number(await AsyncStorage.getItem("temps_preparation")) || 20);
    setTempsTrajet(Number(await AsyncStorage.getItem("temps_trajet")) || 15);
    setMarge(Number(await AsyncStorage.getItem("marge")) || 5);
    setAdresseDomicile((await AsyncStorage.getItem("adresse_domicile")) || "");
    setAdresseEtablissement(
      (await AsyncStorage.getItem("adresse_etablissement")) || "",
    );
    setMethodeDefaut(
      (await AsyncStorage.getItem("methode_defaut")) || "Pomodoro",
    );
    setSonnerie((await AsyncStorage.getItem("sonnerie")) || "default");

    const savedPath = await AsyncStorage.getItem("son_path");
    if (savedPath) {
      setSonPath(savedPath);
      setSonnerie("custom");
    }
  };

  const saveAndReschedule = async () => {
    await AsyncStorage.setItem("profil_nom", nom);
    await AsyncStorage.setItem("temps_preparation", String(tempsPrep));
    await AsyncStorage.setItem("temps_trajet", String(tempsTrajet));
    await AsyncStorage.setItem("marge", String(marge));
    await AsyncStorage.setItem("adresse_domicile", adresseDomicile);
    await AsyncStorage.setItem("adresse_etablissement", adresseEtablissement);
    await AsyncStorage.setItem("methode_defaut", methodeDefaut);
    const allCours = await getAllCours();
    await scheduleAllAlarms(allCours, tempsPrep, tempsTrajet, marge, sonnerie);
    await AsyncStorage.setItem("sonnerie", sonnerie);

    // Sauvegarder le chemin du son
    await AsyncStorage.setItem("sonnerie", sonnerie);
    if (sonnerie === "custom") {
      await AsyncStorage.setItem("son_path", sonPath);
    } else {
      await AsyncStorage.setItem("son_path", "");
    }

    // Modifier l'appel à scheduleAllAlarms
    await scheduleAllAlarms(
      allCours,
      tempsPrep,
      tempsTrajet,
      marge,
      sonnerie === "custom" ? sonPath : sonnerie,
    );

    Alert.alert("✅", "Paramètres sauvegardés et alarmes reprogrammées !");
  };

  const handleExport = async () => {
    try {
      await exportData();
      Alert.alert("✅", "Sauvegarde exportée avec succès !");
    } catch (error) {
      Alert.alert("❌", "Erreur lors de l'export");
    }
  };

  const handleImport = async () => {
    Alert.alert(
      "⚠️ Attention",
      "L'import remplacera TOUTES vos données actuelles. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Importer",
          onPress: async () => {
            try {
              const success = await importData();
              if (success) {
                Alert.alert("✅", "Données importées ! Redémarrez l'app.");
              }
            } catch {
              Alert.alert("❌", "Fichier invalide");
            }
          },
        },
      ],
    );
  };

  const pickSound = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        // Copier le fichier dans le dossier de l'app
        const filename = `custom_alarm_${Date.now()}.${file.name.split(".").pop()}`;
        const newPath = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.copyAsync({ from: file.uri, to: newPath });

        setSonPath(newPath);
        setSonnerie("custom");
        Alert.alert("✅", "Son personnalisé sélectionné !");
      }
    } catch (error) {
      Alert.alert("❌", "Erreur lors de la sélection du fichier");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.title}>⚙️ Paramètres</Text>

        <View style={styles.card}>
          <Text style={styles.label}>👤 Nom</Text>
          <TextInput
            style={styles.input}
            value={nom}
            onChangeText={setNom}
            placeholder="Votre nom"
            placeholderTextColor="#C7C7CC"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>🏠 Adresse domicile</Text>
          <TextInput
            style={styles.input}
            value={adresseDomicile}
            onChangeText={setAdresseDomicile}
            placeholder="Votre adresse"
            placeholderTextColor="#C7C7CC"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>🏫 Adresse établissement</Text>
          <TextInput
            style={styles.input}
            value={adresseEtablissement}
            onChangeText={setAdresseEtablissement}
            placeholder="Adresse de votre école"
            placeholderTextColor="#C7C7CC"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>📚 Méthode de révision par défaut</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
          >
            {[
              "Pomodoro",
              "Feynman",
              "MindMap",
              "Exercices",
              "Lecture",
              "Flashcards",
            ].map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.coursBtn,
                  methodeDefaut === m && styles.coursBtnActive,
                ]}
                onPress={() => setMethodeDefaut(m)}
              >
                <Text
                  style={[
                    styles.coursBtnText,
                    methodeDefaut === m && { color: "#fff" },
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>⏰ Temps de préparation</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => setTempsPrep(Math.max(5, tempsPrep - 5))}
            >
              <Text style={styles.btnText}>-5</Text>
            </TouchableOpacity>
            <Text style={styles.value}>{tempsPrep} min</Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => setTempsPrep(tempsPrep + 5)}
            >
              <Text style={styles.btnText}>+5</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>🚶 Temps de trajet</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => setTempsTrajet(Math.max(1, tempsTrajet - 5))}
            >
              <Text style={styles.btnText}>-5</Text>
            </TouchableOpacity>
            <Text style={styles.value}>{tempsTrajet} min</Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => setTempsTrajet(tempsTrajet + 5)}
            >
              <Text style={styles.btnText}>+5</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>🛡️ Marge de sécurité</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => setMarge(Math.max(0, marge - 5))}
            >
              <Text style={styles.btnText}>-5</Text>
            </TouchableOpacity>
            <Text style={styles.value}>{marge} min</Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => setMarge(Math.min(30, marge + 5))}
            >
              <Text style={styles.btnText}>+5</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>🔔 Sonnerie d'alarme</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 8,
            }}
          >
            {[
              { id: "default", nom: "Défaut" },
              { id: "alarm", nom: "Alarme" },
              { id: "notification", nom: "Notification" },
              { id: "ringtone", nom: "Sonnerie" },
            ].map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.coursBtn,
                  sonnerie === s.id && styles.coursBtnActive,
                ]}
                onPress={() => {
                  setSonnerie(s.id);
                  setSonPath("");
                }}
              >
                <Text
                  style={[
                    styles.coursBtnText,
                    sonnerie === s.id && { color: "#fff" },
                  ]}
                >
                  {s.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.coursBtn,
              sonnerie === "custom" && styles.coursBtnActive,
              { marginTop: 8, alignSelf: "flex-start" },
            ]}
            onPress={pickSound}
          >
            <Text
              style={[
                styles.coursBtnText,
                sonnerie === "custom" && { color: "#fff" },
              ]}
            >
              {sonnerie === "custom"
                ? "📁 Son perso ✓"
                : "📁 Choisir un fichier..."}
            </Text>
          </TouchableOpacity>
        </View>

        {/* <View style={styles.card}>
          <Text style={styles.label}>🌙 Mode sombre</Text>
          <TouchableOpacity
            style={[styles.coursBtn, isDark && styles.coursBtnActive]}
            onPress={toggle}
          >
            <Text style={[styles.coursBtnText, isDark && { color: "#fff" }]}>
              {isDark ? "🌙 Sombre" : "☀️ Clair"}
            </Text>
          </TouchableOpacity>
        </View> */}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📐 Calcul de l'alarme</Text>
          <Text style={styles.infoText}>
            Heure cours - Prépa ({tempsPrep}min) - Trajet ({tempsTrajet}min) -
            Marge ({marge}min)
          </Text>
          <Text style={styles.infoText}>
            = Alarme {tempsPrep + tempsTrajet + marge} min avant le cours
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>💾 Sauvegarde</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
              <Text style={styles.exportBtnText}>📤 Exporter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: "#FF9500" }]}
              onPress={handleImport}
            >
              <Text style={styles.exportBtnText}>📥 Importer</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={saveAndReschedule}>
          <Text style={styles.saveBtnText}>💾 Sauvegarder et reprogrammer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
  },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  input: {
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    color: "#1A1A1A",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  btn: {
    backgroundColor: "#4A90D9",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  value: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    minWidth: 80,
    textAlign: "center",
  },
  coursBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  coursBtnActive: { backgroundColor: "#4A90D9", borderColor: "#4A90D9" },
  coursBtnText: { fontSize: 13, color: "#1A1A1A" },
  infoCard: {
    backgroundColor: "#E8F0FE",
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },
  infoTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  infoText: { fontSize: 13, color: "#4A90D9", marginBottom: 4 },
  saveBtn: {
    backgroundColor: "#34C759",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  exportBtn: {
    flex: 1,
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  exportBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
