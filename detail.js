import { app } from "./firebase-config.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const auth = getAuth(app);
const db = getFirestore(app);


// 表示
const viewMode = document.getElementById("view-mode");

const titleElement = document.getElementById("title");
const authorElement = document.getElementById("author");
const genreElement = document.getElementById("genre");
const statusElement = document.getElementById("status");
const memoList = document.getElementById("memo-list");


// 編集
const editMode = document.getElementById("edit-mode");
const editForm = document.getElementById("edit-form");

const editTitle = document.getElementById("edit-title");
const editAuthor = document.getElementById("edit-author");
const editStatus = document.getElementById("edit-status");

const editMemoList =
  document.getElementById("edit-memo-list");


// ボタン
const backButton =
  document.getElementById("back-button");

const editButton =
  document.getElementById("edit-button");

const deleteButton =
  document.getElementById("delete-button");

const cancelEditButton =
  document.getElementById("cancel-edit-button");

const addEditMemoButton =
  document.getElementById("add-edit-memo-button");


// エラー
const errorMessage =
  document.getElementById("error-message");


// URLから作品IDを取得
const params =
  new URLSearchParams(window.location.search);

const bookId = params.get("id");


// 現在の作品データ
let currentBook = null;


// ホームに戻る
backButton.addEventListener("click", () => {
  window.location.href = "index.html";
});


// メモを編集画面に追加
function addMemoEditor(label = "", content = "") {

  const memoItem =
    document.createElement("div");

  memoItem.className = "edit-memo-item";

  memoItem.innerHTML = `
    <input
      type="text"
      class="edit-memo-label"
      placeholder="メモのタイトル"
      value="${label.replace(/"/g, "&quot;")}"
    >

    <textarea
      class="edit-memo-content"
      placeholder="内容"
    >${content}</textarea>

    <button
      type="button"
      class="delete-edit-memo-button"
    >
      このメモを削除
    </button>
  `;

  editMemoList.appendChild(memoItem);
}


// メモ追加
addEditMemoButton.addEventListener("click", () => {
  addMemoEditor();
});


// メモ削除
editMemoList.addEventListener("click", (event) => {

  if (
    !event.target.classList.contains(
      "delete-edit-memo-button"
    )
  ) {
    return;
  }

  const memoItem =
    event.target.closest(".edit-memo-item");

  memoItem.remove();

});


// 編集ボタン
editButton.addEventListener("click", () => {

  if (!currentBook) {
    return;
  }


  // 現在の内容を入力欄に入れる
  editTitle.value =
    currentBook.title || "";

  editAuthor.value =
    currentBook.author || "";

  editStatus.value =
    currentBook.status || "積読";


  // ジャンル
  document
    .querySelectorAll('input[name="edit-genre"]')
    .forEach((checkbox) => {

      checkbox.checked =
        Array.isArray(currentBook.genre) &&
        currentBook.genre.includes(checkbox.value);

    });


  // メモ
  editMemoList.innerHTML = "";

  if (Array.isArray(currentBook.memoSections)) {

    currentBook.memoSections.forEach((memo) => {

      addMemoEditor(
        memo.label || "",
        memo.content || ""
      );

    });

  }


  // 表示を編集モードに変更
  viewMode.hidden = true;
  editMode.hidden = false;

});


// キャンセル
cancelEditButton.addEventListener("click", () => {

  editMode.hidden = true;
  viewMode.hidden = false;

});


// 編集内容を保存
editForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  if (!currentBook) {
    return;
  }


  try {

    const genre =
      Array.from(
        document.querySelectorAll(
          'input[name="edit-genre"]:checked'
        )
      ).map((input) => input.value);


    const memoSections =
      Array.from(
        document.querySelectorAll(".edit-memo-item")
      ).map((item) => {

        return {
          label:
            item
              .querySelector(".edit-memo-label")
              .value
              .trim(),

          content:
            item
              .querySelector(".edit-memo-content")
              .value
              .trim()
        };

      });


    const updatedData = {

      title:
        editTitle.value.trim(),

      author:
        editAuthor.value.trim(),

      genre:
        genre,

      status:
        editStatus.value,

      memoSections:
        memoSections,

      updatedAt:
        serverTimestamp()

    };


    const bookRef =
      doc(db, "books", bookId);


    await updateDoc(
      bookRef,
      updatedData
    );


    // 現在のデータも更新
    currentBook = {
      ...currentBook,
      ...updatedData
    };


    // 表示を更新
    displayBook(currentBook);


    editMode.hidden = true;
    viewMode.hidden = false;


    errorMessage.textContent =
      "保存しました。";


  } catch (error) {

    console.error("編集保存エラー:", error);

    errorMessage.textContent =
      `保存エラー: ${error.code || "不明"} / ${error.message}`;

  }

});


// 削除
deleteButton.addEventListener("click", async () => {

  if (!currentBook) {
    return;
  }


  const confirmed =
    window.confirm(
      "この読書メモを削除しますか？"
    );


  if (!confirmed) {
    return;
  }


  try {

    const bookRef =
      doc(db, "books", bookId);

    await deleteDoc(bookRef);


    window.location.href =
      "index.html";


  } catch (error) {

    console.error("削除エラー:", error);

    errorMessage.textContent =
      `削除エラー: ${error.code || "不明"} / ${error.message}`;

  }

});


// 作品を画面に表示
function displayBook(book) {

  titleElement.textContent =
    book.title || "作品名なし";

  authorElement.textContent =
    `著者：${book.author || "不明"}`;


  if (
    Array.isArray(book.genre) &&
    book.genre.length > 0
  ) {

    genreElement.textContent =
      book.genre.join(" / ");

  } else {

    genreElement.textContent =
      "未設定";

  }


  statusElement.textContent =
    book.status || "未設定";


  memoList.innerHTML = "";


  if (
    !Array.isArray(book.memoSections) ||
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

}


// Firebaseから作品を読み込む
if (!bookId) {

  errorMessage.textContent =
    "エラー：作品IDがありません。";

} else {

  onAuthStateChanged(auth, async (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }


    try {

      const bookRef =
        doc(db, "books", bookId);

      const bookSnapshot =
        await getDoc(bookRef);


      if (!bookSnapshot.exists()) {

        errorMessage.textContent =
          "この読書メモは見つかりません。";

        return;
      }


      const book =
        bookSnapshot.data();


      if (book.userId !== user.uid) {

        errorMessage.textContent =
          "この読書メモを見る権限がありません。";

        return;
      }


      currentBook = book;

      displayBook(book);


    } catch (error) {

      console.error(
        "詳細情報の取得エラー:",
        error
      );

      errorMessage.innerHTML = `
        <p>読み込みエラー</p>
        <p>コード：${error.code || "不明"}</p>
        <p>内容：${error.message || "不明"}</p>
      `;

    }

  });

}

console.log("detail.js 最後まで読み込みました");