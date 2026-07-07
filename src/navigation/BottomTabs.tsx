import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

// Imports classiques (stables)
import DashboardScreen from "../screens/DashboardScreen";
import CoursScreen from "../screens/CoursScreen";
import TodosScreen from "../screens/TodosScreen";
import EtudeScreen from "../screens/EtudeScreen";
import ParametresScreen from "../screens/ParametresScreen";
import StatsScreen from "../screens/StatsScreen";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "help-circle";
          if (route.name === "Accueil")
            iconName = focused ? "home" : "home-outline";
          else if (route.name === "Cours")
            iconName = focused ? "book" : "book-outline";
          else if (route.name === "Tâches")
            iconName = focused ? "checkbox" : "checkbox-outline";
          else if (route.name === "Étude")
            iconName = focused ? "timer" : "timer-outline";
          else if (route.name === "Stats")
            iconName = focused ? "stats-chart" : "stats-chart-outline";
          else if (route.name === "Réglages")
            iconName = focused ? "settings" : "settings-outline";
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#C7C7CC",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Accueil" component={DashboardScreen} />
      <Tab.Screen name="Cours" component={CoursScreen} />
      <Tab.Screen name="Tâches" component={TodosScreen} />
      <Tab.Screen name="Étude" component={EtudeScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Réglages" component={ParametresScreen} />
    </Tab.Navigator>
  );
}
