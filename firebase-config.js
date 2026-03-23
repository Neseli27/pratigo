// ==============================
// PRATİGO - Firebase Yapılandırması
// ==============================
// Kendi Firebase proje bilgilerinizi buraya girin

const firebaseConfig = {
    apiKey: "AIzaSyCqUSoowo2EbKKhG0SBcIzBYddwYOzHKRo",
  authDomain: "egitim-yonetim-platformu.firebaseapp.com",
  projectId: "egitim-yonetim-platformu",
  storageBucket: "egitim-yonetim-platformu.firebasestorage.app",
  messagingSenderId: "548967060709",
  appId: "1:548967060709:web:6e0e360c8010824d34700c",
  measurementId: "G-MNR3YS5Z5J"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
