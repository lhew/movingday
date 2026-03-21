import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';

admin.initializeApp();
const db = admin.firestore();

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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true, id: ref.id, message: `Created item "${input['name']}" with ID ${ref.id}` };
    }

    case 'update_item': {
      const { id, ...updates } = input as { id: string; [key: string]: unknown };
      await db.collection('items').doc(id).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
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

    // TODO: Verify Firebase ID token (uncomment in production)
    // const authHeader = req.headers.authorization;
    // if (!authHeader?.startsWith('Bearer ')) {
    //   res.status(401).json({ error: 'Unauthorized' });
    //   return;
    // }
    // const idToken = authHeader.split('Bearer ')[1];
    // const decodedToken = await admin.auth().verifyIdToken(idToken);
    // if (decodedToken.email !== 'YOUR_ADMIN_EMAIL@gmail.com') {
    //   res.status(403).json({ error: 'Forbidden' });
    //   return;
    // }

    const { messages, tools } = req.body;

    try {
      // Agentic loop — Claude may use tools multiple times
      let currentMessages = [...messages];
      const toolsExecuted: Array<{ toolName: string; input: unknown; result: unknown }> = [];

      // eslint-disable-next-line no-constant-condition
      while (true) {
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

        // If model wants to use tools
        if (response.stop_reason === 'tool_use') {
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

          // Add assistant's tool use and results to the message history
          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: toolResults },
          ];
          continue;
        }

        // Final text response
        const textContent = response.content.find((c) => c.type === 'text');
        const reply = textContent?.type === 'text' ? textContent.text : 'Done!';

        res.json({ reply, toolsExecuted });
        return;
      }
    } catch (error) {
      console.error('Agent error:', error);
      res.status(500).json({ error: 'Agent failed', details: String(error) });
    }
  });
