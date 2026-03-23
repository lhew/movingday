/**
 * Clear and seed the Firebase emulator with E2E test data.
 * Modeled on seed-emulator.mjs — uses Admin SDK so security rules are bypassed.
 *
 * Run with: npm run e2e:seed
 * (emulators must already be running: npm run emulator:start:fresh)
 */

// Tell the Admin SDK to talk to the local emulator — must be set before import
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const EMULATOR_PROJECT = 'demo-movingday';
const FIRESTORE_URL = `http://localhost:8080/emulator/v1/projects/${EMULATOR_PROJECT}/databases/(default)/documents`;

const app = getApps().length ? getApps()[0] : initializeApp({ projectId: EMULATOR_PROJECT });
const db = getFirestore(app);

// ── Items ──────────────────────────────────────────────────────
const items = [
  {
    id: 'item-1',
    name: 'IKEA Billy Bookcase',
    description: 'Classic white bookcase, 80cm wide. Two small scratches on the side panel, barely noticeable. Great for books, plants, or displaying things.',
    condition: 'good',
    status: 'available',
    category: 'Furniture',
    tags: ['bookcase', 'ikea', 'white', 'furniture'],
    createdAt: new Date('2026-03-15'),
  },
  {
    id: 'item-2',
    name: 'Sony 32" TV',
    description: 'Works perfectly, includes remote. HDMI x 3, USB x 2. Selling because I upgraded. Bought 2 years ago.',
    condition: 'good',
    status: 'claimed',
    category: 'Electronics',
    tags: ['tv', 'sony', 'electronics'],
    claimedBy: { uid: 'user-demo-1', name: 'Maria S.', email: 'maria@example.com' },
    claimedAt: new Date('2026-03-18'),
    createdAt: new Date('2026-03-15'),
  },
  {
    id: 'item-3',
    name: 'Standing Desk Lamp',
    description: 'Adjustable arm, 3 brightness levels, warm + cool light. Barely used. Bulb included.',
    condition: 'like-new',
    status: 'available',
    category: 'Furniture',
    tags: ['lamp', 'lighting', 'desk'],
    createdAt: new Date('2026-03-16'),
  },
  {
    id: 'item-4',
    name: 'Box of Cooking Books',
    description: '~20 cookbooks including Ottolenghi, Samin Nosrat, and a few Portuguese classics. Take the whole box or pick and choose.',
    condition: 'good',
    status: 'available',
    category: 'Books',
    tags: ['books', 'cooking', 'kitchen'],
    createdAt: new Date('2026-03-16'),
  },
  {
    id: 'item-5',
    name: 'Vintage Coffee Table',
    description: 'Solid wood, mid-century style, some wear on top. Legs are sturdy. 90 x 50cm.',
    condition: 'fair',
    status: 'available',
    category: 'Furniture',
    tags: ['table', 'coffee-table', 'wood', 'vintage'],
    createdAt: new Date('2026-03-17'),
  },
  {
    id: 'item-6',
    name: 'Ergonomic Office Chair',
    description: 'IKEA Markus, black, adjustable lumbar support and armrests. Very comfortable for long work sessions.',
    condition: 'good',
    status: 'available',
    category: 'Furniture',
    tags: ['chair', 'office', 'ikea', 'ergonomic'],
    createdAt: new Date('2026-03-17'),
  },
  {
    id: 'item-7',
    name: 'Board Game Collection',
    description: 'Includes Catan, Ticket to Ride, Pandemic, Codenames, and 6 others. All complete sets.',
    condition: 'like-new',
    status: 'available',
    category: 'Games',
    tags: ['games', 'board-games', 'catan'],
    createdAt: new Date('2026-03-18'),
  },
  {
    id: 'item-8',
    name: 'Monstera Deliciosa (Large)',
    description: "About 1.2m tall, very healthy, lots of new growth. Come with a car - she's massive!",
    condition: 'new',
    status: 'claimed',
    category: 'Plants',
    tags: ['plant', 'monstera', 'indoor'],
    claimedBy: { uid: 'user-demo-2', name: 'Joao M.', email: 'joao@example.com' },
    claimedAt: new Date('2026-03-19'),
    createdAt: new Date('2026-03-18'),
  },
];

// ── Updates ────────────────────────────────────────────────────
const updates = [
  {
    id: 'update-1',
    emoji: '🚚',
    title: 'We found a moving company!',
    summary: 'After weeks of searching, we finally booked a crew for April 15th.',
    content: 'After calling what felt like every moving company in the city, we finally found a crew we trust — MoveRight Logistics. Moving day is locked in for April 15th.',
    author: 'Leo',
    pinned: true,
    publishedAt: new Date('2026-03-18'),
  },
  {
    id: 'update-2',
    emoji: '📦',
    title: 'Packing has begun',
    summary: 'Room by room, box by box. The kitchen took three days.',
    content: "Day 1 of packing: I thought I was a minimalist. Day 3: I found four sets of placemats I've never used and a fondue kit from 2019. The kitchen alone filled 14 boxes.",
    author: 'Leo',
    pinned: false,
    publishedAt: new Date('2026-03-14'),
  },
  {
    id: 'update-3',
    emoji: '🏠',
    title: 'Found the new place',
    summary: "Signed the lease! Here's what the new neighbourhood is like.",
    content: 'After three months of searching, I signed a lease! South-facing, huge windows, a balcony big enough for my remaining plants. The neighbourhood has a great bakery 200 metres away.',
    author: 'Leo',
    pinned: false,
    publishedAt: new Date('2026-03-05'),
  },
];

// ── Clear + Seed ───────────────────────────────────────────────
async function seed() {
  console.log('🧹 Clearing Firestore emulator...');
  const res = await fetch(FIRESTORE_URL, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`clearFirestore failed: HTTP ${res.status}`);
  }

  console.log('🌱 Seeding E2E test data...\n');

  for (const item of items) {
    const { id, ...data } = item;
    await db.collection('items').doc(id).set(data);
    console.log(`  ✅ Item: ${data.name}`);
  }

  for (const update of updates) {
    const { id, ...data } = update;
    await db.collection('updates').doc(id).set(data);
    console.log(`  ✅ Update: ${data.title}`);
  }

  console.log('\n🎉 E2E data ready.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
