// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC8UbfLDF0Kz4PhNxHqEIM8-9UTueMx_AM",
    authDomain: "lost-and-found-c1cc7.firebaseapp.com",
    projectId: "lost-and-found-c1cc7",
    storageBucket: "lost-and-found-c1cc7.firebasestorage.app",
    messagingSenderId: "130062352378",
    appId: "1:130062352378:web:ec6a0a29106e3d321d6e43",
    measurementId: "G-J3JJC33T3M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Export Firebase services
export { app, analytics, db, auth };
