import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, isTransientError } from "./api";
import type {
  Creator,
  Challenge,
  CreatorDetail,
  Submission,
  SubmissionWithDetails,
  SubmissionForCreator,
} from "./types";

// ---------- Queries ----------

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => api.get<Creator[]>("/api/community/leaderboard"),
    refetchInterval: 5000, // keep the shared leaderboard live across phones
    // Gateway cold-starts can briefly 502; keep retrying so the host console
    // never gets stuck on a stale "no creators" state after a transient blip.
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

export function useCreator(id: string | null) {
  return useQuery({
    queryKey: ["creator", id],
    queryFn: () => api.get<CreatorDetail>(`/api/community/creators/${id}`),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useChallenges() {
  return useQuery({
    queryKey: ["challenges"],
    queryFn: () => api.get<Challenge[]>("/api/community/challenges"),
  });
}

// Admin view: all challenges including Ended ones, so hosts can manage them.
export function useAdminChallenges() {
  return useQuery({
    queryKey: ["challenges", "all"],
    queryFn: () => api.get<Challenge[]>("/api/community/challenges?all=1"),
    refetchInterval: 5000,
  });
}

// Creators awaiting host approval (the admin "limbo" queue).
export function usePendingCreators() {
  return useQuery({
    queryKey: ["creators", "pending"],
    queryFn: () => api.get<Creator[]>("/api/community/creators/pending"),
    refetchInterval: 5000,
  });
}

// Pending submissions queue for the admin dashboard.
export function usePendingSubmissions() {
  return useQuery({
    queryKey: ["submissions", "Pending"],
    queryFn: () => api.get<SubmissionWithDetails[]>("/api/community/submissions?status=Pending"),
    refetchInterval: 5000,
  });
}

// Reviewed submissions (Approved + Rejected) for the admin history view,
// newest decision first.
export function useReviewedSubmissions() {
  return useQuery({
    queryKey: ["submissions", "reviewed"],
    queryFn: async () => {
      const [approved, rejected] = await Promise.all([
        api.get<SubmissionWithDetails[]>("/api/community/submissions?status=Approved"),
        api.get<SubmissionWithDetails[]>("/api/community/submissions?status=Rejected"),
      ]);
      return [...approved, ...rejected].sort(
        (a, b) =>
          new Date(b.reviewedAt ?? b.createdAt).getTime() -
          new Date(a.reviewedAt ?? a.createdAt).getTime()
      );
    },
    refetchInterval: 5000,
  });
}

// A creator's own submissions (to show pending/approved state on Rewards).
export function useMySubmissions(creatorId: string | null) {
  return useQuery({
    queryKey: ["my-submissions", creatorId],
    queryFn: () => api.get<SubmissionForCreator[]>(`/api/community/creators/${creatorId}/submissions`),
    enabled: !!creatorId,
    refetchInterval: 5000,
  });
}

// ---------- Mutations ----------

// Invalidate everything that point changes affect.
function useRefreshAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
    qc.invalidateQueries({ queryKey: ["creator"] });
    qc.invalidateQueries({ queryKey: ["challenges"] });
    qc.invalidateQueries({ queryKey: ["submissions"] });
    qc.invalidateQueries({ queryKey: ["my-submissions"] });
  };
}

export function useRegisterCreator() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (body: { name: string; handle: string }) =>
      api.post<Creator>("/api/community/creators", body),
    onSuccess: refresh,
  });
}

// Approve / reject a pending creator from the admin console.
function useRefreshCreators() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["creators", "pending"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
    qc.invalidateQueries({ queryKey: ["creator"] });
  };
}

export function useApproveCreator() {
  const refresh = useRefreshCreators();
  return useMutation({
    mutationFn: (id: string) => api.post<Creator>(`/api/community/creators/${id}/approve`, {}),
    onSuccess: refresh,
  });
}

export function useRejectCreator() {
  const refresh = useRefreshCreators();
  return useMutation({
    mutationFn: (id: string) => api.post<Creator>(`/api/community/creators/${id}/reject`, {}),
    onSuccess: refresh,
  });
}

export function useCompleteChallenge() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (body: { creatorId: string; challengeId: string }) =>
      api.post<Creator>("/api/community/complete", body),
    onSuccess: refresh,
  });
}

export function useAwardPoints() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (body: { creatorId: string; action: string; points: number; note?: string }) =>
      api.post<Creator>("/api/community/award", body),
    onSuccess: refresh,
  });
}

export function useAddChallenge() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (body: { title: string; description?: string; rewardPoints: number }) =>
      api.post<Challenge>("/api/community/challenges", body),
    onSuccess: refresh,
  });
}

// A 502/503/504 means the request never reached the backend (gateway hiccup /
// cold start), so it's safe to retry. Retry up to 3 times with a short backoff.
async function postWithGatewayRetry<T>(url: string, body: any, tries = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await api.post<T>(url, body);
    } catch (e: any) {
      const transient = /\((50[234])\)/.test(e?.message ?? "");
      if (!transient || attempt >= tries) throw e;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

export function useSubmitProof() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (body: { creatorId: string; challengeId: string; proof: string }) =>
      postWithGatewayRetry<Submission>("/api/community/submissions", body),
    onSuccess: refresh,
  });
}

export function useApproveSubmission() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (id: string) => api.post<Submission>(`/api/community/submissions/${id}/approve`, {}),
    onSuccess: refresh,
  });
}

export function useRejectSubmission() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (id: string) => api.post<Submission>(`/api/community/submissions/${id}/reject`, {}),
    onSuccess: refresh,
  });
}

export function useEndChallenge() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (id: string) => api.post<Challenge>(`/api/community/challenges/${id}/end`, {}),
    retry: (count, error) => count < 3 && isTransientError(error),
    retryDelay: (count) => 500 * 2 ** count,
    onSuccess: refresh,
  });
}

export function useDeleteChallenge() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/community/challenges/${id}`),
    // A transient 502/503/504 (backend briefly restarting) shouldn't surface as a
    // failure — retry a few times with backoff before giving up.
    retry: (count, error) => count < 3 && isTransientError(error),
    retryDelay: (count) => 500 * 2 ** count,
    onSuccess: refresh,
  });
}

export function useResetEvent() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean }>("/api/community/reset", {}),
    onSuccess: refresh,
  });
}
