
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- CONFIGURATION INSTRUCTIONS ---
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (it's free).
// 3. Register a "Web App" (</> icon).
// 4. Copy the `firebaseConfig` object they give you and paste it below.
// 5. IMPORTANT: Go to "Firestore Database" in the sidebar -> Create Database -> Start in Test Mode.
// ----------------------------------

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// We only initialize if the user has actually replaced the placeholder
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

let app;
let db: any;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase connected successfully");
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    // Fallback will occur in service
  }
}

export { db };
