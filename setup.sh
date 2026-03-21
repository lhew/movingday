#!/bin/bash
set -e

echo ""
echo "📦 Moving Day — Local Setup"
echo "================================"

# ── 1. Root dependencies (includes firebase-tools locally) ────
echo ""
echo "▶ Installing root dependencies..."
npm install

# ── 2. Functions dependencies ─────────────────────────────────
echo ""
echo "▶ Installing Cloud Functions dependencies..."
cd functions && npm install && cd ..

# ── 3. Firebase login ─────────────────────────────────────────
echo ""
echo "▶ Logging in to Firebase..."
npx firebase-tools login

# ── 4. Done ───────────────────────────────────────────────────
echo ""
echo "✅ All set! Here's what to do next:"
echo ""
echo "  1. Fill in your Firebase config in:"
echo "       src/environments/environment.ts"
echo ""
echo "  2. Start the emulators + Angular dev server:"
echo "       npm run dev"
echo ""
echo "  3. In a second terminal, seed the emulator with sample data:"
echo "       npm run emulator:seed"
echo ""
echo "  Then open:"
echo "       http://localhost:4200  ← the app"
echo "       http://localhost:4000  ← Firebase Emulator UI"
echo ""
