import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Burnt from 'burnt';
import { useRouter } from 'expo-router';
import {
  Lock,
  ShieldCheck,
  Plus,
  Minus,
  RotateCcw,
  Award,
  ScanLine,
  Inbox,
  Check,
  X,
  Zap,
  FileText,
  CheckCircle2,
  XCircle,
  Users,
  Trash2,
  Ban,
  Trophy,
  UserCheck,
} from 'lucide-react-native';
import {
  useLeaderboard,
  useAddChallenge,
  useAwardPoints,
  useResetEvent,
  usePendingSubmissions,
  useReviewedSubmissions,
  useApproveSubmission,
  useRejectSubmission,
  useAdminChallenges,
  useEndChallenge,
  useDeleteChallenge,
  usePendingCreators,
  useApproveCreator,
  useRejectCreator,
} from '@/lib/api/community';
import { formatDistanceToNow } from 'date-fns';
import type { SubmissionWithDetails, Creator, Challenge } from '@/lib/api/types';
import CreatorAvatar from '@/components/CreatorAvatar';
import { theme } from '@/lib/theme';

const ADMIN_PASSCODE = '6504';

export default function AdminScreen() {
  const router = useRouter();
  const canClose = router.canGoBack();
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');

  const tryUnlock = () => {
    if (code === ADMIN_PASSCODE) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUnlocked(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Burnt.toast({ title: 'Wrong passcode', preset: 'error' });
      setCode('');
    }
  };

  if (!unlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }} testID="admin-lock">
        {canClose ? (
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            <Pressable
              onPress={() => router.back()}
              testID="admin-close"
              hitSlop={12}
              style={({ pressed }) => ({ alignSelf: 'flex-end', margin: 16, opacity: pressed ? 0.6 : 1 })}>
              <X color={theme.textDim} size={28} />
            </Pressable>
          </SafeAreaView>
        ) : null}
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: '#FF005018',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Lock color={theme.pink} size={36} />
          </View>
          <Text style={{ color: theme.white, fontSize: 24, fontWeight: '900', marginTop: 20 }}>
            Host Access
          </Text>
          <Text style={{ color: theme.textDim, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            Enter the event passcode to manage the community.
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Passcode"
            placeholderTextColor={theme.textDim}
            secureTextEntry
            keyboardType="number-pad"
            testID="admin-passcode"
            style={{
              marginTop: 24,
              width: '100%',
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 18,
              color: theme.white,
              fontSize: 18,
              textAlign: 'center',
              letterSpacing: 8,
            }}
          />
          <Pressable
            onPress={tryUnlock}
            testID="admin-unlock"
            style={({ pressed }) => ({
              marginTop: 16,
              width: '100%',
              backgroundColor: theme.pink,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}>
            <Text style={{ color: theme.white, fontWeight: '800', fontSize: 16 }}>Unlock</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return <AdminConsole />;
}

type AdminTab = 'console' | 'creators';

function AdminConsole() {
  const router = useRouter();
  const canClose = router.canGoBack();
  const [tab, setTab] = useState<AdminTab>('console');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} testID="admin-console">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Fixed header + top-level tab switcher */}
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ShieldCheck color={theme.cyan} size={26} />
            <Text style={{ color: theme.white, fontSize: 26, fontWeight: '900', marginLeft: 10 }}>
              Host Console
            </Text>
            {canClose ? (
              <Pressable
                onPress={() => router.back()}
                testID="admin-console-close"
                hitSlop={12}
                style={({ pressed }) => ({ marginLeft: 'auto', opacity: pressed ? 0.6 : 1 })}>
                <X color={theme.textDim} size={26} />
              </Pressable>
            ) : null}
          </View>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 4,
              marginTop: 16,
            }}>
            <SubTab label="Console" active={tab === 'console'} onPress={() => setTab('console')} testID="admintab-console" />
            <SubTab label="Creators" active={tab === 'creators'} onPress={() => setTab('creators')} testID="admintab-creators" />
          </View>
        </View>

        {tab === 'console' ? <ConsoleTab /> : <CreatorsTab />}
      </SafeAreaView>
    </View>
  );
}

function ConsoleTab() {
  const router = useRouter();
  const addChallenge = useAddChallenge();
  const resetEvent = useResetEvent();

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [points, setPoints] = useState('');

  const onAddChallenge = () => {
    const pts = parseInt(points, 10);
    if (!title.trim() || !pts) {
      Burnt.toast({ title: 'Add a title and points', preset: 'error' });
      return;
    }
    addChallenge.mutate(
      { title: title.trim(), description: desc.trim() || undefined, rewardPoints: pts },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Burnt.toast({ title: 'Reward added', preset: 'done' });
          setTitle('');
          setDesc('');
          setPoints('');
        },
        onError: (e: any) => Burnt.toast({ title: e?.message ?? 'Failed', preset: 'error' }),
      }
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Scan creator badge */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/scan');
          }}
          testID="open-scanner"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.pink,
            paddingVertical: 16,
            borderRadius: 16,
            opacity: pressed ? 0.85 : 1,
          })}>
          <ScanLine color={theme.white} size={20} />
          <Text style={{ color: theme.white, fontWeight: '800', fontSize: 16, marginLeft: 8 }}>
            Scan Creator Badge
          </Text>
        </Pressable>

        {/* Creators awaiting approval (limbo) */}
        <PendingCreators />

        {/* Pending submissions dashboard */}
        <PendingSubmissions />

        {/* Add challenge */}
        <Section title="Create Reward">
              <Field placeholder="Reward title" value={title} onChangeText={setTitle} />
              <Field placeholder="Description" value={desc} onChangeText={setDesc} />
              <Field
                placeholder="Reward points"
                value={points}
                onChangeText={setPoints}
                keyboardType="number-pad"
              />
              <Pressable
                onPress={onAddChallenge}
                disabled={addChallenge.isPending}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.cyan,
                  paddingVertical: 14,
                  borderRadius: 14,
                  marginTop: 4,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Plus color="#000" size={18} />
                <Text style={{ color: '#000', fontWeight: '800', fontSize: 15, marginLeft: 6 }}>
                  Add Reward
                </Text>
              </Pressable>
        </Section>

        {/* Manage existing challenges (end / delete) */}
        <ManageChallenges />

        {/* Danger zone */}
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            resetEvent.mutate(undefined, {
              onSuccess: () => Burnt.toast({ title: 'Event reset', preset: 'done' }),
            });
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: theme.pink,
            borderWidth: 1,
            paddingVertical: 14,
            borderRadius: 14,
            marginTop: 24,
            opacity: pressed ? 0.6 : 1,
          })}>
          <RotateCcw color={theme.pink} size={18} />
          <Text style={{ color: theme.pink, fontWeight: '800', marginLeft: 8 }}>Reset Event</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------- Creators management tab ----------

function CreatorsTab() {
  const { data: creators, isLoading, isError, refetch, isRefetching } = useLeaderboard();
  const awardPoints = useAwardPoints();

  const [selected, setSelected] = useState<Creator | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [byName, setByName] = useState('');

  const close = () => {
    setSelected(null);
    setAmount('');
    setNote('');
    setByName('');
  };

  const adjust = (direction: 1 | -1) => {
    if (!selected) return;
    const n = parseInt(amount, 10);
    if (!n || n <= 0) {
      Burnt.toast({ title: 'Enter an amount', preset: 'error' });
      return;
    }
    const who = byName.trim();
    if (!who) {
      Burnt.toast({ title: 'Enter your name', preset: 'error' });
      return;
    }
    const delta = direction * n;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    awardPoints.mutate(
      {
        creatorId: selected.id,
        action: direction > 0 ? `${who} added points` : `${who} removed points`,
        points: delta,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          Burnt.toast({
            title: `${delta > 0 ? '+' : ''}${delta} · ${selected.handle}`,
            preset: 'done',
          });
          close();
        },
        onError: (e: any) => Burnt.toast({ title: e?.message ?? 'Failed', preset: 'error' }),
      }
    );
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.pink}
          />
        }>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Users color={theme.cyan} size={18} />
          <Text style={{ color: theme.white, fontSize: 16, fontWeight: '800', marginLeft: 8 }}>
            Registered Creators{creators ? ` (${creators.length})` : ''}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={theme.pink} testID="creators-loading" />
        ) : isError ? (
          // Don't pretend the list is empty when the request actually failed —
          // a gateway blip would otherwise read as "no creators".
          <View testID="creators-error" style={{ alignItems: 'flex-start' }}>
            <Text style={{ color: theme.textDim, fontSize: 14, marginBottom: 12 }}>
              Couldn't load creators. Check your connection and try again.
            </Text>
            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.cyan,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 12,
                opacity: pressed ? 0.8 : 1,
              })}>
              <RotateCcw color="#000" size={16} />
              <Text style={{ color: '#000', fontWeight: '800', marginLeft: 6 }}>Retry</Text>
            </Pressable>
          </View>
        ) : !creators || creators.length === 0 ? (
          <Text style={{ color: theme.textDim, fontSize: 14 }}>No creators have joined yet.</Text>
        ) : (
          creators.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => {
                Haptics.selectionAsync();
                setAmount('');
                setNote('');
                setByName('');
                setSelected(c);
              }}
              testID={`creator-row-${c.id}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.surfaceElevated,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 14,
                marginBottom: 12,
                opacity: pressed ? 0.7 : 1,
              })}>
              <CreatorAvatar name={c.name} color={c.avatarColor} size={42} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: theme.white, fontWeight: '800', fontSize: 15 }}>{c.handle}</Text>
                <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 2 }}>{c.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Zap color={theme.pink} size={14} fill={theme.pink} />
                  <Text style={{ color: theme.pink, fontWeight: '900', fontSize: 16, marginLeft: 4 }}>
                    {c.totalPoints.toLocaleString()}
                  </Text>
                </View>
                <Text style={{ color: theme.textDim, fontSize: 11, marginTop: 2 }}>Tap to manage</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Adjust points modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={close}>
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
            testID="adjust-points-modal">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: theme.white, fontSize: 20, fontWeight: '900' }}>Adjust Points</Text>
              <Pressable onPress={close} hitSlop={12} testID="adjust-close">
                <X color={theme.textDim} size={24} />
              </Pressable>
            </View>

            {selected ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
                <CreatorAvatar name={selected.name} color={selected.avatarColor} size={40} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ color: theme.white, fontWeight: '800', fontSize: 16 }}>{selected.handle}</Text>
                  <Text style={{ color: theme.textDim, fontSize: 13 }}>
                    {selected.totalPoints.toLocaleString()} pts now
                  </Text>
                </View>
              </View>
            ) : null}

            <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 18, marginBottom: 8 }}>
              Enter an amount, then add or remove.
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 100"
              placeholderTextColor={theme.textDim}
              keyboardType="number-pad"
              testID="adjust-amount"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 14,
                paddingVertical: 16,
                paddingHorizontal: 18,
                color: theme.white,
                fontSize: 22,
                fontWeight: '800',
                textAlign: 'center',
                letterSpacing: 2,
              }}
            />

            <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 16, marginBottom: 8 }}>
              Your name — shown to the creator instead of "Host".
            </Text>
            <TextInput
              value={byName}
              onChangeText={setByName}
              placeholder="e.g. Alex"
              placeholderTextColor={theme.textDim}
              maxLength={40}
              autoCapitalize="words"
              testID="adjust-byname"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 16,
                color: theme.white,
                fontSize: 15,
                fontWeight: '700',
              }}
            />

            <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 16, marginBottom: 8 }}>
              Reason (optional) — creators will see this in their history.
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Bonus for best duet"
              placeholderTextColor={theme.textDim}
              maxLength={280}
              multiline
              testID="adjust-note"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 16,
                color: theme.white,
                fontSize: 15,
                minHeight: 48,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <Pressable
                onPress={() => adjust(-1)}
                disabled={awardPoints.isPending}
                testID="adjust-remove"
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: theme.pink,
                  paddingVertical: 15,
                  borderRadius: 14,
                  opacity: pressed || awardPoints.isPending ? 0.6 : 1,
                })}>
                <Minus color={theme.pink} size={18} />
                <Text style={{ color: theme.pink, fontWeight: '800', fontSize: 15, marginLeft: 6 }}>Remove</Text>
              </Pressable>
              <Pressable
                onPress={() => adjust(1)}
                disabled={awardPoints.isPending}
                testID="adjust-add"
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.cyan,
                  paddingVertical: 15,
                  borderRadius: 14,
                  opacity: pressed || awardPoints.isPending ? 0.7 : 1,
                })}>
                {awardPoints.isPending ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Plus color="#000" size={18} />
                    <Text style={{ color: '#000', fontWeight: '800', fontSize: 15, marginLeft: 6 }}>Add</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ---------- Pending creators (limbo approval queue) ----------

function PendingCreators() {
  const { data: pending, isLoading } = usePendingCreators();
  const approve = useApproveCreator();
  const reject = useRejectCreator();
  const [busyId, setBusyId] = useState<string | null>(null);

  const onApprove = (c: Creator) => {
    setBusyId(c.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    approve.mutate(c.id, {
      onSuccess: () => Burnt.toast({ title: `Approved · ${c.handle}`, preset: 'done' }),
      onError: (e: any) => Burnt.toast({ title: e?.message ?? 'Failed', preset: 'error' }),
      onSettled: () => setBusyId(null),
    });
  };

  const onReject = (c: Creator) => {
    setBusyId(c.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    reject.mutate(c.id, {
      onSuccess: () => Burnt.toast({ title: `Rejected · ${c.handle}`, preset: 'done' }),
      onError: (e: any) => Burnt.toast({ title: e?.message ?? 'Failed', preset: 'error' }),
      onSettled: () => setBusyId(null),
    });
  };

  const count = pending?.length ?? 0;

  return (
    <View
      style={{
        backgroundColor: theme.surfaceElevated,
        borderRadius: 20,
        padding: 18,
        marginTop: 18,
        borderWidth: 1,
        borderColor: theme.border,
      }}
      testID="pending-creators">
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <UserCheck color={theme.cyan} size={18} />
        <Text style={{ color: theme.white, fontSize: 16, fontWeight: '800', marginLeft: 8 }}>
          Approvals
        </Text>
        {count > 0 ? (
          <View
            style={{
              marginLeft: 8,
              backgroundColor: theme.pink,
              borderRadius: 999,
              minWidth: 22,
              height: 22,
              paddingHorizontal: 6,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: theme.white, fontWeight: '900', fontSize: 12 }}>{count}</Text>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.pink} testID="pending-creators-loading" />
      ) : count === 0 ? (
        <Text style={{ color: theme.textDim, fontSize: 14 }}>No one is waiting for approval.</Text>
      ) : (
        pending!.map((c) => (
          <View
            key={c.id}
            testID={`pending-creator-${c.id}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 12,
              marginBottom: 10,
            }}>
            <CreatorAvatar name={c.name} color={c.avatarColor} size={40} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: theme.white, fontWeight: '800', fontSize: 15 }}>{c.handle}</Text>
              <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 2 }}>{c.name}</Text>
            </View>
            {busyId === c.id ? (
              <ActivityIndicator color={theme.pink} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  onPress={() => onReject(c)}
                  testID={`reject-creator-${c.id}`}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.pink,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    opacity: pressed ? 0.6 : 1,
                  })}>
                  <X color={theme.pink} size={20} />
                </Pressable>
                <Pressable
                  onPress={() => onApprove(c)}
                  testID={`approve-creator-${c.id}`}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: theme.cyan,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Check color="#000" size={20} />
                </Pressable>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}

type SubView = 'pending' | 'history';

function PendingSubmissions() {
  const { data: pending, isLoading: pendingLoading } = usePendingSubmissions();
  const { data: reviewed, isLoading: reviewedLoading } = useReviewedSubmissions();
  const approve = useApproveSubmission();
  const reject = useRejectSubmission();
  // Track which row is mid-action so we only spin that card's buttons.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<SubView>('pending');

  const onApprove = (id: string, handle: string, points: number) => {
    setBusyId(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    approve.mutate(id, {
      onSuccess: () => Burnt.toast({ title: `Approved · +${points} to ${handle}`, preset: 'done' }),
      onError: (e: any) => Burnt.toast({ title: e?.message ?? 'Failed', preset: 'error' }),
      onSettled: () => setBusyId(null),
    });
  };

  const onReject = (id: string) => {
    setBusyId(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    reject.mutate(id, {
      onSuccess: () => Burnt.toast({ title: 'Submission rejected', preset: 'done' }),
      onError: (e: any) => Burnt.toast({ title: e?.message ?? 'Failed', preset: 'error' }),
      onSettled: () => setBusyId(null),
    });
  };

  const pendingCount = pending?.length ?? 0;
  const isPending = view === 'pending';
  const list = isPending ? pending : reviewed;
  const loading = isPending ? pendingLoading : reviewedLoading;

  return (
    <View
      style={{
        backgroundColor: theme.surfaceElevated,
        borderRadius: 20,
        padding: 18,
        marginTop: 18,
        borderWidth: 1,
        borderColor: theme.border,
      }}
      testID="pending-submissions">
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Inbox color={theme.cyan} size={18} />
        <Text style={{ color: theme.white, fontSize: 16, fontWeight: '800', marginLeft: 8 }}>
          Submissions
        </Text>
        {pendingCount > 0 ? (
          <View
            style={{
              marginLeft: 8,
              backgroundColor: theme.pink,
              borderRadius: 999,
              minWidth: 22,
              height: 22,
              paddingHorizontal: 6,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: theme.white, fontWeight: '900', fontSize: 12 }}>{pendingCount}</Text>
          </View>
        ) : null}
      </View>

      {/* Pending / History toggle */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 4,
          marginBottom: 14,
        }}>
        <SubTab
          label={pendingCount ? `Pending (${pendingCount})` : 'Pending'}
          active={isPending}
          onPress={() => setView('pending')}
          testID="subtab-pending"
        />
        <SubTab
          label="History"
          active={!isPending}
          onPress={() => setView('history')}
          testID="subtab-history"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.pink} testID="submissions-loading" />
      ) : !list || list.length === 0 ? (
        <Text style={{ color: theme.textDim, fontSize: 14 }}>
          {isPending ? 'No submissions waiting for review.' : 'No reviewed submissions yet.'}
        </Text>
      ) : (
        list.map((s) => (
          <SubmissionCard
            key={s.id}
            submission={s}
            busy={busyId === s.id}
            onApprove={isPending ? () => onApprove(s.id, s.creator.handle, s.challenge.rewardPoints) : undefined}
            onReject={isPending ? () => onReject(s.id) : undefined}
          />
        ))
      )}
    </View>
  );
}

// ---------- Manage challenges (end / delete) ----------

function ManageChallenges() {
  const { data: challenges, isLoading } = useAdminChallenges();
  const endChallenge = useEndChallenge();
  const deleteChallenge = useDeleteChallenge();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Challenge | null>(null);

  const onEnd = (ch: Challenge) => {
    setBusyId(ch.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    endChallenge.mutate(ch.id, {
      onSuccess: () => Burnt.toast({ title: 'Reward ended', preset: 'done' }),
      onError: (e: any) => Burnt.toast({ title: e?.message ?? 'Failed', preset: 'error' }),
      onSettled: () => setBusyId(null),
    });
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const ch = toDelete;
    setBusyId(ch.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    deleteChallenge.mutate(ch.id, {
      onSuccess: () => Burnt.toast({ title: 'Reward deleted', preset: 'done' }),
      onError: (e: any) => Burnt.toast({ title: e?.message ?? 'Failed', preset: 'error' }),
      onSettled: () => setBusyId(null),
    });
    setToDelete(null);
  };

  return (
    <Section title="Manage Rewards">
      {isLoading ? (
        <ActivityIndicator color={theme.pink} testID="manage-challenges-loading" />
      ) : !challenges || challenges.length === 0 ? (
        <Text style={{ color: theme.textDim, fontSize: 14 }}>No rewards yet.</Text>
      ) : (
        challenges.map((ch) => {
          const ended = ch.status === 'Ended';
          const busy = busyId === ch.id;
          return (
            <View
              key={ch.id}
              testID={`manage-challenge-${ch.id}`}
              style={{
                backgroundColor: theme.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 14,
                marginBottom: 10,
                opacity: ended ? 0.65 : 1,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Trophy color={ended ? theme.textDim : theme.cyan} size={16} />
                <Text
                  style={{ color: theme.white, fontWeight: '800', fontSize: 15, marginLeft: 8, flex: 1 }}
                  numberOfLines={1}>
                  {ch.title}
                </Text>
                <Zap color={theme.pink} size={13} fill={theme.pink} />
                <Text style={{ color: theme.pink, fontWeight: '800', fontSize: 13, marginLeft: 3 }}>
                  {ch.rewardPoints}
                </Text>
              </View>

              {ended ? (
                <Text style={{ color: theme.textDim, fontSize: 12, marginTop: 6, fontWeight: '700' }}>
                  ENDED · no longer accepting submissions
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                {!ended ? (
                  <Pressable
                    onPress={() => onEnd(ch)}
                    disabled={busy}
                    testID={`end-challenge-${ch.id}`}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: theme.cyan,
                      paddingVertical: 11,
                      borderRadius: 12,
                      opacity: pressed || busy ? 0.6 : 1,
                    })}>
                    {busy ? (
                      <ActivityIndicator color={theme.cyan} size="small" />
                    ) : (
                      <>
                        <Ban color={theme.cyan} size={16} />
                        <Text style={{ color: theme.cyan, fontWeight: '800', marginLeft: 6 }}>End</Text>
                      </>
                    )}
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setToDelete(ch);
                  }}
                  disabled={busy}
                  testID={`delete-challenge-${ch.id}`}
                  style={({ pressed }) => ({
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: theme.pink,
                    paddingVertical: 11,
                    borderRadius: 12,
                    opacity: pressed || busy ? 0.6 : 1,
                  })}>
                  <Trash2 color={theme.pink} size={16} />
                  <Text style={{ color: theme.pink, fontWeight: '800', marginLeft: 6 }}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      {/* Delete confirmation */}
      <Modal visible={!!toDelete} transparent animationType="fade" onRequestClose={() => setToDelete(null)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#000000AA' }}>
          <View
            testID="delete-challenge-modal"
            style={{
              backgroundColor: theme.surfaceElevated,
              borderRadius: 22,
              padding: 22,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <Text style={{ color: theme.white, fontSize: 19, fontWeight: '900' }}>Delete reward?</Text>
            <Text style={{ color: theme.textDim, fontSize: 14, marginTop: 10, lineHeight: 20 }}>
              "{toDelete?.title}" and all of its submissions will be permanently removed. Points already
              awarded to creators are kept. This can't be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <Pressable
                onPress={() => setToDelete(null)}
                testID="delete-cancel"
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingVertical: 13,
                  borderRadius: 12,
                  opacity: pressed ? 0.6 : 1,
                })}>
                <Text style={{ color: theme.white, fontWeight: '800' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                testID="delete-confirm"
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.pink,
                  paddingVertical: 13,
                  borderRadius: 12,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Trash2 color={theme.white} size={16} />
                <Text style={{ color: theme.white, fontWeight: '800', marginLeft: 6 }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Section>
  );
}

function SubTab({
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
        paddingVertical: 9,
        borderRadius: 9,
        backgroundColor: active ? theme.cyan : 'transparent',
        alignItems: 'center',
      }}>
      <Text style={{ color: active ? '#000' : theme.textDim, fontWeight: '800', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SubmissionCard({
  submission: s,
  busy,
  onApprove,
  onReject,
}: {
  submission: SubmissionWithDetails;
  busy: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const reviewable = !!onApprove && !!onReject;
  const approved = s.status === 'Approved';

  return (
    <View
      testID={`submission-${s.id}`}
      style={{
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.border,
      }}>
      {/* Creator + reward */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <CreatorAvatar name={s.creator.name} color={s.creator.avatarColor} size={40} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: theme.white, fontWeight: '800', fontSize: 15 }}>{s.creator.handle}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Text style={{ color: theme.textDim, fontSize: 13 }}>{s.challenge.title}</Text>
            <Zap color={theme.pink} size={13} fill={theme.pink} style={{ marginLeft: 8 }} />
            <Text style={{ color: theme.pink, fontWeight: '800', fontSize: 13, marginLeft: 3 }}>
              {s.challenge.rewardPoints}
            </Text>
          </View>
        </View>
        {/* Status badge in history view */}
        {!reviewable ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: approved ? '#00F2FE18' : '#FF005018',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
            }}>
            {approved ? (
              <CheckCircle2 color={theme.cyan} size={14} />
            ) : (
              <XCircle color={theme.pink} size={14} />
            )}
            <Text
              style={{
                color: approved ? theme.cyan : theme.pink,
                fontWeight: '800',
                fontSize: 12,
                marginLeft: 5,
              }}>
              {s.status}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Proof */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: theme.bg,
          borderRadius: 12,
          padding: 12,
          marginTop: 12,
        }}>
        <FileText color={theme.textDim} size={15} style={{ marginTop: 1 }} />
        <Text style={{ color: theme.white, fontSize: 13, marginLeft: 8, flex: 1, lineHeight: 18 }}>
          {s.proof}
        </Text>
      </View>

      {reviewable ? (
        /* Approve / Reject */
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Pressable
            onPress={onApprove}
            disabled={busy}
            testID={`approve-${s.id}`}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.cyan,
              paddingVertical: 12,
              borderRadius: 12,
              opacity: pressed || busy ? 0.7 : 1,
            })}>
            {busy ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Check color="#000" size={17} />
                <Text style={{ color: '#000', fontWeight: '800', marginLeft: 6 }}>Approve</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={onReject}
            disabled={busy}
            testID={`reject-${s.id}`}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: theme.pink,
              paddingVertical: 12,
              borderRadius: 12,
              opacity: pressed || busy ? 0.6 : 1,
            })}>
            <X color={theme.pink} size={17} />
            <Text style={{ color: theme.pink, fontWeight: '800', marginLeft: 6 }}>Reject</Text>
          </Pressable>
        </View>
      ) : s.reviewedAt ? (
        /* Reviewed timestamp in history view */
        <Text style={{ color: theme.textDim, fontSize: 12, marginTop: 10 }}>
          Reviewed {formatDistanceToNow(new Date(s.reviewedAt), { addSuffix: true })}
        </Text>
      ) : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: theme.surfaceElevated,
        borderRadius: 20,
        padding: 18,
        marginTop: 18,
        borderWidth: 1,
        borderColor: theme.border,
      }}>
      <Text style={{ color: theme.white, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={theme.textDim}
      {...props}
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 13,
        paddingHorizontal: 14,
        color: theme.white,
        fontSize: 15,
        marginBottom: 10,
      }}
    />
  );
}
