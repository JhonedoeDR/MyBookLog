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

// HTML
const viewMode = document.getElementById("view-mode");
const editMode = document.getElementById("edit-mode");

const titleElement = document.getElementById("title");
const authorElement = document.getElementById("author");
const genreElement = document.getElementById("genre");
const statusElement = document.getElementById("status");
const memoList = document.getElementById("memo-list");

const editTitle = document.getElementById("edit-title");
const editAuthor = document.getElementById("edit-author");
const editStatus = document.getElementById("edit-status");
const editMemoList = document.getElementById("edit-memo-list");
const editForm = document.getElementById("edit-form");

const backButton = document.getElementById("back-button");
const editButton = document.getElementById("edit-button");
const deleteButton = document.getElementById("delete-button");
const cancelEditButton = document.getElementById("cancel-edit-button");
const addEditMemoButton = document.getElementById("add-edit-memo-button");

const errorMessage = document.getElementById("error-message");

// URLから作品IDを取得
const params = new URLSearchParams(window.location.search);
const bookId = params.get("id");

let currentBook = null;

// ホームへ戻る
backButton.onclick = () => {
  window.location.href = "index.html";
};

// 開閉ボタンを作る(表示・編集どちらでも使う)
function createToggleButton(item, bodyClass) {
  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "toggle-memo-button";
  toggleButton.setAttribute("aria-label", "メモを開閉");
  toggleButton.textContent = "▲";
  toggleButton.onclick = () => {
    item.classList.toggle("collapsed");
    toggleButton.textContent = item.classList.contains("collapsed")
      ? "▼"
      : "▲";
  };
  return toggleButton;
}

// メモ入力欄を追加(編集モード)
function addMemoEditor(label = "", content = "") {
  const item = document.createElement("div");
  item.className = "edit-memo-item";

  const header = document.createElement("div");
  header.className = "edit-memo-header";

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.className = "edit-memo-label";
  labelInput.placeholder = "メモのタイトル";
  labelInput.value = label;

  const toggleButton = createToggleButton(item, "edit-memo-body");

  header.appendChild(labelInput);
  header.appendChild(toggleButton);

  const body = document.createElement("div");
  body.className = "edit-memo-body";

  const contentInput = document.createElement("textarea");
  contentInput.className = "edit-memo-content";
  contentInput.placeholder = "内容";
  contentInput.value = content;

  const deleteMemoButton = document.createElement("button");
  deleteMemoButton.type = "button";
  deleteMemoButton.className = "delete-memo-button";
  deleteMemoButton.textContent = "このメモを削除";
  deleteMemoButton.onclick = () => {
    item.remove();
  };

  body.appendChild(contentInput);
  body.appendChild(deleteMemoButton);

  item.appendChild(header);
  item.appendChild(body);

  editMemoList.appendChild(item);
}

// メモ追加
addEditMemoButton.onclick = () => {
  addMemoEditor();
};

// 詳細表示
function displayBook(book) {
  titleElement.textContent =
    book.title || "作品名なし";
  authorElement.textContent =
    "著者：" + (book.author || "不明");
  genreElement.textContent =
    Array.isArray(book.genre) && book.genre.length > 0
      ? book.genre.join(" / ")
      : "未設定";
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
    const article = document.createElement("article");
    article.className = "memo-item";

    const header = document.createElement("div");
    header.className = "memo-header";

    const h3 = document.createElement("h3");
    h3.className = "memo-label-text";
    h3.textContent = memo.label || "無題";

    const toggleButton = createToggleButton(article, "memo-body");

    header.appendChild(h3);
    header.appendChild(toggleButton);

    const body = document.createElement("div");
    body.className = "memo-body";

    const p = document.createElement("p");
    p.className = "memo-content-text";
    p.textContent = memo.content || "";

    body.appendChild(p);

    article.appendChild(header);
    article.appendChild(body);
    memoList.appendChild(article);
  });
}

// 編集画面を開く
editButton.onclick = () => {
  if (!currentBook) {
    errorMessage.textContent =
      "作品データを読み込んでいます。";
    return;
  }

  editTitle.value =
    currentBook.title || "";
  editAuthor.value =
    currentBook.author || "";
  editStatus.value =
    currentBook.status || "積読";

  document
    .querySelectorAll('input[name="edit-genre"]')
    .forEach((checkbox) => {
      checkbox.checked =
        Array.isArray(currentBook.genre) &&
        currentBook.genre.includes(checkbox.value);
    });

  editMemoList.innerHTML = "";
  if (Array.isArray(currentBook.memoSections)) {
    currentBook.memoSections.forEach((memo) => {
      addMemoEditor(
        memo.label || "",
        memo.content || ""
      );
    });
  }

  viewMode.hidden = true;
  editMode.hidden = false;
};

// 編集をキャンセル
cancelEditButton.onclick = () => {
  editMode.hidden = true;
  viewMode.hidden = false;
};

// 編集内容を保存
editForm.onsubmit = async (event) => {
  event.preventDefault();

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
            item.querySelector(".edit-memo-label").value.trim(),
          content:
            item.querySelector(".edit-memo-content").value.trim()
        };
      });

    const newData = {
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
      newData
    );

    currentBook = {
      ...currentBook,
      ...newData
    };

    displayBook(currentBook);

    editMode.hidden = true;
    viewMode.hidden = false;

    errorMessage.textContent =
      "保存しました。";
  } catch (error) {
    console.error(error);
    errorMessage.textContent =
      "保存エラー: " +
      (error.code || "不明") +
      " / " +
      error.message;
  }
};

// 作品を削除
deleteButton.onclick = async () => {
  if (!currentBook) {
    return;
  }

  const result =
    window.confirm(
      "この読書メモを削除しますか？"
    );

  if (!result) {
    return;
  }

  try {
    const bookRef =
      doc(db, "books", bookId);
    await deleteDoc(bookRef);
    window.location.href =
      "index.html";
  } catch (error) {
    console.error(error);
    errorMessage.textContent =
      "削除エラー: " +
      (error.code || "不明") +
      " / " +
      error.message;
  }
};

// Firebaseから読み込む
if (!bookId) {
  errorMessage.textContent =
    "作品IDがありません。";
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
      const snapshot =
        await getDoc(bookRef);

      if (!snapshot.exists()) {
        errorMessage.textContent =
          "この読書メモは存在しません。";
        return;
      }

      const book =
        snapshot.data();

      if (book.userId !== user.uid) {
        errorMessage.textContent =
          "この読書メモを見る権限がありません。";
        return;
      }

      currentBook = book;
      displayBook(book);
    } catch (error) {
      console.error(error);
      errorMessage.innerHTML = `
        <p>読み込みエラー</p>
        <p>コード：${error.code || "不明"}</p>
        <p>内容：${error.message || "不明"}</p>
      `;
    }
  });
}
