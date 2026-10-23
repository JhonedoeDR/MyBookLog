// 以前Firebase(Firestore)に保存したメモを、この端末に取り込む(一度だけ使う)
import { app } from "./firebase-config.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { importJson } from "./storage.js";

const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("migrate-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loadButton = document.getElementById("load-button");
const importButton = document.getElementById("import-button");
const message = document.getElementById("message");

let loadedBooks = [];

document.getElementById("back-button").addEventListener("click", () => {
  window.location.href = "index.html";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "読み込んでいます…";
  importButton.hidden = true;
  loadButton.disabled = true;

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );

    const snapshot = await getDocs(
      query(
        collection(db, "books"),
        where("userId", "==", credential.user.uid)
      )
    );

    loadedBooks = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || "",
        author: data.author || "",
        genre: Array.isArray(data.genre) ? data.genre : [],
        status: data.status || "積読",
        memoSections: Array.isArray(data.memoSections) ? data.memoSections : [],
        updatedAt:
          data.updatedAt && data.updatedAt.toMillis
            ? data.updatedAt.toMillis()
            : 0
      };
    });

    if (loadedBooks.length === 0) {
      message.textContent =
        "このアカウントのメモは0件でした。別のメールアドレスでお試しください。";
      await signOut(auth);
      return;
    }

    message.textContent =
      loadedBooks.length + "件のメモが見つかりました。取り込みますか？";
    importButton.hidden = false;
  } catch (error) {
    console.error("読み込みエラー:", error);
    message.textContent =
      "読み込めませんでした: " + (error.code || "") + " / " + error.message;
  } finally {
    loadButton.disabled = false;
  }
});

importButton.addEventListener("click", async () => {
  try {
    const count = importJson(JSON.stringify({ books: loadedBooks }));
    message.textContent =
      count + "件を取り込みました。ホームで確認してください。";
    importButton.hidden = true;
    await signOut(auth);
  } catch (error) {
    console.error("取り込みエラー:", error);
    message.textContent = "取り込めませんでした: " + error.message;
  }
});
