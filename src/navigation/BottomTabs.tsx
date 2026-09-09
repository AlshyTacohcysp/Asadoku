import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { TAB_ICONS, type RootTabParamList } from './types';

import DashboardScreen from '../screens/DashboardScreen';
import CoursScreen from '../screens/CoursScreen';
import TodosScreen from '../screens/TodosScreen';
import EtudeScreen from '../screens/EtudeScreen';
import StatsScreen from '../screens/StatsScreen';
import ParametresScreen from '../screens/ParametresScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function BottomTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icone = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={focused ? icone.active : icone.inactive}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
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
