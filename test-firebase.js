const admin = require('firebase-admin');
const fs = require('fs');
const env = fs.readFileSync('C:/Users/krish/Desktop/Cpilot/.env', 'utf8');
const k = env.match(/FIREBASE_PRIVATE_KEY=(.*)/)[1].trim();
const d = Buffer.from(k, 'base64').toString('utf8');
const c = d.replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n').trim();
admin.initializeApp({credential: admin.credential.cert({projectId: 'copilotx-ai', clientEmail: 'firebase-adminsdk-fbsvc@copilotx-ai.iam.gserviceaccount.com', privateKey: c})});
admin.firestore().collection('users').limit(1).get().then(() => console.log('Firestore OK')).catch(e => console.log('ERROR:', e.message));
