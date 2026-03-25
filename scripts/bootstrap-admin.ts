import * as admin from 'firebase-admin';
import * as serviceAccount from '../service-account.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const EMAIL = 'ADMIN_EMAIL';

async function bootstrap() {
  const user = await admin.auth().getUserByEmail(EMAIL);
  await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
  console.log(`✓ Admin claim set for ${EMAIL} (uid: ${user.uid})`);
  process.exit(0);
}

bootstrap().catch(console.error);
