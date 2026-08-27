import { app } from "./firebase-config.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const auth = getAuth(app);
const db = getFirestore(app);


const form = document.getElementById("book-form");
const message = document.getElementById("message");
const backButton = document.getElementById("back-button");


let currentUser = null;


// ログイン状態を確認
onAuthStateChanged(auth, (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

});


// ホームに戻る
backButton.addEventListener("click", () => {
  window.location.href = "index.html";
});


// 保存
form.addEventListener("submit", async (event) => {

  event.preventDefault();

  if (!currentUser) {
    message.textContent = "ログインしてください。";
    return;
  }


  const title = document.getElementById("title").value;
  const author = document.getElementById("author").value;
  const genre = document.getElementById("genre").value;
  const status = document.getElementById("status").value;
  const memo = document.getElementById("memo").value;


  try {

    await addDoc(collection(db, "books"), {

      title: title,

      author: author,

      genre: genre
        ? [genre]
        : [],

      status: status,

      memoSections: [
        {
          label: "メモ",
          content: memo
        }
      ],

      updatedAt: serverTimestamp(),

      userId: currentUser.uid

    });


    message.textContent = "保存しました。";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);


  } catch (error) {

    console.error(error);

    message.textContent =
      "保存できませんでした: " + error.message;

  }

});