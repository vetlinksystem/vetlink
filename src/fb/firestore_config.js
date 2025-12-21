const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const isRender = process.env.DEV_ENV === 'production';

let serviceAccount;

if (isRender) {
    serviceAccount = JSON.parse(fs.readFileSync('/etc/secrets/sak/json', 'utf8'));
} else {
    serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, '/keys/sak.json')));
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = db;