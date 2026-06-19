import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Burnt from 'burnt';
import { X, ScanLine, Check, ChevronDown, Award, Camera, RotateCcw } from 'lucide-react-native';
import { useCreator, useChallenges, useCompleteChallenge } from '@/lib/api/community';
import type { Challenge } from '@/lib/api/types';
import CreatorAvatar from '@/components/CreatorAvatar';
import { theme } from '@/lib/theme';

// The QR badge encodes the creator id. We accept either a raw id string or a
// small JSON payload like {"creatorId":"..."} so the scanner is tolerant.
function extractCreatorId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.creatorId === 'string') return parsed.creatorId;
    if (parsed && typeof parsed.id === 'string') return parsed.id;
  } catch {
    // not JSON — treat the whole string as the id
  }
  return value;
}

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedId, setScannedId] = useState<string | null>(null);

  const handleScanned = (data: string) => {
    if (scannedId) return; // already captured one
    const id = extractCreatorId(data);
    if (!id) {
      Burnt.toast({ title: 'Unreadable badge', preset: 'error' });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScannedId(id);
  };

  // --- Permission states ---
  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.pink} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }} testID="scan-permission">
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: '#00F2FE18',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Camera color={theme.cyan} size={36} />
          </View>
          <Text style={{ color: theme.white, fontSize: 22, fontWeight: '900', marginTop: 20 }}>
            Camera Access
          </Text>
          <Text style={{ color: theme.textDim, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            Allow camera access to scan creator QR badges.
          </Text>
          <Pressable
            onPress={requestPermission}
            testID="scan-grant"
            style={({ pressed }) => ({
              marginTop: 24,
              backgroundColor: theme.cyan,
              paddingVertical: 14,
              paddingHorizontal: 28,
              borderRadius: 14,
              opacity: pressed ? 0.8 : 1,
            })}>
            <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Enable Camera</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.textDim, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  // --- Result sheet after a successful scan ---
  if (scannedId) {
    return <ScanResult creatorId={scannedId} onRescan={() => setScannedId(null)} onClose={() => router.back()} />;
  }

  // --- Live camera ---
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} testID="scan-camera">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => handleScanned(data)}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
          {/* Top bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ScanLine color={theme.cyan} size={20} />
              <Text style={{ color: theme.white, fontWeight: '800', fontSize: 16, marginLeft: 8 }}>
                Scan Creator Badge
              </Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              testID="scan-close"
              hitSlop={12}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#00000088',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}>
              <X color={theme.white} size={20} />
            </Pressable>
          </View>

          {/* Reticle */}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: 240,
                height: 240,
                borderRadius: 28,
                borderWidth: 3,
                borderColor: theme.cyan,
                backgroundColor: '#00F2FE08',
              }}
            />
          </View>

          {/* Hint */}
          <View style={{ alignItems: 'center', padding: 28 }}>
            <Text style={{ color: theme.white, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
              Point the camera at a creator&apos;s QR badge
            </Text>
            <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
              They can show it from their profile screen.
            </Text>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Result: load the scanned creator, pick a challenge, award the points.
// ---------------------------------------------------------------------------
function ScanResult({
  creatorId,
  onRescan,
  onClose,
}: {
  creatorId: string;
  onRescan: () => void;
  onClose: () => void;
}) {
  const { data: creator, isLoading, isError } = useCreator(creatorId);
  const { data: challenges } = useChallenges();
  const complete = useCompleteChallenge();

  const [selected, setSelected] = useState<Challenge | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [awarded, setAwarded] = useState(false);

  const sortedChallenges = useMemo(
    () => (challenges ? [...challenges].sort((a, b) => b.rewardPoints - a.rewardPoints) : []),
    [challenges]
  );

  const onAward = () => {
    if (!selected || !creator) return;
    complete.mutate(
      { creatorId: creator.id, challengeId: selected.id },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Burnt.toast({ title: `+${selected.rewardPoints} to ${creator.handle}`, preset: 'done' });
          setAwarded(true);
        },
        onError: (e: any) => Burnt.toast({ title: e?.message ?? 'Failed to award', preset: 'error' }),
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} testID="scan-result">
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 }}>
          <Text style={{ color: theme.white, fontSize: 18, fontWeight: '900' }}>Award Points</Text>
          <Pressable
            onPress={onClose}
            testID="result-close"
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <X color={theme.textDim} size={24} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4 }} keyboardShouldPersistTaps="handled">
          {isLoading ? (
            <ActivityIndicator color={theme.pink} style={{ marginTop: 40 }} testID="result-loading" />
          ) : isError || !creator ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: theme.white, fontWeight: '800', fontSize: 16 }}>Creator not found</Text>
              <Text style={{ color: theme.textDim, marginTop: 6, textAlign: 'center' }}>
                That badge doesn&apos;t match a registered creator.
              </Text>
              <Pressable
                onPress={onRescan}
                style={({ pressed }) => ({
                  marginTop: 20,
                  backgroundColor: theme.cyan,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Text style={{ color: '#000', fontWeight: '800' }}>Scan Again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Profile card */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.surfaceElevated,
                  borderRadius: 20,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}>
                <CreatorAvatar name={creator.name} color={creator.avatarColor} size={60} ring />
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ color: theme.white, fontSize: 19, fontWeight: '800' }}>{creator.name}</Text>
                  <Text style={{ color: theme.cyan, fontSize: 14, fontWeight: '600', marginTop: 2 }}>
                    {creator.handle}
                  </Text>
                  <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 4 }}>
                    Rank #{creator.rank} · {creator.totalPoints.toLocaleString()} pts
                  </Text>
                </View>
              </View>

              {awarded ? (
                <View style={{ alignItems: 'center', marginTop: 32 }}>
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: '#00F2FE18',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Check color={theme.cyan} size={36} />
                  </View>
                  <Text style={{ color: theme.white, fontSize: 18, fontWeight: '800', marginTop: 16 }}>
                    Points Added
                  </Text>
                  <Text style={{ color: theme.textDim, marginTop: 6, textAlign: 'center' }}>
                    {selected?.title} · +{selected?.rewardPoints} pts to {creator.handle}
                  </Text>
                  <Pressable
                    onPress={onRescan}
                    testID="result-scan-next"
                    style={({ pressed }) => ({
                      marginTop: 24,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.cyan,
                      paddingVertical: 14,
                      paddingHorizontal: 26,
                      borderRadius: 14,
                      opacity: pressed ? 0.8 : 1,
                    })}>
                    <ScanLine color="#000" size={18} />
                    <Text style={{ color: '#000', fontWeight: '800', marginLeft: 8 }}>Scan Next Creator</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* Challenge dropdown */}
                  <Text style={{ color: theme.white, fontSize: 15, fontWeight: '800', marginTop: 24, marginBottom: 10 }}>
                    Completed Reward
                  </Text>
                  <Pressable
                    onPress={() => setPickerOpen((o) => !o)}
                    testID="challenge-dropdown"
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: theme.surface,
                      borderWidth: 1,
                      borderColor: pickerOpen ? theme.cyan : theme.border,
                      borderRadius: 14,
                      paddingVertical: 16,
                      paddingHorizontal: 16,
                      opacity: pressed ? 0.85 : 1,
                    })}>
                    <Text
                      style={{
                        color: selected ? theme.white : theme.textDim,
                        fontSize: 15,
                        fontWeight: selected ? '700' : '500',
                        flex: 1,
                      }}>
                      {selected ? `${selected.title}  ·  +${selected.rewardPoints}` : 'Select a reward…'}
                    </Text>
                    <ChevronDown color={theme.textDim} size={20} />
                  </Pressable>

                  {pickerOpen ? (
                    <View
                      style={{
                        marginTop: 8,
                        backgroundColor: theme.surfaceElevated,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 14,
                        overflow: 'hidden',
                      }}>
                      {sortedChallenges.length === 0 ? (
                        <Text style={{ color: theme.textDim, padding: 16 }}>No rewards yet.</Text>
                      ) : (
                        sortedChallenges.map((ch, i) => (
                          <Pressable
                            key={ch.id}
                            testID={`challenge-option-${i}`}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setSelected(ch);
                              setPickerOpen(false);
                            }}
                            style={({ pressed }) => ({
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingVertical: 14,
                              paddingHorizontal: 16,
                              backgroundColor: pressed ? theme.surface : 'transparent',
                              borderTopWidth: i === 0 ? 0 : 1,
                              borderTopColor: theme.border,
                            })}>
                            <Text style={{ color: theme.white, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 10 }}>
                              {ch.title}
                            </Text>
                            <Text style={{ color: theme.cyan, fontWeight: '800', fontSize: 14 }}>
                              +{ch.rewardPoints}
                            </Text>
                          </Pressable>
                        ))
                      )}
                    </View>
                  ) : null}

                  {/* Award button */}
                  <Pressable
                    onPress={onAward}
                    disabled={!selected || complete.isPending}
                    testID="award-button"
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? theme.pink : theme.border,
                      paddingVertical: 16,
                      borderRadius: 16,
                      marginTop: 24,
                      opacity: pressed ? 0.85 : 1,
                    })}>
                    {complete.isPending ? (
                      <ActivityIndicator color={theme.white} />
                    ) : (
                      <>
                        <Award color={theme.white} size={18} />
                        <Text style={{ color: theme.white, fontWeight: '800', fontSize: 16, marginLeft: 8 }}>
                          {selected ? `Add ${selected.rewardPoints} Points` : 'Add Points'}
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={onRescan}
                    testID="result-rescan"
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
                    <RotateCcw color={theme.textDim} size={15} />
                    <Text style={{ color: theme.textDim, fontWeight: '600', marginLeft: 6 }}>Scan a different badge</Text>
                  </Pressable>
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
