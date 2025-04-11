var admin = require("firebase-admin");

var serviceAccount = require("./coffee-shop-b650e-firebase-adminsdk-fbsvc-60344a777f.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
module.exports = { db, admin };
