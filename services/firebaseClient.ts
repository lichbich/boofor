import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA0bb9O3EJt6cOfC2P8PbkIxBlJF-erg7I",
  authDomain: "unichat-acfc2.firebaseapp.com",
  databaseURL: "https://unichat-acfc2-default-rtdb.firebaseio.com",
  projectId: "unichat-acfc2",
  storageBucket: "unichat-acfc2.firebasestorage.app",
  messagingSenderId: "682268649138",
  appId: "1:682268649138:web:472743c5bd5a074ddf4bab",
  measurementId: "G-9HJ9M43ZC1"
};

// Initialize Firebase client-side safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const getClientAnalytics = async () => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};
