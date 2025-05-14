// firebaseconfig.js
import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyBdM11xCB6h1yeOHmGISQRNKxg0flBDnOU",
  authDomain: "meditrack-3796b.firebaseapp.com",
  projectId: "meditrack-3796b",
  storageBucket: "meditrack-3796b.firebasestorage.app",
  messagingSenderId: "572929946164",
  appId: "1:572929946164:web:ef8c7ca1354759efcb9061",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
const db = getFirestore(app)

export { db } // Make sure to export db
