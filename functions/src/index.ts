import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { auth } from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { createTransport } from 'nodemailer';

export { ssrApp } from './ssr';

admin.initializeApp();
const db = admin.firestore();

// ── Auth trigger: auto-register new users as basic/unauthorized ─────────────

export const onUserCreate = auth.user().onCreate(async (user) => {
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: user.email ?? '',
    role: 'basic',
    authorized: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  await admin.auth().setCustomUserClaims(user.uid, { role: 'basic', authorized: false });
});

// ── acceptInvitation: claim an invite, set nickname, update claims ──────────

export const acceptInvitation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { inviteId, nickname } = request.data as { inviteId: string; nickname: string };
  const uid = request.auth.uid;
  const email = request.auth.token['email'] as string ?? '';

  if (!nickname || nickname.length > 32 || !/^[a-z0-9-]+$/.test(nickname)) {
    throw new HttpsError(
      'invalid-argument',
      'Nickname must be non-empty, max 32 chars, lowercase alphanumeric and hyphens only.'
    );
  }

  const inviteRef = db.collection('invitations').doc(inviteId);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    throw new HttpsError('not-found', 'Invitation not found.');
  }

  const invite = inviteSnap.data()!;
  if (invite['usedBy']) {
    throw new HttpsError('already-exists', 'Invitation already used.');
  }

  const role: string = invite['role'];
  const nicknameRef = db.collection('nicknames').doc(nickname);

  const result = await db.runTransaction(async (tx) => {
    const nicknameSnap = await tx.get(nicknameRef);
    if (nicknameSnap.exists) {
      const suggestion = `${nickname}-${Math.floor(Math.random() * 9000) + 1000}`;
      return { taken: true, suggestion };
    }

    tx.set(nicknameRef, { uid });
    tx.set(db.collection('users').doc(uid), {
      uid,
      nickname,
      role,
      email,
      authorized: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(inviteRef, {
      usedBy: uid,
      usedAt: FieldValue.serverTimestamp(),
    });

    return { taken: false };
  });

  if (result.taken) return result;

  await admin.auth().setCustomUserClaims(uid, { role, authorized: true });
  return { success: true };
});

// ── createInvitation: admin creates a shareable invite link ────────────────

export const createInvitation = onCall(async (request) => {
  if (!request.auth || request.auth.token['role'] !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin only.');
  }

  const { role } = request.data as { role: 'editor' | 'basic' };
  if (role !== 'editor' && role !== 'basic') {
    throw new HttpsError('invalid-argument', 'Role must be editor or basic.');
  }

  const ref = await db.collection('invitations').add({
    role,
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { id: ref.id };
});

// ── authorizeUser: admin/editor authorizes a pending basic user ────────────

export const authorizeUser = onCall(async (request) => {
  const callerRole = request.auth?.token['role'];
  if (callerRole !== 'admin' && callerRole !== 'editor') {
    throw new HttpsError('permission-denied', 'Admin or editor only.');
  }

  const { uid } = request.data as { uid: string };
  const userRecord = await admin.auth().getUser(uid);
  const currentClaims = userRecord.customClaims ?? {};

  await admin.auth().setCustomUserClaims(uid, { ...currentClaims, authorized: true });
  await db.collection('users').doc(uid).update({ authorized: true });

  return { success: true };
});

// ── deauthorizeUser: admin blocks/revokes access from a user ─────────────

export const deauthorizeUser = onCall(async (request) => {
  const callerRole = request.auth?.token['role'];
  if (callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin only.');
  }

  const { uid } = request.data as { uid: string };
  const userRecord = await admin.auth().getUser(uid);
  const currentClaims = userRecord.customClaims ?? {};

  await admin.auth().setCustomUserClaims(uid, { ...currentClaims, authorized: false });
  await db.collection('users').doc(uid).update({ authorized: false });

  return { success: true };
});

// Initialize Anthropic client — key is in Firebase Functions config
// Set it with: firebase functions:secrets:set ANTHROPIC_API_KEY
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Tool execution ─────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'create_item': {
      const ref = await db.collection('items').add({
        ...input,
        status: 'available',
        createdAt: FieldValue.serverTimestamp(),
      });
      return { success: true, id: ref.id, message: `Created item "${input['name']}" with ID ${ref.id}` };
    }

    case 'update_item': {
      const { id, ...updates } = input as { id: string; [key: string]: unknown };
      await db.collection('items').doc(id).update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { success: true, message: `Updated item ${id}` };
    }

    case 'delete_item': {
      const { id } = input as { id: string };
      await db.collection('items').doc(id).delete();
      return { success: true, message: `Deleted item ${id}` };
    }

    case 'list_items': {
      const { status_filter = 'all' } = input as { status_filter?: string };
      let query: admin.firestore.Query = db.collection('items').orderBy('createdAt', 'desc');
      if (status_filter !== 'all') {
        query = db.collection('items').where('status', '==', status_filter);
      }
      const snapshot = await query.get();
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { items, count: items.length };
    }

    case 'create_update': {
      const ref = await db.collection('updates').add({
        ...input,
        author: 'Leo',
        publishedAt: FieldValue.serverTimestamp(),
      });
      return { success: true, id: ref.id, message: `Created update "${input['title']}"` };
    }

    case 'delete_update': {
      const { id } = input as { id: string };
      await db.collection('updates').doc(id).delete();
      return { success: true, message: `Deleted update ${id}` };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Cloud Function ──────────────────────────────────────────────────────────

export const agent = onRequest(
  { secrets: ['ANTHROPIC_API_KEY'], timeoutSeconds: 120 },
  async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Verify Firebase ID token — only users with role:'admin' custom claim may call this
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const decodedToken = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
      if (decodedToken['role'] !== 'admin') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { messages, tools } = req.body;

    try {
      // Agentic loop — Claude may use tools multiple times
      let currentMessages = [...messages];
      const toolsExecuted: Array<{ toolName: string; input: unknown; result: unknown }> = [];

      const MAX_TOOL_ITERATIONS = 10;
      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        const response = await anthropic.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 4096,
          system: `You are Leo & Emily's Moving Day assistant. Leo and Emily are moving together and you help them manage:
1. A donation showcase — items they're giving away for free
2. Moving updates — blog posts explaining what's happening
3. The dibs system — tracking who claimed what

Be friendly, efficient, and proactive. When asked to add items, write good descriptions
and suggest appropriate tags. When writing updates, make them warm and engaging.
Always confirm what you did after taking actions.`,
          messages: currentMessages,
          tools: tools,
        });

        // Final text response — stop the loop
        if (response.stop_reason !== 'tool_use') {
          const textContent = response.content.find((c) => c.type === 'text');
          const reply = textContent?.type === 'text' ? textContent.text : 'Done!';
          res.json({ reply, toolsExecuted });
          return;
        }

        // Execute all requested tools and feed results back into the conversation
        const toolUseBlocks = response.content.filter((c) => c.type === 'tool_use');
        const toolResults = [];

        for (const toolUse of toolUseBlocks) {
          if (toolUse.type !== 'tool_use') continue;
          const result = await executeTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>
          );
          toolsExecuted.push({ toolName: toolUse.name, input: toolUse.input, result });
          toolResults.push({
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        }

        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ];
      }

      res.status(500).json({ error: 'Agent exceeded maximum tool iterations' });
    } catch (error) {
      console.error('Agent error:', error);
      res.status(500).json({ error: 'Agent failed', details: String(error) });
    }
  });

// ── processUploadedImage: server-side Sharp resize + AVIF encode ────────────
// Accepts a base64-encoded image, auto-orients it from EXIF metadata, produces
// sm (370px) and lg (450px) AVIF variants using libavif via Sharp, uploads to
// Firebase Storage, and returns URLs.

const SM_MAX = 370;
const LG_MAX = 450;
const AVIF_QUALITY = 50; // libavif CQ scale (0-100); 50 ≈ visually lossless for thumbnails

async function resizeToAvif(input: Buffer, maxDim: number): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
    .avif({ quality: AVIF_QUALITY })
    .toBuffer();
}

async function uploadToStorage(buffer: Buffer, filename: string): Promise<string> {
  // admin.storage().bucket() with no args triggers a Cloud Resource Manager API
  // lookup for the default bucket — this fails with demo-* emulator projects.
  // Instead, resolve the bucket name from app options (populated via FIREBASE_CONFIG
  // in production) or fall back to the project-id-derived name for the emulator.
  const bucketName =
    admin.app().options.storageBucket ?? `${process.env['GCLOUD_PROJECT']}.appspot.com`;
  const bucket = admin.storage().bucket(bucketName);
  const file = bucket.file(`items/${filename}`);
  await file.save(buffer, {
    metadata: {
      contentType: 'image/avif',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  const encodedPath = encodeURIComponent(file.name);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
}

export const processUploadedImage = onCall(
  { timeoutSeconds: 120, memory: '512MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }
    const role = request.auth.token['role'];
    if (role !== 'admin' && role !== 'editor') {
      throw new HttpsError('permission-denied', 'Admin or editor only.');
    }

    const { data: base64, contentType } = request.data as { data: string; contentType: string };
    if (!base64 || !contentType) {
      throw new HttpsError('invalid-argument', 'data and contentType are required.');
    }

    const input = Buffer.from(base64, 'base64');
    const id = crypto.randomUUID();

    const [smBuffer, lgBuffer] = await Promise.all([
      resizeToAvif(input, SM_MAX),
      resizeToAvif(input, LG_MAX),
    ]);

    const [sm, lg] = await Promise.all([
      uploadToStorage(smBuffer, `${id}-sm.avif`),
      uploadToStorage(lgBuffer, `${id}-lg.avif`),
    ]);

    return { sm, lg };
  }
);

// ── onItemUpdate: create notification when dibs status changes ──────────────

export const onItemUpdate = onDocumentUpdated('items/{itemId}', async (event) => {
  if (!event.data) return;

  const before = event.data.before.data();
  const after = event.data.after.data();
  const itemId = event.params.itemId;

  if (before['status'] === after['status']) return;

  // available → claimed
  if (before['status'] === 'available' && after['status'] === 'claimed' && after['claimedBy']) {
    await db.collection('notifications').add({
      type: 'dibs_called',
      itemId,
      itemName: after['name'] ?? 'Unknown item',
      userId: after['claimedBy']['uid'] ?? '',
      userName: after['claimedBy']['name'] ?? 'Someone',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // claimed → available
  if (before['status'] === 'claimed' && after['status'] === 'available' && before['claimedBy']) {
    await db.collection('notifications').add({
      type: 'dibs_released',
      itemId,
      itemName: before['name'] ?? 'Unknown item',
      userId: before['claimedBy']['uid'] ?? '',
      userName: before['claimedBy']['name'] ?? 'Someone',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
});

// ── dailySnapshot: compare items against yesterday, email diff to admin ─────

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function buildDiffHtml(diff: {
  added: Array<{ name: string }>;
  removed: Array<{ name: string }>;
  claimed: Array<{ name: string; claimedBy: string }>;
  released: Array<{ name: string }>;
}, date: string): string {
  const section = (title: string, rows: string[]) =>
    rows.length
      ? `<h3 style="margin:16px 0 8px;color:#333">${title} (${rows.length})</h3><ul>${rows.map(r => `<li>${r}</li>`).join('')}</ul>`
      : '';

  const body = [
    section('New items', diff.added.map(i => i.name)),
    section('Removed items', diff.removed.map(i => i.name)),
    section('Newly claimed', diff.claimed.map(i => `<strong>${i.name}</strong> — by ${i.claimedBy}`)),
    section('Released', diff.released.map(i => i.name)),
  ].filter(Boolean).join('');

  if (!body) {
    return `<p>No changes since the last snapshot.</p>`;
  }

  return `<h2 style="color:#333">Moving Day — Daily Snapshot (${date})</h2>${body}`;
}

export const dailySnapshot = onSchedule(
  {
    schedule: '0 7 * * *',
    timeZone: 'UTC',
    secrets: ['SMTP_USER', 'SMTP_PASS', 'ADMIN_NOTIFY_EMAIL'],
  },
  async () => {
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 86_400_000));

    // Snapshot current items
    const itemsSnap = await db.collection('items').get();
    const currentItems = itemsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: (data['name'] as string) ?? '',
        status: (data['status'] as string) ?? 'available',
        ...(data['claimedBy']?.['name'] ? { claimedBy: data['claimedBy']['name'] as string } : {}),
      };
    });

    // Read yesterday's snapshot
    const prevSnap = await db.collection('snapshots').doc(yesterday).get();
    const prevItems: Array<{ id: string; name: string; status: string; claimedBy?: string }> =
      prevSnap.exists ? (prevSnap.data()!['items'] ?? []) : [];

    // Compute diff
    const prevById = new Map(prevItems.map((i) => [i.id, i]));
    const currById = new Map(currentItems.map((i) => [i.id, i]));

    const added = currentItems.filter((i) => !prevById.has(i.id));
    const removed = prevItems.filter((i) => !currById.has(i.id));
    const claimed = currentItems.filter(
      (i) => i.status === 'claimed' && prevById.get(i.id)?.status !== 'claimed' && i.claimedBy
    ) as Array<{ id: string; name: string; status: string; claimedBy: string }>;
    const released = currentItems.filter(
      (i) => i.status === 'available' && prevById.get(i.id)?.status === 'claimed'
    );

    const diff = { added, removed, claimed, released };

    // Write today's snapshot
    await db.collection('snapshots').doc(today).set({
      date: today,
      items: currentItems,
      diff,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Send email if there are changes
    const hasChanges = added.length || removed.length || claimed.length || released.length;
    const adminEmail = process.env['ADMIN_NOTIFY_EMAIL'];
    const smtpUser = process.env['SMTP_USER'];
    const smtpPass = process.env['SMTP_PASS'];

    if (hasChanges && adminEmail && smtpUser && smtpPass) {
      const transporter = createTransport({
        service: 'gmail',
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"Moving Day" <${smtpUser}>`,
        to: adminEmail,
        subject: `Moving Day snapshot — ${today}`,
        html: buildDiffHtml(diff, today),
      });

      console.log(`Daily snapshot email sent to ${adminEmail}`);
    } else if (!hasChanges) {
      console.log('Daily snapshot: no changes, skipping email.');
    } else {
      console.warn('Daily snapshot: SMTP secrets not configured, skipping email.');
    }
  }
);

