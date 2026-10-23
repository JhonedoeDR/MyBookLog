import { listBooks } from "./storage.js";

const bookList = document.getElementById("book-list");
const emptyMessage = document.getElementById("empty-message");

function goNew() {
  window.location.href = "new.html";
}

document.getElementById("new-button").addEventListener("click", goNew);
document.getElementById("create-button").addEventListener("click", goNew);
document.getElementById("settings-button").addEventListener("click", () => {
  window.location.href = "settings.html";
});

function createLine(text) {
  const p = document.createElement("p");
  p.textContent = text;
  return p;
}

const books = listBooks();

if (books.length === 0) {
  emptyMessage.textContent = "まだメモがありません。";
} else {
  // 更新が新しい順
  books.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  bookList.replaceChildren();

  books.forEach((book) => {
    const card = document.createElement("article");
    card.className = "book-card";

    const title = document.createElement("h3");
    title.textContent = book.title || "作品名なし";

    card.append(
      title,
      createLine("著者：" + (book.author || "不明")),
      createLine("進捗：" + (book.status || "未設定"))
    );

    card.addEventListener("click", () => {
      window.location.href = "detail.html?id=" + encodeURIComponent(book.id);
    });

    bookList.appendChild(card);
  });
}
