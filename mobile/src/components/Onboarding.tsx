import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Sparkles, Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useRegisterCreator } from '@/lib/api/community';
import useDeviceStore from '@/lib/state/device-store';
import { theme } from '@/lib/theme';

export default function Onboarding() {
  const router = useRouter();
  const setCreatorId = useDeviceStore((s) => s.setCreatorId);
  const register = useRegisterCreator();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onJoin = () => {
    if (!name.trim() || !handle.trim()) {
      setError('Enter your name and handle');
      return;
    }
    setError(null);
    register.mutate(
      { name: name.trim(), handle: handle.trim() },
      {
        onSuccess: (creator) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setCreatorId(creator.id);
        },
        onError: (e: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(e?.message ?? 'Could not join');
        },
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} testID="onboarding-screen">
      <LinearGradient
        colors={['#FF005025', '#00F2FE10', '#000000']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'center', padding: 28 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: theme.pink,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Sparkles color={theme.white} size={30} />
          </View>
          <Text style={{ color: theme.white, fontSize: 32, fontWeight: '900', marginTop: 20 }}>
            Join the event
          </Text>
          <Text style={{ color: theme.textDim, fontSize: 15, marginTop: 8, lineHeight: 21 }}>
            Claim your spot on the Iffert Media leaderboard. Already joined? Enter the same name and handle to get back in.
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.textDim}
            testID="onboarding-name"
            style={inputStyle}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={{ color: theme.cyan, fontSize: 18, fontWeight: '800', marginRight: 4 }}>@</Text>
            <TextInput
              value={handle}
              onChangeText={setHandle}
              placeholder="handle"
              autoCapitalize="none"
              placeholderTextColor={theme.textDim}
              testID="onboarding-handle"
              style={[inputStyle, { flex: 1, marginTop: 0 }]}
            />
          </View>

          {error ? (
            <Text style={{ color: theme.pink, marginTop: 12, fontWeight: '600' }}>{error}</Text>
          ) : null}

          <Pressable
            onPress={onJoin}
            disabled={register.isPending}
            testID="onboarding-join"
            style={({ pressed }) => ({
              marginTop: 24,
              backgroundColor: theme.pink,
              paddingVertical: 17,
              borderRadius: 16,
              alignItems: 'center',
              opacity: pressed || register.isPending ? 0.7 : 1,
            })}>
            {register.isPending ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <Text style={{ color: theme.white, fontWeight: '800', fontSize: 16 }}>
                Join Leaderboard
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/admin-portal');
            }}
            testID="onboarding-admin-login"
            style={({ pressed }) => ({
              marginTop: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              opacity: pressed ? 0.6 : 1,
            })}>
            <Shield color={theme.textDim} size={16} />
            <Text style={{ color: theme.textDim, fontWeight: '700', fontSize: 14, marginLeft: 6 }}>
              Admin login
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const inputStyle = {
  marginTop: 12,
  backgroundColor: theme.surfaceElevated,
  borderColor: theme.border,
  borderWidth: 1,
  borderRadius: 14,
  paddingVertical: 15,
  paddingHorizontal: 16,
  color: theme.white,
  fontSize: 16,
} as const;
