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

// ===== 下書き(オートセーブ) =====
const draftKey = "draft-" + bookId;

// 今の編集フォームの中身を集める
function collectForm() {
  return {
    title: editTitle.value,
    author: editAuthor.value,
    status: editStatus.value,
    genre: Array.from(
      document.querySelectorAll('input[name="edit-genre"]:checked')
    ).map((input) => input.value),
    memoSections: Array.from(
      document.querySelectorAll(".edit-memo-item")
    ).map((item) => ({
      label: item.querySelector(".edit-memo-label").value,
      content: item.querySelector(".edit-memo-content").value
    }))
  };
}

function saveDraft() {
  if (!bookId) return;
  try {
    localStorage.setItem(draftKey, JSON.stringify(collectForm()));
  } catch (error) {
    console.error("下書き保存エラー:", error);
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(draftKey);
  } catch (error) {
    console.error(error);
  }
}

// 入力のたびに下書き保存
editForm.addEventListener("input", saveDraft);
editForm.addEventListener("change", saveDraft);

// 別アプリに切り替えた瞬間にも保存
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !editMode.hidden) {
    saveDraft();
  }
});
window.addEventListener("pagehide", () => {
  if (!editMode.hidden) {
    saveDraft();
  }
});

// ===== メモ欄の高さ自動調整 =====
function autoResize(textarea) {
  textarea.style.height = "auto";
  // 非表示のとき scrollHeight は 0 になるので、その場合は何もしない
  if (textarea.scrollHeight > 0) {
    textarea.style.height = textarea.scrollHeight + "px";
  }
}

function resizeAllEditMemos() {
  editMemoList
    .querySelectorAll(".edit-memo-content")
    .forEach(autoResize);
}

// ホームへ戻る
backButton.onclick = () => {
  window.location.href = "index.html";
};

// 開閉ボタンを作る(編集モード用)
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
    // 開いたときに高さを合わせ直す
    item.querySelectorAll(".edit-memo-content").forEach(autoResize);
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
  // 入力に合わせて枠を広げる
  contentInput.addEventListener("input", () => autoResize(contentInput));

  const deleteMemoButton = document.createElement("button");
  deleteMemoButton.type = "button";
  deleteMemoButton.className = "delete-memo-button";
  deleteMemoButton.textContent = "このメモを削除";
  deleteMemoButton.onclick = () => {
    item.remove();
    saveDraft();
  };

  body.appendChild(contentInput);
  body.appendChild(deleteMemoButton);

  item.appendChild(header);
  item.appendChild(body);

  editMemoList.appendChild(item);

  // 追加直後に高さを合わせる(表示中のときだけ効く)
  autoResize(contentInput);
}

// メモ追加
addEditMemoButton.onclick = () => {
  addMemoEditor();
  saveDraft();
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

// 編集フォームにデータを入れる
function fillEditForm(data) {
  editTitle.value = data.title || "";
  editAuthor.value = data.author || "";
  editStatus.value = data.status || "積読";

  document
    .querySelectorAll('input[name="edit-genre"]')
    .forEach((checkbox) => {
      checkbox.checked =
        Array.isArray(data.genre) &&
        data.genre.includes(checkbox.value);
    });

  editMemoList.innerHTML = "";
  if (Array.isArray(data.memoSections)) {
    data.memoSections.forEach((memo) => {
      addMemoEditor(
        memo.label || "",
        memo.content || ""
      );
    });
  }
}

// 編集画面を開く
editButton.onclick = () => {
  if (!currentBook) {
    errorMessage.textContent =
      "作品データを読み込んでいます。";
    return;
  }

  // 前回の下書きがあれば復元するか聞く
  let data = currentBook;
  let draft = null;
  try {
    draft = localStorage.getItem(draftKey);
  } catch (error) {
    console.error(error);
  }

  if (
    draft &&
    window.confirm("前回の編集途中の内容があります。復元しますか？")
  ) {
    try {
      data = JSON.parse(draft);
    } catch (error) {
      console.error(error);
      data = currentBook;
    }
  } else {
    clearDraft();
  }

  fillEditForm(data);

  viewMode.hidden = true;
  editMode.hidden = false;

  // 表示してから高さを合わせる
  resizeAllEditMemos();
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
  clearDraft();
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

    clearDraft();

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
    clearDraft();
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

// ===== 資料スキャン(カメラ + OCR) =====
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
  saveDraft();
  stopCamera();
  scanModal.classList.add("hidden");
});
