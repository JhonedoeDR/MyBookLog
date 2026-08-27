// Firebaseコンソールの「プロジェクトの設定」→「マイアプリ」でコピーした値を
// ここにそのまま貼り付けてください。

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyBtvpoCZ9JmOtmQnDp84L4yC7CkiMGMz-A",
  authDomain: "book-log-89e75.firebaseapp.com",
  projectId: "book-log-89e75",
  storageBucket: "book-log-89e75.firebasestorage.app",
  messagingSenderId: "517036047177",
  appId: "1:517036047177:web:6385f5856aff8a498b7898"
};

export const app = initializeApp(firebaseConfig);