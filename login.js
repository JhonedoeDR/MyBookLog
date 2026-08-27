import { app } from "./firebase-config.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const auth = getAuth(app);

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("error-message");
const signupButton = document.getElementById("signup-button");

// すでにログイン済みならホーム画面へ移動する
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "index.html";
  }
});

// ログインボタン(フォーム送信)
form.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.textContent = "";

  signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .catch((error) => {
      errorMessage.textContent = "ログインできませんでした。メールアドレスとパスワードを確認してください。";
      console.error(error);
    });
});

// 新規アカウント作成ボタン
signupButton.addEventListener("click", () => {
  errorMessage.textContent = "";

  createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .catch((error) => {
      errorMessage.textContent = "アカウントを作成できませんでした。";
      console.error(error);
    });
});