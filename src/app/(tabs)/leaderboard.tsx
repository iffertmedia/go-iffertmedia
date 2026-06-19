import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown } from 'lucide-react-native';
import { useLeaderboard } from '@/lib/api/community';
import useDeviceStore from '@/lib/state/device-store';
import CreatorAvatar from '@/components/CreatorAvatar';
import { theme } from '@/lib/theme';

export default function LeaderboardScreen() {
  const creatorId = useDeviceStore((s) => s.creatorId);
  const { data: ranked, isLoading } = useLeaderboard();

  if (isLoading || !ranked) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.pink} testID="leaderboard-loading" />
      </View>
    );
  }

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  // Render podium order: 2nd, 1st, 3rd
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);
  const heights = [96, 130, 78];
  const podiumColors = ['#C0C0C0', theme.gold, '#CD7F32'];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} testID="leaderboard-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ color: theme.white, fontSize: 30, fontWeight: '900' }}>Leaderboard</Text>
          <Text style={{ color: theme.textDim, fontSize: 14, marginTop: 4 }}>
            Top creators at the event
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {ranked.length === 0 ? (
            <Text style={{ color: theme.textDim, textAlign: 'center', marginTop: 60 }}>
              No creators yet. Be the first to join!
            </Text>
          ) : (
            <>
              {/* Podium */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 28,
                }}>
                {podiumOrder.map((c, i) => {
                  const realRank = ranked.findIndex((r) => r.id === c.id) + 1;
                  return (
                    <View key={c.id} style={{ alignItems: 'center', flex: 1 }}>
                      {realRank === 1 ? <Crown color={theme.gold} size={24} fill={theme.gold} /> : null}
                      <View style={{ marginTop: realRank === 1 ? 4 : 0 }}>
                        <CreatorAvatar
                          name={c.name}
                          color={c.avatarColor}
                          size={realRank === 1 ? 64 : 52}
                          ring
                        />
                      </View>
                      <Text
                        numberOfLines={1}
                        style={{ color: theme.white, fontWeight: '700', fontSize: 13, marginTop: 8 }}>
                        {c.handle}
                      </Text>
                      <Text style={{ color: theme.cyan, fontWeight: '800', fontSize: 13, marginTop: 2 }}>
                        {c.totalPoints.toLocaleString()}
                      </Text>
                      <LinearGradient
                        colors={[podiumColors[i], '#00000000']}
                        style={{
                          width: '100%',
                          height: heights[i],
                          borderTopLeftRadius: 12,
                          borderTopRightRadius: 12,
                          marginTop: 10,
                          alignItems: 'center',
                          paddingTop: 8,
                        }}>
                        <Text style={{ color: theme.white, fontWeight: '900', fontSize: 22 }}>
                          {realRank}
                        </Text>
                      </LinearGradient>
                    </View>
                  );
                })}
              </View>

              {/* Rest of the list */}
              {rest.map((c, i) => {
                const isMe = c.id === creatorId;
                return (
                  <View
                    key={c.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginHorizontal: 20,
                      marginBottom: 10,
                      backgroundColor: isMe ? '#FF005015' : theme.surfaceElevated,
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: isMe ? theme.pink : theme.border,
                    }}>
                    <Text style={{ color: theme.textDim, fontWeight: '800', fontSize: 16, width: 32 }}>
                      {i + 4}
                    </Text>
                    <CreatorAvatar name={c.name} color={c.avatarColor} size={40} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: theme.white, fontWeight: '700', fontSize: 15 }}>
                        {c.name}
                        {isMe ? '  (You)' : ''}
                      </Text>
                      <Text style={{ color: theme.textDim, fontSize: 12 }}>{c.handle}</Text>
                    </View>
                    <Text style={{ color: theme.cyan, fontWeight: '800', fontSize: 15 }}>
                      {c.totalPoints.toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
