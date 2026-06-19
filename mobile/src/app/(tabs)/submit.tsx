import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Burnt from 'burnt';
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
  Upload,
  Clock,
  CheckCircle2,
  Send,
  X,
} from 'lucide-react-native';
import { useChallenges, useCreator, useMySubmissions, useSubmitProof } from '@/lib/api/community';
import type { Challenge } from '@/lib/api/types';
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

export default function SubmitScreen() {
  const creatorId = useDeviceStore((s) => s.creatorId);
  const { data: challenges, isLoading } = useChallenges();
  const { data: me } = useCreator(creatorId);
  const { data: mySubmissions } = useMySubmissions(creatorId);
  const submitProof = useSubmitProof();

  const [proofFor, setProofFor] = useState<Challenge | null>(null);
  const [proofText, setProofText] = useState('');

  // Challenges already awarded (from the point log) — no need to resubmit.
  const awardedTitles = useMemo(
    () =>
      new Set(
        (me?.logs ?? [])
          .filter((l) => l.action.startsWith('Completed:') && l.pointsChanged > 0)
          .map((l) => l.action.replace(/^Completed:\s*/, ''))
      ),
    [me]
  );

  // Challenge IDs with a pending submission from this creator.
  const pendingIds = useMemo(
    () => new Set((mySubmissions ?? []).filter((s) => s.status === 'Pending').map((s) => s.challengeId)),
    [mySubmissions]
  );

  const openProof = (ch: Challenge) => {
    Haptics.selectionAsync();
    setProofText('');
    setProofFor(ch);
  };

  const submit = () => {
    if (!creatorId || !proofFor || !proofText.trim()) return;
    submitProof.mutate(
      { creatorId, challengeId: proofFor.id, proof: proofText.trim() },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Burnt.toast({ title: 'Submitted for review', preset: 'done' });
          setProofFor(null);
          setProofText('');
        },
        onError: (e: any) => Burnt.toast({ title: e?.message ?? 'Failed', preset: 'error' }),
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} testID="submit-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ color: theme.white, fontSize: 30, fontWeight: '900' }}>Submit</Text>
          <Text style={{ color: theme.textDim, fontSize: 14, marginTop: 4 }}>
            Pick a reward and send your proof for review
          </Text>
        </View>

        {isLoading || !challenges ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={theme.pink} testID="submit-loading" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}>
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
              <Upload color={theme.cyan} size={16} />
              <Text style={{ color: theme.textDim, fontSize: 13, marginLeft: 10, flex: 1, lineHeight: 18 }}>
                A host reviews each submission and awards your points once approved.
              </Text>
            </View>

            {challenges.map((ch) => {
              const Icon = ICONS[ch.icon] ?? Sparkles;
              const awarded = awardedTitles.has(ch.title);
              const pending = pendingIds.has(ch.id);
              return (
                <View
                  key={ch.id}
                  style={{
                    backgroundColor: theme.surfaceElevated,
                    borderRadius: 20,
                    padding: 18,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: awarded ? '#00F2FE44' : theme.border,
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
                      <Text style={{ color: theme.white, fontSize: 17, fontWeight: '800' }}>{ch.title}</Text>
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
                    {awarded ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <CheckCircle2 color={theme.cyan} size={16} />
                        <Text style={{ color: theme.cyan, fontWeight: '800', fontSize: 13, marginLeft: 5 }}>
                          Awarded
                        </Text>
                      </View>
                    ) : pending ? (
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
                    ) : (
                      <Pressable
                        onPress={() => openProof(ch)}
                        testID={`submit-proof-${ch.id}`}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: theme.pink,
                          paddingHorizontal: 18,
                          paddingVertical: 9,
                          borderRadius: 999,
                          opacity: pressed ? 0.75 : 1,
                          transform: [{ scale: pressed ? 0.96 : 1 }],
                        })}>
                        <Upload color={theme.white} size={14} />
                        <Text style={{ color: theme.white, fontWeight: '800', fontSize: 13, marginLeft: 6 }}>
                          Submit Proof
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Submit proof modal */}
      <Modal
        visible={!!proofFor}
        transparent
        animationType="slide"
        onRequestClose={() => setProofFor(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000AA' }}>
          <View
            style={{
              backgroundColor: theme.surfaceElevated,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 22,
              paddingBottom: 36,
              borderWidth: 1,
              borderColor: theme.border,
            }}
            testID="proof-modal">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: theme.white, fontSize: 20, fontWeight: '900' }}>Submit Proof</Text>
              <Pressable onPress={() => setProofFor(null)} hitSlop={12} testID="proof-close">
                <X color={theme.textDim} size={24} />
              </Pressable>
            </View>
            {proofFor ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <Text style={{ color: theme.textDim, fontSize: 14 }}>{proofFor.title}</Text>
                <Zap color={theme.pink} size={14} fill={theme.pink} style={{ marginLeft: 8 }} />
                <Text style={{ color: theme.pink, fontWeight: '800', fontSize: 14, marginLeft: 3 }}>
                  {proofFor.rewardPoints} pts
                </Text>
              </View>
            ) : null}
            <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 16, marginBottom: 8 }}>
              Paste a link to your video or describe what you did.
            </Text>
            <TextInput
              value={proofText}
              onChangeText={setProofText}
              placeholder="https://tiktok.com/@you/video/…"
              placeholderTextColor={theme.textDim}
              multiline
              testID="proof-input"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
                color: theme.white,
                fontSize: 15,
                minHeight: 90,
                textAlignVertical: 'top',
              }}
            />
            <Pressable
              onPress={submit}
              disabled={!proofText.trim() || submitProof.isPending}
              testID="proof-submit"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: proofText.trim() ? theme.pink : theme.border,
                paddingVertical: 16,
                borderRadius: 16,
                marginTop: 18,
                opacity: pressed ? 0.85 : 1,
              })}>
              {submitProof.isPending ? (
                <ActivityIndicator color={theme.white} />
              ) : (
                <>
                  <Send color={theme.white} size={18} />
                  <Text style={{ color: theme.white, fontWeight: '800', fontSize: 16, marginLeft: 8 }}>
                    Send for Review
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
