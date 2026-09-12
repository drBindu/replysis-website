import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  AggregateField,
  FieldPath,
  FieldValue,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";
import { clientIp, rateLimit } from "../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const MAX_REQUEST_BYTES = 32 * 1024;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;
const ONLINE_WINDOW_MS = 150_000;
const VALID_PLANS = new Set(["free", "pro", "max", "lifetime", "teams"]);
// Usage aggregation reads raw events and groups them here rather than asking
// Firestore for one aggregate per user, which would be a query per row on the
// page. The cap is what stops a busy month from turning the dashboard into a
// multi-megabyte read: past it the portal says the window is truncated instead
// of quietly showing a number that is too low.
const USAGE_MAX_EVENTS = 5_000;
const USAGE_DEFAULT_DAYS = 30;
const USAGE_MAX_DAYS = 180;

const BACKEND_INTERNAL_URL = (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
const ACCOUNT_DELETION_TOKEN = process.env.ACCOUNT_DELETION_TOKEN || "";

type AdminPrincipal = { uid: string; email: string };

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function getDb(): Firestore | null {
  if (getApps().length) return getFirestore();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyInput) {
    console.error("[admin] Firebase environment is incomplete");
    return null;
  }

  try {
    let privateKey = privateKeyInput;
    if (!privateKey.includes("-----BEGIN")) {
      privateKey = Buffer.from(privateKey, "base64").toString("utf8");
    }
    privateKey = privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n").trim();
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return getFirestore();
  } catch (error) {
    console.error("[admin] Firebase initialization failed", error);
    return null;
  }
}

function validUserId(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 128
    && !/[\u0000/]/.test(value);
}

function validCredits(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= 10_000;
}

function pageSize(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

async function parseJsonBody(req: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw new HttpError(413, "Request is too large");
  }

  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_BYTES) {
    throw new HttpError(413, "Request is too large");
  }

  try {
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError(400, "Invalid JSON");
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid JSON");
  }
}

async function verifyAdmin(req: Request): Promise<AdminPrincipal | null> {
  if (!ADMIN_EMAIL || !getDb()) {
    console.error("[admin] Administrator configuration is unavailable");
    return null;
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;

  try {
    const decoded = await getAuth().verifyIdToken(token);
    const email = (decoded.email ?? "").trim().toLowerCase();
    if (!decoded.email_verified || email !== ADMIN_EMAIL) return null;
    return { uid: decoded.uid, email };
  } catch (error) {
    console.error("[admin] Token verification failed", error);
    return null;
  }
}

function auditData(
  principal: AdminPrincipal,
  action: string,
  targetUserId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  return {
    action,
    targetUserId,
    actorUid: principal.uid,
    actorEmail: principal.email,
    before,
    after,
    createdAt: FieldValue.serverTimestamp(),
  };
}

function authTimestamp(value?: string): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function authMetadata(userIds: string[]) {
  const metadata: Record<string, { lastSignIn: number | null; created: number | null }> = {};
  if (!userIds.length) return metadata;

  try {
    const result = await getAuth().getUsers(userIds.map((uid) => ({ uid })));
    for (const user of result.users) {
      metadata[user.uid] = {
        lastSignIn: authTimestamp(user.metadata.lastSignInTime),
        created: authTimestamp(user.metadata.creationTime),
      };
    }
  } catch (error) {
    console.error("[admin] Auth metadata lookup failed", error);
  }
  return metadata;
}

async function deleteDocumentsByField(db: Firestore, collection: string, field: string, value: string) {
  while (true) {
    const snapshot = await db.collection(collection)
      .where(field, "==", value)
      .limit(400)
      .get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snapshot.size < 400) return;
  }
}

async function deleteBackendResumes(userId: string) {
  if (!BACKEND_INTERNAL_URL || !ACCOUNT_DELETION_TOKEN) {
    throw new HttpError(503, "Account deletion service is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(
      `${BACKEND_INTERNAL_URL}/api/v1/resume/internal/users/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: { "X-Account-Deletion-Token": ACCOUNT_DELETION_TOKEN },
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      console.error("[admin] Backend resume deletion failed", response.status);
      throw new HttpError(503, "Account deletion service is unavailable");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("[admin] Backend resume deletion request failed", error);
    throw new HttpError(503, "Account deletion service is unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

type UsageRow = {
  credits: number;       // net, refunds already subtracted
  charged: number;       // gross, before refunds
  refunded: number;      // positive number, what came back
  events: number;
  refunds: number;
  promptTokens: number;
  completionTokens: number;
  // Tokens per model, so a cost can be worked out at each model's own rate
  // rather than one blended guess across providers.
  tokensByModel: Record<string, { prompt: number; completion: number }>;
  byAction: Record<string, number>;
  byModel: Record<string, number>;
  lastAt: number | null;
  guest: boolean;
};

function emptyUsageRow(guest: boolean): UsageRow {
  return {
    credits: 0, charged: 0, refunded: 0, events: 0, refunds: 0,
    promptTokens: 0, completionTokens: 0, tokensByModel: {},
    byAction: {}, byModel: {}, lastAt: null, guest,
  };
}

/**
 * Per-identity and whole-product usage over a window.
 *
 * Charges and refunds are separate rows by design, so a net figure alone would
 * hide how often an answer was paid for and then failed. Both are returned:
 * `credits` is what was kept, `charged` and `refunded` are what happened.
 */
async function usageView(db: Firestore, days: number) {
  const since = new Date(Date.now() - days * 86_400_000);

  const snapshot = await db.collection("usage_events")
    .where("createdAt", ">=", since)
    .orderBy("createdAt", "desc")
    .limit(USAGE_MAX_EVENTS + 1)
    .get();

  const truncated = snapshot.docs.length > USAGE_MAX_EVENTS;
  const docs = truncated ? snapshot.docs.slice(0, USAGE_MAX_EVENTS) : snapshot.docs;

  const byIdentity: Record<string, UsageRow> = {};
  const totals = emptyUsageRow(false);
  const byDay: Record<string, number> = {};
  const recent: any[] = [];

  for (const doc of docs) {
    const d = doc.data();
    const id = typeof d.identityId === "string" ? d.identityId : "";
    if (!id) continue;

    const credits = Number(d.credits) || 0;
    const isRefund = credits < 0;
    const action = typeof d.action === "string" ? d.action : "unknown";
    const model = typeof d.model === "string" && d.model ? d.model : "unknown";
    const at = d.createdAt?.toMillis?.() ?? null;

    const promptTokens = Number(d.promptTokens) || 0;
    const completionTokens = Number(d.completionTokens) || 0;

    const row = byIdentity[id] ?? (byIdentity[id] = emptyUsageRow(Boolean(d.guest)));
    for (const target of [row, totals]) {
      target.credits += credits;
      target.events += 1;
      if (isRefund) { target.refunded += -credits; target.refunds += 1; }
      else          { target.charged  += credits; }
      target.byAction[action] = (target.byAction[action] ?? 0) + 1;
      target.byModel[model]   = (target.byModel[model] ?? 0) + 1;

      // Tokens are counted on refunded rows too. The provider ran and billed us
      // whether or not the customer was charged in the end, and the point of
      // this number is what the traffic cost, not what it earned.
      target.promptTokens += promptTokens;
      target.completionTokens += completionTokens;
      if (promptTokens || completionTokens) {
        const bucket = target.tokensByModel[model]
          ?? (target.tokensByModel[model] = { prompt: 0, completion: 0 });
        bucket.prompt += promptTokens;
        bucket.completion += completionTokens;
      }
    }
    if (at && (row.lastAt === null || at > row.lastAt)) row.lastAt = at;
    if (at && (totals.lastAt === null || at > totals.lastAt)) totals.lastAt = at;

    const day = typeof d.day === "string" ? d.day : null;
    if (day && !isRefund) byDay[day] = (byDay[day] ?? 0) + credits;

    // A short feed so the portal can show what just happened without a
    // second round trip.
    if (recent.length < 100) {
      recent.push({
        identityId: id,
        email: typeof d.email === "string" ? d.email : null,
        guest: Boolean(d.guest),
        action, model,
        provider: typeof d.provider === "string" ? d.provider : null,
        credits, at,
        promptTokens, completionTokens,
      });
    }
  }

  return {
    window: { days, since: since.toISOString(), truncated, eventsScanned: docs.length },
    totals,
    byIdentity,
    byDay,
    recent,
  };
}

export async function GET(req: Request) {
  const limit = rateLimit(`admin:${clientIp(req)}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const principal = await verifyAdmin(req);
  if (!principal) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const query = new URL(req.url).searchParams;

  if (query.get("view") === "usage") {
    const requestedDays = Number(query.get("days"));
    const days = Number.isSafeInteger(requestedDays) && requestedDays > 0
      ? Math.min(requestedDays, USAGE_MAX_DAYS)
      : USAGE_DEFAULT_DAYS;
    try {
      return NextResponse.json(await usageView(db, days));
    } catch (error) {
      // The range query needs a createdAt index. Say so plainly rather than
      // returning a generic 500 that looks like the portal is broken.
      console.error("[admin] Usage query failed", error);
      return NextResponse.json(
        { error: "Unable to load usage. If this is the first run, Firestore may still be building the usage_events index." },
        { status: 500 },
      );
    }
  }

  const cursor = query.get("cursor");
  if (cursor !== null && !validUserId(cursor)) {
    return NextResponse.json({ error: "Invalid page cursor" }, { status: 400 });
  }

  const requestedPageSize = pageSize(query.get("limit"));
  let usersQuery = db.collection("users")
    .orderBy(FieldPath.documentId())
    .limit(requestedPageSize + 1);
  if (cursor) usersQuery = usersQuery.startAfter(cursor);

  try {
    const users = db.collection("users");
    const downloads = db.collection("app_downloads");
    const activeSince = new Date(Date.now() - ONLINE_WINDOW_MS);
    const [
      userPage,
      userCount,
      paidCount,
      proCount,
      maxCount,
      usage,
      liveCount,
      winDownloads,
      macDownloads,
    ] = await Promise.all([
      usersQuery.get(),
      users.count().get(),
      users.where("plan", "in", ["pro", "max", "lifetime", "teams"]).count().get(),
      users.where("plan", "==", "pro").count().get(),
      users.where("plan", "==", "max").count().get(),
      users.aggregate({ totalDurationSeconds: AggregateField.sum("totalDurationSeconds") }).get(),
      users.where("lastActive", ">=", activeSince).count().get(),
      downloads.where("os", "==", "win").count().get(),
      downloads.where("os", "==", "mac").count().get(),
    ]);

    const hasMore = userPage.docs.length > requestedPageSize;
    const listedDocs = userPage.docs.slice(0, requestedPageSize);
    const metadata = await authMetadata(listedDocs.map((doc) => doc.id));

    return NextResponse.json({
      users: listedDocs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          authLastSignIn: metadata[doc.id]?.lastSignIn ?? null,
          authCreated: metadata[doc.id]?.created ?? null,
          realUsageMinutes: Math.round((Number(data.totalDurationSeconds) || 0) / 60),
        };
      }),
      metrics: {
        users: userCount.data().count,
        paidUsers: paidCount.data().count,
        // Split so the portal can price revenue. Counted server side because
        // the user list is paginated and a page of 100 cannot be summed into a
        // figure that describes the whole product.
        proUsers: proCount.data().count,
        maxUsers: maxCount.data().count,
        liveUsers: liveCount.data().count,
        totalUsageMinutes: Math.round((Number(usage.data().totalDurationSeconds) || 0) / 60),
        winDownloads: winDownloads.data().count,
        macDownloads: macDownloads.data().count,
      },
      page: {
        nextCursor: hasMore ? listedDocs.at(-1)?.id ?? null : null,
        pageSize: requestedPageSize,
      },
    });
  } catch (error) {
    console.error("[admin] Dashboard query failed", error);
    return NextResponse.json({ error: "Unable to load dashboard data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limit = rateLimit(`admin:write:${clientIp(req)}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const principal = await verifyAdmin(req);
  if (!principal) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  try {
    const body = await parseJsonBody(req);
    const action = body.action;
    const userId = body.userId;
    if (!validUserId(userId)) throw new HttpError(400, "Invalid userId");

    const userRef = db.collection("users").doc(userId);
    const auditRef = db.collection("admin_audit").doc();

    if (action === "updatePlan") {
      const plan = body.plan;
      const credits = body.credits;
      if (typeof plan !== "string" || !VALID_PLANS.has(plan) || !validCredits(credits)) {
        throw new HttpError(400, "Invalid plan or credits");
      }

      await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(userRef);
        if (!existing.exists) throw new HttpError(404, "User not found");
        const current = existing.data() ?? {};
        transaction.update(userRef, { plan, credits });
        transaction.set(auditRef, auditData(
          principal,
          "updatePlan",
          userId,
          { plan: current.plan ?? "free", credits: Number(current.credits) || 0 },
          { plan, credits },
        ));
      });
      return NextResponse.json({ success: true });
    }

    if (action === "updateCredits") {
      const credits = body.credits;
      if (!validCredits(credits)) throw new HttpError(400, "Invalid credits");

      await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(userRef);
        if (!existing.exists) throw new HttpError(404, "User not found");
        const current = existing.data() ?? {};
        transaction.update(userRef, { credits });
        transaction.set(auditRef, auditData(
          principal,
          "updateCredits",
          userId,
          { credits: Number(current.credits) || 0 },
          { credits },
        ));
      });
      return NextResponse.json({ success: true });
    }

    if (action === "deleteUser") {
      if (userId === principal.uid) throw new HttpError(400, "You cannot delete the active administrator account");

      const existing = await userRef.get();
      if (!existing.exists) throw new HttpError(404, "User not found");

      const userData = existing.data() ?? {};
      let email = typeof userData.email === "string" ? userData.email : "";
      try {
        const target = await getAuth().getUser(userId);
        email = target.email ?? email;
        await getAuth().updateUser(userId, { disabled: true });
      } catch (error: any) {
        if (error?.code !== "auth/user-not-found") {
          console.error("[admin] Firebase account disable failed", error);
          throw new HttpError(500, "Unable to disable the authentication account");
        }
      }

      await deleteBackendResumes(userId);
      if (email) {
        await deleteDocumentsByField(db, "api_usage_logs", "userEmail", email);
        await deleteDocumentsByField(db, "interview_sessions", "userEmail", email);
      }
      try {
        await getAuth().deleteUser(userId);
      } catch (error: any) {
        if (error?.code !== "auth/user-not-found") {
          console.error("[admin] Firebase account deletion failed", error);
          throw new HttpError(500, "Authentication account deletion needs retry");
        }
      }
      await db.runTransaction(async (transaction) => {
        transaction.delete(userRef);
        transaction.set(auditRef, auditData(
          principal,
          "deleteUser",
          userId,
          { plan: userData.plan ?? "free", credits: Number(userData.credits) || 0 },
          null,
        ));
      });
      return NextResponse.json({ success: true });
    }

    throw new HttpError(400, "Unknown action");
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin] Mutation failed", error);
    return NextResponse.json({ error: "Admin operation failed" }, { status: 500 });
  }
}
