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
  const memoItem = document.createElement("div");
  memoItem.className = "memo-item collapsed";

  const header = document.createElement("div");
  header.className = "memo-header";

  const labelText = document.createElement("p");
  labelText.className = "memo-label-text";
  labelText.textContent = memo.label || "無題";

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "toggle-memo-button";
  toggleButton.textContent = "▼";

  header.appendChild(labelText);
  header.appendChild(toggleButton);

  const body = document.createElement("div");
  body.className = "memo-body";

  const contentText = document.createElement("p");
  contentText.className = "memo-content-text";
  contentText.textContent = memo.content || "";

  body.appendChild(contentText);

  memoItem.appendChild(header);
  memoItem.appendChild(body);
  memoList.appendChild(memoItem);
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

// メモの開閉(タップで開く/閉じる)
memoList.addEventListener("click", (event) => {
  if (!event.target.classList.contains("toggle-memo-button")) {
    return;
  }
  const memoItem = event.target.closest(".memo-item");
  memoItem.classList.toggle("collapsed");
});


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

const scanButton = document.getElementById("scan-button");
const scanModal = document.getElementById("scan-modal");
const scanVideo = document.getElementById("scan-video");
const scanCanvas = document.getElementById("scan-canvas");
const captureButton = document.getElementById("capture-button");
const closeScanButton = document.getElementById("close-scan-button");
const scanStatus = document.getElementById("scan-status");
const scanResult = document.getElementById("scan-result");
const copyResultButton = document.getElementById("copy-result-button");
const addToMemoButton = document.getElementById("add-to-memo-button");

let cameraStream = null;

scanButton.addEventListener("click", async () => {
  scanModal.classList.remove("hidden");
  scanResult.value = "";
  scanStatus.textContent = "";
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    scanVideo.srcObject = cameraStream;
  } catch (error) {
    scanStatus.textContent = "カメラを起動できませんでした: " + error.message;
  }
});

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
}

closeScanButton.addEventListener("click", () => {
  stopCamera();
  scanModal.classList.add("hidden");
});

captureButton.addEventListener("click", async () => {
  if (!cameraStream) {
    scanStatus.textContent = "カメラが起動していません。";
    return;
  }
  const width = scanVideo.videoWidth;
  const height = scanVideo.videoHeight;
  scanCanvas.width = width;
  scanCanvas.height = height;
  scanCanvas.getContext("2d").drawImage(scanVideo, 0, 0, width, height);

  scanStatus.textContent = "文字を読み取っています…";
  captureButton.disabled = true;

  try {
    const { data } = await Tesseract.recognize(scanCanvas, "jpn+eng");
    scanResult.value = data.text.trim();
    scanStatus.textContent = "読み取りが完了しました。";
  } catch (error) {
    scanStatus.textContent = "読み取りに失敗しました: " + error.message;
  } finally {
    captureButton.disabled = false;
  }
});

copyResultButton.addEventListener("click", async () => {
  if (!scanResult.value) return;
  try {
    await navigator.clipboard.writeText(scanResult.value);
    scanStatus.textContent = "コピーしました。";
  } catch (error) {
    scanStatus.textContent = "コピーできませんでした: " + error.message;
  }
});

addToMemoButton.addEventListener("click", () => {
  if (!scanResult.value) return;
  addMemoEditor("スキャンしたメモ", scanResult.value);
  stopCamera();
  scanModal.classList.add("hidden");
});
