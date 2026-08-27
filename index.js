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


// HTMLの要素を取得
const bookList = document.getElementById("book-list");
const emptyMessage = document.getElementById("empty-message");

const newButton = document.getElementById("new-button");
const createButton = document.getElementById("create-button");
const settingsButton = document.getElementById("settings-button");


// 新規作成ページへ移動
newButton.addEventListener("click", () => {
  window.location.href = "new.html";
});

createButton.addEventListener("click", () => {
  window.location.href = "new.html";
});


// 設定ページへ移動
settingsButton.addEventListener("click", () => {
  window.location.href = "settings.html";
});


// ログイン状態を確認
onAuthStateChanged(auth, async (user) => {

  // ログインしていない場合
  if (!user) {
    window.location.href = "login.html";
    return;
  }


  // ログインしている場合
  try {

    const booksRef = collection(db, "books");

    const q = query(
  booksRef,
  where("userId", "==", user.uid)
);

    const snapshot = await getDocs(q);


    // 読書メモが0件の場合
    if (snapshot.empty) {
      emptyMessage.style.display = "block";
      return;
    }


    // 「まだ読書メモがありません」を非表示
    emptyMessage.style.display = "none";


    // 取得したデータをカードにする
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


      // カードを押したら詳細ページへ
      card.addEventListener("click", () => {
        window.location.href = `detail.html?id=${doc.id}`;
      });


      bookList.appendChild(card);

    });

  } catch (error) {

    console.error("読書メモの取得に失敗しました:", error);

    bookList.textContent =
      "読書メモを読み込めませんでした。";

  }

});