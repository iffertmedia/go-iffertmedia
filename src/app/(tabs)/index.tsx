import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { TrendingUp, Trophy, Zap, Sparkles, LogOut, QrCode } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { useCreator } from '@/lib/api/community';
import useDeviceStore from '@/lib/state/device-store';
import CreatorAvatar from '@/components/CreatorAvatar';
import { theme } from '@/lib/theme';

export default function MeScreen() {
  const creatorId = useDeviceStore((s) => s.creatorId);
  const setCreatorId = useDeviceStore((s) => s.setCreatorId);
  const { data: me, isLoading } = useCreator(creatorId);

  if (isLoading || !me) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.pink} testID="me-loading" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} testID="me-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <LinearGradient
            colors={['#FF005022', '#00F2FE11', '#000000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>
                IFFERT MEDIA DASHBOARD
              </Text>
              <Pressable
                onPress={() => setCreatorId(null)}
                testID="leave-button"
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                <LogOut color={theme.textDim} size={18} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18 }}>
              <CreatorAvatar name={me.name} color={me.avatarColor} size={72} ring />
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={{ color: theme.white, fontSize: 22, fontWeight: '800' }}>{me.name}</Text>
                <Text style={{ color: theme.cyan, fontSize: 15, fontWeight: '600', marginTop: 2 }}>
                  {me.handle}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Point balance card */}
          <View style={{ paddingHorizontal: 20, marginTop: -8 }}>
            <LinearGradient
              colors={[theme.pink, '#B0003A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 24, padding: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Zap color={theme.white} size={18} fill={theme.white} />
                <Text style={{ color: '#FFFFFFCC', fontSize: 13, fontWeight: '700', marginLeft: 6, letterSpacing: 1 }}>
                  POINT BALANCE
                </Text>
              </View>
              <Text style={{ color: theme.white, fontSize: 48, fontWeight: '900', marginTop: 6 }}>
                {me.totalPoints.toLocaleString()}
              </Text>
            </LinearGradient>
          </View>

          {/* Scannable QR badge — hosts scan this to award challenge points */}
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <View
              style={{
                backgroundColor: theme.surfaceElevated,
                borderRadius: 24,
                padding: 22,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
              }}
              testID="my-qr-badge">
              <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 16 }}>
                <QrCode color={theme.cyan} size={18} />
                <Text style={{ color: theme.white, fontSize: 15, fontWeight: '800', marginLeft: 8 }}>
                  My Creator Badge
                </Text>
              </View>
              <View style={{ backgroundColor: theme.white, padding: 16, borderRadius: 18 }}>
                <QRCode value={me.id} size={172} backgroundColor="#FFFFFF" color="#000000" />
              </View>
              <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 16, textAlign: 'center' }}>
                Show this to a host to claim your points for a completed reward.
              </Text>
            </View>
          </View>

          {/* Stat tiles */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 16 }}>
            <StatTile icon={<Trophy color={theme.gold} size={20} />} label="Rank" value={`#${me.rank}`} />
            <StatTile
              icon={<TrendingUp color={theme.cyan} size={20} />}
              label="Started"
              value={`${me.logs.length}`}
            />
          </View>

          {/* Activity log (Point_Logs) */}
          <Text
            style={{
              color: theme.white,
              fontSize: 18,
              fontWeight: '800',
              marginTop: 28,
              marginBottom: 12,
              paddingHorizontal: 20,
            }}>
            Activity
          </Text>

          {me.logs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
              <Sparkles color={theme.textDim} size={28} />
              <Text style={{ color: theme.textDim, marginTop: 10, textAlign: 'center' }}>
                No points yet. Head to Rewards to start earning!
              </Text>
            </View>
          ) : (
            me.logs.map((log) => (
              <View
                key={log.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginHorizontal: 20,
                  marginBottom: 10,
                  backgroundColor: theme.surfaceElevated,
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.white, fontWeight: '600', fontSize: 14 }}>
                    {log.action}
                  </Text>
                  {log.note ? (
                    <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 3, fontStyle: 'italic' }}>
                      "{log.note}"
                    </Text>
                  ) : null}
                  <Text style={{ color: theme.textDim, fontSize: 12, marginTop: 3 }}>
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                  </Text>
                </View>
                <Text
                  style={{
                    color: log.pointsChanged >= 0 ? theme.cyan : theme.pink,
                    fontWeight: '800',
                    fontSize: 15,
                  }}>
                  {log.pointsChanged >= 0 ? '+' : ''}
                  {log.pointsChanged}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surfaceElevated,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
      }}>
      {icon}
      <Text style={{ color: theme.white, fontSize: 24, fontWeight: '900', marginTop: 8 }}>{value}</Text>
      <Text style={{ color: theme.textDim, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{label}</Text>
    </View>
  );
}
