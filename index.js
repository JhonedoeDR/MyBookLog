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


// HTMLの要素
const bookList = document.getElementById("book-list");
const emptyMessage = document.getElementById("empty-message");

const newButton = document.getElementById("new-button");
const createButton = document.getElementById("create-button");
const settingsButton = document.getElementById("settings-button");


// ページ移動
newButton.addEventListener("click", () => {
  window.location.href = "new.html";
});

createButton.addEventListener("click", () => {
  window.location.href = "new.html";
});

settingsButton.addEventListener("click", () => {
  window.location.href = "settings.html";
});


// ログイン状態を確認
onAuthStateChanged(auth, async (user) => {

  // ログインしていない
  if (!user) {
    window.location.href = "login.html";
    return;
  }


  try {

    // Firestoreの「books」を取得
    const booksRef = collection(db, "books");


    // 今ログインしているユーザーのデータだけ取得
    const q = query(
      booksRef,
      where("userId", "==", user.uid)
    );


    const snapshot = await getDocs(q);


    // データが0件
    if (snapshot.empty) {

      emptyMessage.style.display = "block";

      return;
    }


    // 「まだ読書メモがありません」を消す
    emptyMessage.style.display = "none";


    // 取得したデータを表示
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

        window.location.href =
          `detail.html?id=${doc.id}`;

      });


      bookList.appendChild(card);

    });

  } catch (error) {

    // コンソールにも詳細を出す
    console.error("Firestore読み込みエラー");
    console.error("エラーコード:", error.code);
    console.error("エラーメッセージ:", error.message);
    console.error("エラー全体:", error);


    // 画面にも詳細を出す
    emptyMessage.style.display = "none";

    bookList.innerHTML = `
      <p>
        読書メモを読み込めませんでした。
      </p>

      <p>
        エラーコード：${error.code || "不明"}
      </p>

      <p>
        エラーメッセージ：${error.message || "不明"}
      </p>
    `;

  }

});