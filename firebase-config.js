// ==============================
// PRATİGO - Firebase Yapılandırması
// ==============================
// Kendi Firebase proje bilgilerinizi buraya girin

const firebaseConfig = {
    apiKey: "BURAYA_API_KEY",
    authDomain: "BURAYA_AUTH_DOMAIN",
    projectId: "BURAYA_PROJECT_ID",
    storageBucket: "BURAYA_STORAGE_BUCKET",
    messagingSenderId: "BURAYA_SENDER_ID",
    appId: "BURAYA_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
