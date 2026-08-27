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

const memoList = document.getElementById("memo-list");
const addMemoButton = document.getElementById("add-memo-button");


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


// メモを1個追加する
addMemoButton.addEventListener("click", () => {

  const memoItem = document.createElement("div");

  memoItem.className = "memo-item";

  memoItem.innerHTML = `
    <input
      type="text"
      class="memo-label"
      placeholder="メモのタイトル"
    >

    <textarea
      class="memo-content"
      placeholder="内容"
    ></textarea>

    <button type="button" class="delete-memo-button">
      このメモを削除
    </button>
  `;

  memoList.appendChild(memoItem);

});


// メモ削除
memoList.addEventListener("click", (event) => {

  if (!event.target.classList.contains("delete-memo-button")) {
    return;
  }

  const memoItem = event.target.closest(".memo-item");

  memoItem.remove();

});


// 保存
form.addEventListener("submit", async (event) => {

  event.preventDefault();


  if (!currentUser) {
    message.textContent = "ログインしてください。";
    return;
  }


  // 作品名
  const title = document.getElementById("title").value.trim();


  // 著者
  const author = document.getElementById("author").value.trim();


  // ジャンル
  const genre = Array.from(
    document.querySelectorAll('input[name="genre"]:checked')
  ).map((input) => input.value);


  // 進捗
  const status = document.getElementById("status").value;


  // メモ
  const memoSections = Array.from(
    document.querySelectorAll(".memo-item")
  ).map((item) => {

    return {
      label: item.querySelector(".memo-label").value.trim(),
      content: item.querySelector(".memo-content").value.trim()
    };

  });


  try {

    await addDoc(collection(db, "books"), {

      title: title,

      author: author,

      genre: genre,

      status: status,

      memoSections: memoSections,

      updatedAt: serverTimestamp(),

      userId: currentUser.uid

    });


    message.textContent = "保存しました。";


    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);


  } catch (error) {

    console.error("保存エラー:", error);

    message.textContent =
      "保存できませんでした: " + error.message;

  }

});