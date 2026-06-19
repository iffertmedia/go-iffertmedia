import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Hourglass, XCircle } from 'lucide-react-native';
import useDeviceStore from '@/lib/state/device-store';
import { theme } from '@/lib/theme';
import type { CreatorStatus } from '@/lib/api/types';

// Shown to a creator whose account is in "limbo" — registered but not yet
// approved by a host (Pending), or turned down (Rejected).
export default function PendingApproval({
  name,
  status,
}: {
  name?: string;
  status: CreatorStatus;
}) {
  const setCreatorId = useDeviceStore((s) => s.setCreatorId);
  const rejected = status === 'Rejected';

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulse]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: rejected ? 1 : pulse.value }] }));

  const accent = rejected ? theme.pink : theme.cyan;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} testID="pending-approval-screen">
      <LinearGradient
        colors={[`${accent}25`, '#00000000', '#000000']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Animated.View
            style={[
              {
                width: 96,
                height: 96,
                borderRadius: 28,
                backgroundColor: theme.surfaceElevated,
                borderWidth: 1,
                borderColor: `${accent}55`,
                alignItems: 'center',
                justifyContent: 'center',
              },
              iconStyle,
            ]}>
            {rejected ? (
              <XCircle color={theme.pink} size={44} />
            ) : (
              <Hourglass color={theme.cyan} size={44} />
            )}
          </Animated.View>

          <Text
            style={{
              color: theme.white,
              fontSize: 28,
              fontWeight: '900',
              marginTop: 28,
              textAlign: 'center',
            }}>
            {rejected ? 'Not approved' : "You're on the list"}
          </Text>

          <Text
            style={{
              color: theme.textDim,
              fontSize: 15,
              lineHeight: 22,
              marginTop: 12,
              textAlign: 'center',
            }}>
            {rejected
              ? `Sorry${name ? `, ${name}` : ''} — a host didn't approve this request. You can try again with different details.`
              : `Thanks${name ? `, ${name}` : ''}! A host needs to approve you before you can join the leaderboard. This page updates automatically — hang tight.`}
          </Text>

          {!rejected ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 24,
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 999,
              }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.cyan,
                  marginRight: 8,
                }}
              />
              <Text style={{ color: theme.cyan, fontWeight: '700', fontSize: 13 }}>
                Waiting for host approval
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => setCreatorId(null)}
            testID="pending-start-over"
            style={({ pressed }) => ({
              marginTop: 32,
              paddingVertical: 14,
              paddingHorizontal: 28,
              borderRadius: 14,
              backgroundColor: rejected ? theme.pink : 'transparent',
              borderWidth: rejected ? 0 : 1,
              borderColor: theme.border,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Text
              style={{
                color: rejected ? theme.white : theme.textDim,
                fontWeight: '800',
                fontSize: 15,
              }}>
              {rejected ? 'Try again' : 'Use a different handle'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
