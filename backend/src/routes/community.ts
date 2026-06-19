import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../prisma";

const communityRouter = new Hono();

// Default challenges seeded the first time the API is hit.
const SEED_CHALLENGES = [
  { title: "Post a Duet", description: "Create a duet with another creator at the event.", rewardPoints: 150, icon: "Users" },
  { title: "Hit 10K Views", description: "Post a clip that reaches 10,000 views.", rewardPoints: 300, icon: "TrendingUp" },
  { title: "Use the Event Sound", description: "Publish a video using the official event audio.", rewardPoints: 100, icon: "Music" },
  { title: "Tag 3 Creators", description: "Collaborate by tagging 3 other attendees.", rewardPoints: 80, icon: "AtSign" },
  { title: "Go Live", description: "Host a live stream for at least 15 minutes.", rewardPoints: 250, icon: "Radio" },
  { title: "Behind the Scenes", description: "Share a BTS story from the creator lounge.", rewardPoints: 120, icon: "Clapperboard" },
];

async function ensureSeeded() {
  const count = await prisma.challenge.count();
  if (count === 0) {
    await prisma.challenge.createMany({ data: SEED_CHALLENGES });
  }
}

// Small helper: validate a JSON body, returning either the parsed value or a 400 response.
async function parseBody<T extends z.ZodTypeAny>(c: any, schema: T): Promise<z.infer<T> | Response> {
  const body = await c.req.json().catch(() => null);
  const result = schema.safeParse(body);
  if (!result.success) {
    return c.json({ error: { message: "Invalid request body", code: "VALIDATION" } }, 400);
  }
  return result.data;
}

const AVATAR_COLORS = ["#FF0050", "#00F2FE", "#A855F7", "#FB7185", "#34D399", "#FFD23F"];

// ---------- Creators / leaderboard ----------

// Leaderboard: only approved creators, ranked by points (desc).
// Pending/Rejected signups stay off the public board until a host approves them.
communityRouter.get("/leaderboard", async (c) => {
  const creators = await prisma.creator.findMany({
    where: { status: "Approved" },
    orderBy: [{ totalPoints: "desc" }, { createdAt: "asc" }],
  });
  return c.json({ data: creators });
});

// Creators awaiting host approval (the admin "limbo" queue), newest first.
communityRouter.get("/creators/pending", async (c) => {
  const creators = await prisma.creator.findMany({
    where: { status: "Pending" },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ data: creators });
});

// Single creator with their point logs (for the "Me" screen).
communityRouter.get("/creators/:id", async (c) => {
  const id = c.req.param("id");
  const creator = await prisma.creator.findUnique({ where: { id } });
  if (!creator) return c.json({ error: { message: "Creator not found", code: "NOT_FOUND" } }, 404);

  const logs = await prisma.pointLog.findMany({
    where: { creatorId: id },
    orderBy: { timestamp: "desc" },
  });
  // Rank is relative to other approved creators only.
  const higher = await prisma.creator.count({
    where: { status: "Approved", totalPoints: { gt: creator.totalPoints } },
  });
  return c.json({ data: { ...creator, rank: higher + 1, logs } });
});

// Approve a pending creator → they appear on the leaderboard and can use the app.
communityRouter.post("/creators/:id/approve", async (c) => {
  const id = c.req.param("id");
  const creator = await prisma.creator.findUnique({ where: { id } });
  if (!creator) return c.json({ error: { message: "Creator not found", code: "NOT_FOUND" } }, 404);

  const updated = await prisma.creator.update({ where: { id }, data: { status: "Approved" } });
  return c.json({ data: updated });
});

// Reject a pending creator → they stay off the board and are shown a "not approved" screen.
communityRouter.post("/creators/:id/reject", async (c) => {
  const id = c.req.param("id");
  const creator = await prisma.creator.findUnique({ where: { id } });
  if (!creator) return c.json({ error: { message: "Creator not found", code: "NOT_FOUND" } }, 404);

  const updated = await prisma.creator.update({ where: { id }, data: { status: "Rejected" } });
  return c.json({ data: updated });
});

// Register a creator for this device (used on first launch / onboarding).
communityRouter.post("/creators", async (c) => {
  const parsed = await parseBody(
    c,
    z.object({ name: z.string().min(1).max(40), handle: z.string().min(1).max(30) })
  );
  if (parsed instanceof Response) return parsed;

  const normalized = parsed.handle.startsWith("@") ? parsed.handle : `@${parsed.handle}`;
  const existing = await prisma.creator.findUnique({ where: { handle: normalized } });
  if (existing) {
    // Account recovery: if the same person re-enters their name + handle (e.g. after
    // reinstalling the app / switching devices, where the device lost its stored id),
    // log them back into their existing account instead of blocking them forever.
    // Their status (Pending/Approved/Rejected) is preserved, so the gate routes them
    // to the right screen on the new device.
    if (existing.name.trim().toLowerCase() === parsed.name.trim().toLowerCase()) {
      return c.json({ data: existing });
    }
    return c.json({ error: { message: "That handle is taken. If it's yours, enter the exact name you signed up with.", code: "HANDLE_TAKEN" } }, 409);
  }

  const total = await prisma.creator.count();
  const creator = await prisma.creator.create({
    data: { name: parsed.name, handle: normalized, avatarColor: AVATAR_COLORS[total % AVATAR_COLORS.length] },
  });
  return c.json({ data: creator }, 201);
});

// ---------- Challenges ----------

communityRouter.get("/challenges", async (c) => {
  await ensureSeeded();
  // Creators only see Active challenges; the admin console passes ?all=1 to
  // also see Ended ones so it can manage/delete them.
  const all = c.req.query("all") === "1" || c.req.query("all") === "true";
  const challenges = await prisma.challenge.findMany({
    where: all ? undefined : { status: "Active" },
    orderBy: { createdAt: "asc" },
  });
  return c.json({ data: challenges });
});

communityRouter.post("/challenges", async (c) => {
  const parsed = await parseBody(
    c,
    z.object({
      title: z.string().min(1).max(60),
      description: z.string().max(140).optional(),
      rewardPoints: z.number().int().positive(),
    })
  );
  if (parsed instanceof Response) return parsed;

  const challenge = await prisma.challenge.create({
    data: {
      title: parsed.title,
      description: parsed.description || "Custom event challenge",
      rewardPoints: parsed.rewardPoints,
      icon: "Sparkles",
    },
  });
  return c.json({ data: challenge }, 201);
});

// End a challenge → mark it Ended so creators can no longer submit for it.
// It stays in the system (history is preserved) but drops out of the active list.
communityRouter.post("/challenges/:id/end", async (c) => {
  const id = c.req.param("id");
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) return c.json({ error: { message: "Challenge not found", code: "NOT_FOUND" } }, 404);

  const updated = await prisma.challenge.update({
    where: { id },
    data: { status: "Ended" },
  });
  return c.json({ data: updated });
});

// Delete a challenge entirely. Its submissions cascade-delete (see schema);
// already-awarded points stay on creators' totals.
communityRouter.delete("/challenges/:id", async (c) => {
  const id = c.req.param("id");
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) return c.json({ error: { message: "Challenge not found", code: "NOT_FOUND" } }, 404);

  await prisma.challenge.delete({ where: { id } });
  return c.json({ data: { ok: true } });
});

// ---------- Points ----------

// Complete a challenge → award its reward points and log it.
communityRouter.post("/complete", async (c) => {
  const parsed = await parseBody(c, z.object({ creatorId: z.string(), challengeId: z.string() }));
  if (parsed instanceof Response) return parsed;

  const challenge = await prisma.challenge.findUnique({ where: { id: parsed.challengeId } });
  if (!challenge) return c.json({ error: { message: "Challenge not found", code: "NOT_FOUND" } }, 404);

  const [creator] = await prisma.$transaction([
    prisma.creator.update({
      where: { id: parsed.creatorId },
      data: { totalPoints: { increment: challenge.rewardPoints } },
    }),
    prisma.pointLog.create({
      data: { creatorId: parsed.creatorId, action: `Completed: ${challenge.title}`, pointsChanged: challenge.rewardPoints },
    }),
  ]);
  return c.json({ data: creator });
});

// Manual point award (admin host console).
communityRouter.post("/award", async (c) => {
  const parsed = await parseBody(
    c,
    z.object({
      creatorId: z.string(),
      action: z.string().min(1),
      points: z.number().int(),
      note: z.string().max(280).optional(),
    })
  );
  if (parsed instanceof Response) return parsed;

  const [creator] = await prisma.$transaction([
    prisma.creator.update({
      where: { id: parsed.creatorId },
      data: { totalPoints: { increment: parsed.points } },
    }),
    prisma.pointLog.create({
      data: {
        creatorId: parsed.creatorId,
        action: parsed.action,
        pointsChanged: parsed.points,
        note: parsed.note?.trim() || null,
      },
    }),
  ]);
  return c.json({ data: creator });
});

// ---------- Submissions ----------

// Creator submits proof for a challenge → goes into the Pending queue.
communityRouter.post("/submissions", async (c) => {
  const parsed = await parseBody(
    c,
    z.object({
      creatorId: z.string(),
      challengeId: z.string(),
      proof: z.string().min(1).max(500),
    })
  );
  if (parsed instanceof Response) return parsed;

  const challenge = await prisma.challenge.findUnique({ where: { id: parsed.challengeId } });
  if (!challenge) return c.json({ error: { message: "Challenge not found", code: "NOT_FOUND" } }, 404);

  const submission = await prisma.submission.create({
    data: { creatorId: parsed.creatorId, challengeId: parsed.challengeId, proof: parsed.proof.trim() },
  });
  return c.json({ data: submission }, 201);
});

// List submissions (default: Pending) with creator + challenge details for the admin queue.
communityRouter.get("/submissions", async (c) => {
  const status = c.req.query("status") ?? "Pending";
  const submissions = await prisma.submission.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    include: { creator: true, challenge: true },
  });
  return c.json({ data: submissions });
});

// Submissions a single creator has made (for their Rewards "pending" state).
communityRouter.get("/creators/:id/submissions", async (c) => {
  const id = c.req.param("id");
  const submissions = await prisma.submission.findMany({
    where: { creatorId: id },
    orderBy: { createdAt: "desc" },
    include: { challenge: true },
  });
  return c.json({ data: submissions });
});

// Approve → mark Approved, award the challenge's reward points, and log it.
communityRouter.post("/submissions/:id/approve", async (c) => {
  const id = c.req.param("id");
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { challenge: true },
  });
  if (!submission) return c.json({ error: { message: "Submission not found", code: "NOT_FOUND" } }, 404);
  if (submission.status !== "Pending") {
    return c.json({ error: { message: "Already reviewed", code: "ALREADY_REVIEWED" } }, 409);
  }

  const [updated] = await prisma.$transaction([
    prisma.submission.update({ where: { id }, data: { status: "Approved", reviewedAt: new Date() } }),
    prisma.creator.update({
      where: { id: submission.creatorId },
      data: { totalPoints: { increment: submission.challenge.rewardPoints } },
    }),
    prisma.pointLog.create({
      data: {
        creatorId: submission.creatorId,
        action: `Completed: ${submission.challenge.title}`,
        pointsChanged: submission.challenge.rewardPoints,
      },
    }),
  ]);
  return c.json({ data: updated });
});

// Reject → mark Rejected, no points awarded.
communityRouter.post("/submissions/:id/reject", async (c) => {
  const id = c.req.param("id");
  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) return c.json({ error: { message: "Submission not found", code: "NOT_FOUND" } }, 404);
  if (submission.status !== "Pending") {
    return c.json({ error: { message: "Already reviewed", code: "ALREADY_REVIEWED" } }, 409);
  }

  const updated = await prisma.submission.update({
    where: { id },
    data: { status: "Rejected", reviewedAt: new Date() },
  });
  return c.json({ data: updated });
});

// ---------- Admin reset ----------

communityRouter.post("/reset", async (c) => {
  await prisma.submission.deleteMany({});
  await prisma.pointLog.deleteMany({});
  await prisma.creator.deleteMany({});
  await prisma.challenge.deleteMany({});
  await prisma.challenge.createMany({ data: SEED_CHALLENGES });
  return c.json({ data: { ok: true } });
});

export { communityRouter };
