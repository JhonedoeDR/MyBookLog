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



// メモの開閉
memoList.addEventListener("click", (event) => {
  const toggleButton = event.target.closest(".toggle-memo-button");
  if (!toggleButton) {
    return;
  }
  const memoItem = toggleButton.closest(".memo-item");
  memoItem.classList.toggle("collapsed");
  toggleButton.textContent = memoItem.classList.contains("collapsed")
    ? "▼"
    : "▲";
});

// メモ削除
memoList.addEventListener("click", (event) => {
  if (!event.target.classList.contains("delete-memo-button")) {
    return;
  }
  const memoItem = event.target.closest(".memo-item");
  memoItem.remove();
});

// メモの開閉(タップで開く/閉じる)
memoList.addEventListener("click", (event) => {
  if (!event.target.classList.contains("toggle-memo-button")) {
    return;
  }
  const memoItem = event.target.closest(".memo-item");
  memoItem.classList.toggle("collapsed");
});

// メモ欄を入力内容に合わせて自動で高さを広げる(見返しやすくする)
memoList.addEventListener("input", (event) => {
  if (!event.target.classList.contains("memo-content")) {
    return;
  }
  const textarea = event.target;
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
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

// --- 資料スキャン(カメラ + OCR) ---
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

// カメラを起動してモーダルを開く
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
    console.error("カメラ起動エラー:", error);
    scanStatus.textContent =
      "カメラを起動できませんでした: " + error.message;
  }
});

// カメラを止める
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
}

// モーダルを閉じる
closeScanButton.addEventListener("click", () => {
  stopCamera();
  scanModal.classList.add("hidden");
});

// 撮影してOCRを実行
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
    console.error("OCRエラー:", error);
    scanStatus.textContent = "読み取りに失敗しました: " + error.message;
  } finally {
    captureButton.disabled = false;
  }
});

// クリップボードにコピー
copyResultButton.addEventListener("click", async () => {
  if (!scanResult.value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(scanResult.value);
    scanStatus.textContent = "コピーしました。";
  } catch (error) {
    console.error("コピーエラー:", error);
    scanStatus.textContent = "コピーできませんでした: " + error.message;
  }
});

// 読み取った文章を新しいメモとして追加
addToMemoButton.addEventListener("click", () => {
  if (!scanResult.value) {
    return;
  }

  const memoItem = document.createElement("div");
  memoItem.className = "memo-item";
  memoItem.innerHTML = `
    <input
      type="text"
      class="memo-label"
      value="スキャンしたメモ"
      placeholder="メモのタイトル"
    >
    <textarea class="memo-content"></textarea>
    <button type="button" class="delete-memo-button">
      このメモを削除
    </button>
  `;
  memoItem.querySelector(".memo-content").value = scanResult.value;
  memoList.appendChild(memoItem);

  stopCamera();
  scanModal.classList.add("hidden");
});

