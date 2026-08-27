import { app } from "./firebase-config.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const auth = getAuth(app);
const db = getFirestore(app);


const bookList = document.getElementById("book-list");
const emptyMessage = document.getElementById("empty-message");

const newButton = document.getElementById("new-button");
const createButton =
  document.getElementById("create-button") ||
  document.getElementById("btn2");
const settingsButton = document.getElementById("settings-button");


// 画面に現在の状態を表示する
bookList.innerHTML = "<p>index.jsを読み込みました。</p>";


// ボタンの確認
if (!newButton) {
  bookList.innerHTML += "<p>エラー：new-button が見つかりません。</p>";
}

if (!createButton) {
  bookList.innerHTML += "<p>エラー：create-button が見つかりません。</p>";
}

if (!settingsButton) {
  bookList.innerHTML += "<p>エラー：settings-button が見つかりません。</p>";
}


// ページ移動
if (newButton) {
  newButton.addEventListener("click", () => {
    window.location.href = "new.html";
  });
}

if (createButton) {
  createButton.addEventListener("click", () => {
    window.location.href = "new.html";
  });
}

if (settingsButton) {
  settingsButton.addEventListener("click", () => {
    window.location.href = "settings.html";
  });
}


// ログイン状態を確認
bookList.innerHTML += "<p>ログイン状態を確認しています。</p>";

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    bookList.innerHTML += "<p>ログインしていません。</p>";
    window.location.href = "login.html";
    return;
  }


  bookList.innerHTML += "<p>ログイン確認OK。</p>";
  bookList.innerHTML += `<p>UID：${user.uid}</p>`;


  try {

    bookList.innerHTML += "<p>Firestoreを読み込んでいます。</p>";


    const booksRef = collection(db, "books");


    const q = query(
      booksRef,
      where("userId", "==", user.uid)
    );


    const snapshot = await getDocs(q);


    bookList.innerHTML +=
      `<p>Firestore読み込み成功。取得件数：${snapshot.size}</p>`;


    if (snapshot.empty) {

      emptyMessage.style.display = "block";

      return;
    }


    emptyMessage.style.display = "none";

    // 状態確認用の文章を消して、カード表示にする
    bookList.innerHTML = "";


    snapshot.forEach((doc) => {

      const book = doc.data();

      const card = document.createElement("article");

      card.className = "book-card";

      card.innerHTML = `
        <h3>${book.title || "作品名なし"}</h3>

        <p>
          著者：
          ${book.author || "不明"}
        </p>

        <p>
          進捗：
          ${book.status || "未設定"}
        </p>
      `;


      card.addEventListener("click", () => {
        window.location.href =
          `detail.html?id=${doc.id}`;
      });


      bookList.appendChild(card);

    });


  } catch (error) {

    console.error("Firestore読み込みエラー:", error);


    emptyMessage.style.display = "none";


    bookList.innerHTML = `
      <p>Firestoreの読み込みでエラーが発生しました。</p>

      <p>
        エラーコード：
        ${error.code || "なし"}
      </p>

      <p>
        エラーメッセージ：
        ${error.message || "なし"}
      </p>
    `;

  }

});