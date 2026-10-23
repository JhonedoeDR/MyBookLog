import { getBook, updateBook, deleteBook } from "./storage.js";
import { mountEditor } from "./editor.js";

const $ = (id) => document.getElementById(id);

const viewMode = $("view-mode");
const viewTitle = $("view-title");
const viewAuthor = $("view-author");
const viewGenre = $("view-genre");
const viewStatus = $("view-status");
const viewMemos = $("view-memos");
const editButton = $("edit-button");
const deleteButton = $("delete-button");
const notice = $("notice");

const bookId = new URLSearchParams(window.location.search).get("id");
let currentBook = null;

$("back-button").addEventListener("click", () => {
  window.location.href = "index.html";
});

// ===== 表示 =====

function displayBook(book) {
  viewTitle.textContent = book.title || "作品名なし";
  viewAuthor.textContent = "著者：" + (book.author || "不明");
  viewGenre.textContent =
    Array.isArray(book.genre) && book.genre.length > 0
      ? book.genre.join(" / ")
      : "未設定";
  viewStatus.textContent = book.status || "未設定";

  viewMemos.replaceChildren();

  if (!Array.isArray(book.memoSections) || book.memoSections.length === 0) {
    const p = document.createElement("p");
    p.textContent = "メモはありません。";
    viewMemos.appendChild(p);
    return;
  }

  book.memoSections.forEach((memo) => {
    const item = document.createElement("div");
    item.className = "memo-item collapsed";

    const header = document.createElement("div");
    header.className = "memo-header";

    const label = document.createElement("p");
    label.className = "memo-label-text";
    label.textContent = memo.label || "無題";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "toggle-memo-button";
    toggle.setAttribute("aria-label", "メモを開閉");
    toggle.textContent = "▼";

    header.append(label, toggle);

    const body = document.createElement("div");
    body.className = "memo-body";

    const content = document.createElement("p");
    content.className = "memo-content-text";
    content.textContent = memo.content || "";

    body.appendChild(content);
    item.append(header, body);
    viewMemos.appendChild(item);
  });
}

// メモの開閉
viewMemos.addEventListener("click", (event) => {
  if (!event.target.closest(".toggle-memo-button")) return;
  event.target.closest(".memo-item").classList.toggle("collapsed");
});

// ===== 編集 =====

function closeEditor() {
  editor.hide();
  viewMode.hidden = false;
}

const editor = mountEditor($("editor"), {
  draftKey: "draft-" + bookId,
  submitLabel: "保存する",
  onSubmit: (data) => {
    currentBook = updateBook(bookId, data);
    editor.clearDraft();
    displayBook(currentBook);
    closeEditor();
    notice.textContent = "保存しました。";
  },
  onCancel: () => {
    editor.clearDraft();
    closeEditor();
  }
});

editButton.addEventListener("click", () => {
  notice.textContent = "";

  // 前回の下書きがあれば、復元するか聞く
  const draft = editor.loadDraft();
  if (draft && window.confirm("前回の編集途中の内容があります。復元しますか？")) {
    editor.fill(draft);
  } else {
    editor.clearDraft();
    editor.fill(currentBook);
  }

  viewMode.hidden = true;
  editor.show();
});

// ===== 削除 =====

deleteButton.addEventListener("click", () => {
  if (!window.confirm("この読書メモを削除しますか？")) return;

  try {
    deleteBook(bookId);
    editor.clearDraft();
    window.location.href = "index.html";
  } catch (error) {
    console.error(error);
    notice.textContent = "削除できませんでした: " + error.message;
  }
});

// ===== 読み込み =====

if (!bookId) {
  viewTitle.textContent = "";
  notice.textContent = "作品IDがありません。";
} else {
  const book = getBook(bookId);

  if (!book) {
    viewTitle.textContent = "";
    notice.textContent = "この読書メモは存在しません。";
  } else {
    currentBook = book;
    displayBook(book);
    editButton.disabled = false;
    deleteButton.disabled = false;
  }
}
