import { app } from "./firebase-config.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const auth = getAuth(app);
const db = getFirestore(app);


const titleElement = document.getElementById("title");
const authorElement = document.getElementById("author");
const genreElement = document.getElementById("genre");
const statusElement = document.getElementById("status");
const memoList = document.getElementById("memo-list");
const errorMessage = document.getElementById("error-message");

const backButton = document.getElementById("back-button");


// ホームに戻る
backButton.addEventListener("click", () => {
  window.location.href = "index.html";
});


// URLから作品のIDを取り出す
const params = new URLSearchParams(window.location.search);
const bookId = params.get("id");


// IDがない場合
if (!bookId) {

  errorMessage.textContent =
    "作品の情報が見つかりません。";

} else {

  // ログイン状態を確認
  onAuthStateChanged(auth, async (user) => {

    if (!user) {
      window.location.href = "login.html";
      return;
    }


    try {

      // Firestoreから作品を取得
      const bookRef = doc(db, "books", bookId);
      const bookSnapshot = await getDoc(bookRef);


      // 作品が存在しない場合
      if (!bookSnapshot.exists()) {

        errorMessage.textContent =
          "この読書メモは見つかりません。";

        return;
      }


      const book = bookSnapshot.data();


      // 自分の作品か確認
      if (book.userId !== user.uid) {

        errorMessage.textContent =
          "この読書メモを見る権限がありません。";

        return;
      }


      // 基本情報
      titleElement.textContent =
        book.title || "作品名なし";

      authorElement.textContent =
        `著者：${book.author || "不明"}`;

      statusElement.textContent =
        book.status || "未設定";


      // ジャンル
      if (book.genre && book.genre.length > 0) {

        genreElement.textContent =
          book.genre.join(" / ");

      } else {

        genreElement.textContent =
          "未設定";

      }


      // メモ
      memoList.innerHTML = "";


      if (
        !book.memoSections ||
        book.memoSections.length === 0
      ) {

        memoList.innerHTML =
          "<p>メモはありません。</p>";

        return;
      }


      book.memoSections.forEach((memo) => {

        const memoElement =
          document.createElement("article");


        const memoTitle =
          document.createElement("h3");

        memoTitle.textContent =
          memo.label || "無題";


        const memoContent =
          document.createElement("p");

        memoContent.textContent =
          memo.content || "";


        memoElement.appendChild(memoTitle);
        memoElement.appendChild(memoContent);

        memoList.appendChild(memoElement);

      });


    } catch (error) {

      console.error("詳細情報の取得エラー:", error);

      errorMessage.innerHTML = `
        <p>読書メモを読み込めませんでした。</p>
        <p>エラーコード：${error.code || "不明"}</p>
        <p>エラーメッセージ：${error.message || "不明"}</p>
      `;

    }

  });

}