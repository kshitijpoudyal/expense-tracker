import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';

import { Colors } from '@/constants/theme';
import type { IconName } from '@/data/mock';

const tabs: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Dashboard', icon: 'home-outline', iconActive: 'home' },
  { name: 'recurring', title: 'Recurring', icon: 'repeat-outline', iconActive: 'repeat' },
  { name: 'spending', title: 'Spending', icon: 'pie-chart-outline', iconActive: 'pie-chart' },
  { name: 'transactions', title: 'Transactions', icon: 'list-outline', iconActive: 'list' },
  { name: 'more', title: 'More', icon: 'grid-outline', iconActive: 'grid' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarStyle: { backgroundColor: Colors.card, borderTopColor: Colors.border },
      }}>
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? t.iconActive : t.icon} size={23} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
