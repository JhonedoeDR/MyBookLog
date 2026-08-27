import { app } from "./firebase-config.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


const auth = getAuth(app);


const emailElement =
  document.getElementById("email");

const logoutButton =
  document.getElementById("logout-button");

const backButton =
  document.getElementById("back-button");

const message =
  document.getElementById("message");


// ログイン状態を確認
onAuthStateChanged(auth, (user) => {

  if (!user) {

    window.location.href =
      "login.html";

    return;
  }


  // メールアドレスを表示
  emailElement.textContent =
    user.email || "未設定";

});


// ホームに戻る
backButton.addEventListener("click", () => {

  window.location.href =
    "index.html";

});


// ログアウト
logoutButton.addEventListener("click", async () => {

  try {

    await signOut(auth);

    window.location.href =
      "login.html";

  } catch (error) {

    console.error(
      "ログアウトエラー:",
      error
    );

    message.textContent =
      "ログアウトできませんでした: " +
      error.message;

  }

});