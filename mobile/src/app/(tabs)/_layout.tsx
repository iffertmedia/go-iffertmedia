import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs } from 'expo-router';
import { User, Gift, Upload, Trophy, Shield } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import useDeviceStore from '@/lib/state/device-store';
import Onboarding from '@/components/Onboarding';
import PendingApproval from '@/components/PendingApproval';
import { useCreator } from '@/lib/api/community';

export default function TabLayout() {
  const creatorId = useDeviceStore((s) => s.creatorId);

  // Until this phone registers a creator, show onboarding instead of the tabs.
  if (!creatorId) {
    return <Onboarding />;
  }

  // Registered phones are gated on the creator's approval status.
  return <CreatorGate creatorId={creatorId} />;
}

// Decides what a registered phone sees based on its approval status:
// approved → the full tabs; pending/rejected → the limbo screen.
function CreatorGate({ creatorId }: { creatorId: string }) {
  const setCreatorId = useDeviceStore((s) => s.setCreatorId);
  const { data: me, isLoading, isError } = useCreator(creatorId);

  // First load with no cached creator yet — show a brief splash.
  if (isLoading && !me) {
    return (
      <View
        testID="creator-gate-loading"
        style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.pink} />
      </View>
    );
  }

  // The creator no longer exists (e.g. the event was reset) — start over.
  if (isError && !me) {
    setCreatorId(null);
    return <Onboarding />;
  }

  if (me && me.status !== 'Approved') {
    return <PendingApproval name={me.name} status={me.status} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.pink,
        tabBarInactiveTintColor: theme.textDim,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, size }) => <Gift color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Submit',
          tabBarIcon: ({ color, size }) => <Upload color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
