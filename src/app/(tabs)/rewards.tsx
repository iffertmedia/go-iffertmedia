import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import {
  Users,
  TrendingUp,
  Music,
  AtSign,
  Radio,
  Clapperboard,
  Sparkles,
  Plus,
  Zap,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';
import { useChallenges, useCreator, useMySubmissions } from '@/lib/api/community';
import useDeviceStore from '@/lib/state/device-store';
import { theme } from '@/lib/theme';

const ICONS: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  Users,
  TrendingUp,
  Music,
  AtSign,
  Radio,
  Clapperboard,
  Sparkles,
  Plus,
};

type Tab = 'available' | 'completed';

export default function RewardsScreen() {
  const creatorId = useDeviceStore((s) => s.creatorId);
  const { data: challenges, isLoading } = useChallenges();
  const { data: me } = useCreator(creatorId);
  const { data: mySubmissions } = useMySubmissions(creatorId);
  const [tab, setTab] = useState<Tab>('available');

  // Completed rewards come from the creator's own point log (host-awarded).
  const completed = useMemo(
    () => (me?.logs ?? []).filter((l) => l.action.startsWith('Completed:') && l.pointsChanged > 0),
    [me]
  );

  // Rewards still available to earn — hide ones already awarded (they live in Completed).
  const available = useMemo(
    () =>
      (challenges ?? []).filter(
        (ch) => !completed.some((l) => l.action === `Completed: ${ch.title}`)
      ),
    [challenges, completed]
  );

  // Challenge IDs that already have a pending submission from this creator.
  const pendingChallengeIds = useMemo(
    () => new Set((mySubmissions ?? []).filter((s) => s.status === 'Pending').map((s) => s.challengeId)),
    [mySubmissions]
  );

  const switchTab = (next: Tab) => {
    Haptics.selectionAsync();
    setTab(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} testID="rewards-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ color: theme.white, fontSize: 30, fontWeight: '900' }}>Rewards</Text>
          <Text style={{ color: theme.textDim, fontSize: 14, marginTop: 4 }}>
            Browse rewards and track what you've earned
          </Text>
        </View>

        {/* Segmented tabs */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 20,
            marginTop: 6,
            marginBottom: 8,
            backgroundColor: theme.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 4,
          }}>
          <TabButton label="Rewards" active={tab === 'available'} onPress={() => switchTab('available')} testID="tab-available" />
          <TabButton
            label={completed.length ? `Completed (${completed.length})` : 'Completed'}
            active={tab === 'completed'}
            onPress={() => switchTab('completed')}
            testID="tab-completed"
          />
        </View>

        {isLoading || !challenges ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={theme.pink} testID="rewards-loading" />
          </View>
        ) : tab === 'available' ? (
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}>
            {/* How-it-works note: head to the Submit tab to send proof */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#00F2FE10',
                borderColor: '#00F2FE33',
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
              }}>
              <Sparkles color={theme.cyan} size={16} />
              <Text style={{ color: theme.textDim, fontSize: 13, marginLeft: 10, flex: 1, lineHeight: 18 }}>
                Browse the rewards on offer. When you're ready, head to the Submit tab to send your proof.
              </Text>
            </View>

            {available.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 50 }}>
                <CheckCircle2 color={theme.cyan} size={40} />
                <Text style={{ color: theme.white, fontSize: 16, fontWeight: '800', marginTop: 14 }}>
                  All rewards earned
                </Text>
                <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                  You've claimed every reward. Check the Completed tab to see them.
                </Text>
              </View>
            ) : null}

            {available.map((ch) => {
              const Icon = ICONS[ch.icon] ?? Sparkles;
              const pending = pendingChallengeIds.has(ch.id);
              return (
                <View
                  key={ch.id}
                  style={{
                    backgroundColor: theme.surfaceElevated,
                    borderRadius: 20,
                    padding: 18,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        backgroundColor: '#00F2FE18',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Icon color={theme.cyan} size={22} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ color: theme.white, fontSize: 17, fontWeight: '800' }}>
                        {ch.title}
                      </Text>
                      <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                        {ch.description}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 16,
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Zap color={theme.pink} size={16} fill={theme.pink} />
                      <Text style={{ color: theme.pink, fontWeight: '800', fontSize: 15, marginLeft: 5 }}>
                        {ch.rewardPoints} pts
                      </Text>
                    </View>
                    {pending ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#FFD23F18',
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 999,
                        }}>
                        <Clock color={theme.gold} size={13} />
                        <Text style={{ color: theme.gold, fontWeight: '800', fontSize: 13, marginLeft: 6 }}>
                          In review
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 32, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}>
            {completed.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: '#00F2FE12',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <CheckCircle2 color={theme.textDim} size={32} />
                </View>
                <Text style={{ color: theme.white, fontSize: 16, fontWeight: '800', marginTop: 16 }}>
                  No completed rewards yet
                </Text>
                <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                  Once a host awards you for a reward, it shows up here.
                </Text>
              </View>
            ) : (
              completed.map((log) => (
                <View
                  key={log.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.surfaceElevated,
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 13,
                      backgroundColor: '#00F2FE18',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <CheckCircle2 color={theme.cyan} size={22} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={{ color: theme.white, fontSize: 15, fontWeight: '700' }}>
                      {log.action.replace(/^Completed:\s*/, '')}
                    </Text>
                    <Text style={{ color: theme.textDim, fontSize: 12, marginTop: 3 }}>
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </Text>
                  </View>
                  <Text style={{ color: theme.cyan, fontWeight: '900', fontSize: 16 }}>
                    +{log.pointsChanged}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: active ? theme.pink : 'transparent',
        alignItems: 'center',
      }}>
      <Text style={{ color: active ? theme.white : theme.textDim, fontWeight: '800', fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}
