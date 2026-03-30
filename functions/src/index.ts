import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';

admin.initializeApp();
const db = admin.firestore();

// ── Auth trigger: auto-register new users as basic/unauthorized ─────────────

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
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

export const acceptInvitation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { inviteId, nickname } = data as { inviteId: string; nickname: string };
  const uid = context.auth.uid;
  const email = context.auth.token.email ?? '';

  if (!nickname || nickname.length > 32 || !/^[a-z0-9-]+$/.test(nickname)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Nickname must be non-empty, max 32 chars, lowercase alphanumeric and hyphens only.'
    );
  }

  const inviteRef = db.collection('invitations').doc(inviteId);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Invitation not found.');
  }

  const invite = inviteSnap.data()!;
  if (invite['usedBy']) {
    throw new functions.https.HttpsError('already-exists', 'Invitation already used.');
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

export const createInvitation = functions.https.onCall(async (data, context) => {
  if (context.auth?.token['role'] !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only.');
  }

  const { role } = data as { role: 'editor' | 'basic' };
  if (role !== 'editor' && role !== 'basic') {
    throw new functions.https.HttpsError('invalid-argument', 'Role must be editor or basic.');
  }

  const ref = await db.collection('invitations').add({
    role,
    createdBy: context.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { id: ref.id };
});

// ── authorizeUser: admin/editor authorizes a pending basic user ────────────

export const authorizeUser = functions.https.onCall(async (data, context) => {
  const callerRole = context.auth?.token['role'];
  if (callerRole !== 'admin' && callerRole !== 'editor') {
    throw new functions.https.HttpsError('permission-denied', 'Admin or editor only.');
  }

  const { uid } = data as { uid: string };
  const userRecord = await admin.auth().getUser(uid);
  const currentClaims = userRecord.customClaims ?? {};

  await admin.auth().setCustomUserClaims(uid, { ...currentClaims, authorized: true });
  await db.collection('users').doc(uid).update({ authorized: true });

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

export const agent = functions
  .runWith({ secrets: ['ANTHROPIC_API_KEY'], timeoutSeconds: 120 })
  .https.onRequest(async (req, res) => {
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
          system: `You are Leo's Moving Day assistant. Leo is moving and you help him manage:
1. A donation showcase — items he's giving away for free
2. Moving updates — blog posts explaining what's happening
3. The dibs system — tracking who claimed what

Be friendly, efficient, and proactive. When Leo asks you to add items, write good descriptions
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
