// Shapes returned by the /api/community backend routes.

export type CreatorStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Creator {
  id: string;
  handle: string;
  name: string;
  totalPoints: number;
  avatarColor: string;
  status: CreatorStatus;
  createdAt: string;
}

export type ChallengeStatus = 'Active' | 'Ended';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  icon: string;
  status: ChallengeStatus;
  createdAt: string;
}

export interface PointLog {
  id: string;
  creatorId: string;
  action: string;
  note?: string | null;
  pointsChanged: number;
  timestamp: string;
}

export interface CreatorDetail extends Creator {
  rank: number;
  logs: PointLog[];
}

export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Submission {
  id: string;
  creatorId: string;
  challengeId: string;
  proof: string;
  status: SubmissionStatus;
  createdAt: string;
  reviewedAt: string | null;
}

// Pending queue entries include the joined creator + challenge.
export interface SubmissionWithDetails extends Submission {
  creator: Creator;
  challenge: Challenge;
}

// A creator's own submission includes the challenge it's for.
export interface SubmissionForCreator extends Submission {
  challenge: Challenge;
}
