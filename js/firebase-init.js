import { initializeApp } from "../lib/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "../lib/firebase-auth.js";
import { getFirestore } from "../lib/firebase-firestore.js";

// --- MANDATORY FIREBASE/SUPABASE SETUP STRUCTURE ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

console.log(`App ID: ${appId}`);

let app, auth, db;

if (firebaseConfig) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Authentication logic
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User signed in:", user.uid);
        } else {
            console.log("No user signed in. Attempting sign-in...");
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication failed:", error);
            }
        }
    });
}
window.db = db;
window.auth = auth;
// --- END FIREBASE SETUP ---
