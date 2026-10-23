// 読書メモの保存・読み込み(この端末のブラウザ内に保存)

const KEY = "yomimono-books";

// ブラウザに「消さないで」とお願いする(対応していない場合は何もしない)
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

function readAll() {
  try {
    const text = localStorage.getItem(KEY);
    const list = text ? JSON.parse(text) : [];
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.error("読み込みエラー:", error);
    return [];
  }
}

function writeAll(books) {
  localStorage.setItem(KEY, JSON.stringify(books));
}

function newId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function listBooks() {
  return readAll();
}

export function getBook(id) {
  return readAll().find((book) => book.id === id) || null;
}

export function addBook(data) {
  const books = readAll();
  const book = { ...data, id: newId(), updatedAt: Date.now() };
  books.push(book);
  writeAll(books);
  return book;
}

export function updateBook(id, data) {
  const books = readAll();
  const index = books.findIndex((book) => book.id === id);
  if (index < 0) {
    throw new Error("この読書メモは存在しません。");
  }
  books[index] = { ...books[index], ...data, id: id, updatedAt: Date.now() };
  writeAll(books);
  return books[index];
}

export function deleteBook(id) {
  writeAll(readAll().filter((book) => book.id !== id));
}

// ===== バックアップ =====

export function exportJson() {
  return JSON.stringify(
    {
      app: "yomimono",
      version: 1,
      exportedAt: new Date().toISOString(),
      books: readAll()
    },
    null,
    2
  );
}

// 戻したメモの件数を返す。同じメモがある場合は、更新が新しい方を残す。
export function importJson(text) {
  const parsed = JSON.parse(text);
  const incoming = Array.isArray(parsed) ? parsed : parsed.books;

  if (!Array.isArray(incoming)) {
    throw new Error("バックアップファイルの形式が正しくありません。");
  }

  const map = new Map(readAll().map((book) => [book.id, book]));
  let count = 0;

  incoming.forEach((book) => {
    if (!book || typeof book !== "object" || !book.id) return;
    const current = map.get(book.id);
    if (!current || (book.updatedAt || 0) > (current.updatedAt || 0)) {
      map.set(book.id, book);
      count++;
    }
  });

  writeAll(Array.from(map.values()));
  return count;
}
