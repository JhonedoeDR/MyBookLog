import { initScanner } from "./scan.js";

const GENRES = ["ゲーム", "ドラマ", "映画", "アニメ", "小説", "その他"];
const STATUSES = ["積読", "読書中", "読了"];

function resizeTextarea(textarea) {
  textarea.style.height = "auto";
  // 非表示のとき scrollHeight は 0 なので、その場合は何もしない
  if (textarea.scrollHeight > 0) {
    textarea.style.height = textarea.scrollHeight + "px";
  }
}

export function mountEditor(root, options) {
  const {
    draftKey,
    submitLabel = "保存する",
    onSubmit,
    onCancel
  } = options;

  root.innerHTML = `
    <form id="book-form">
      <div class="form-group">
        <label for="title">作品名</label>
        <input type="text" id="title" required>
      </div>

      <div class="form-group">
        <label for="author">著者・作者</label>
        <input type="text" id="author">
      </div>

      <fieldset>
        <legend>ジャンル</legend>
        ${GENRES.map(
          (g) => `<label><input type="checkbox" name="genre" value="${g}">${g}</label>`
        ).join("")}
      </fieldset>

      <div class="form-group">
        <label for="status">進捗</label>
        <select id="status">
          ${STATUSES.map((s) => `<option value="${s}">${s}</option>`).join("")}
        </select>
      </div>

      <p class="section-label">メモ</p>
      <div id="memo-list"></div>

      <div class="form-tools">
        <button type="button" class="btn-sub" id="add-memo-button">＋ メモを追加</button>
        <button type="button" class="btn-sub" id="scan-button">資料をスキャンして読み取る</button>
      </div>

      <button type="submit" class="btn-main" id="submit-button">${submitLabel}</button>
      ${onCancel ? '<button type="button" class="btn-cancel" id="cancel-button">キャンセル</button>' : ""}
      <p class="message" id="message"></p>
    </form>

    <div id="scan-modal" class="scan-modal" hidden>
      <div class="scan-modal-inner">
        <h2>資料を読み取る</h2>
        <video id="scan-video" autoplay playsinline></video>
        <canvas id="scan-canvas" hidden></canvas>
        <div class="scan-buttons">
          <button type="button" id="capture-button">撮影する</button>
          <button type="button" id="close-scan-button">閉じる</button>
        </div>
        <p id="scan-status"></p>
        <textarea id="scan-result" placeholder="読み取った文章がここに表示されます"></textarea>
        <div class="scan-buttons">
          <button type="button" id="copy-result-button">コピーする</button>
          <button type="button" id="add-to-memo-button">メモに追加する</button>
        </div>
      </div>
    </div>
  `;

  const form = root.querySelector("#book-form");
  const titleInput = root.querySelector("#title");
  const authorInput = root.querySelector("#author");
  const statusSelect = root.querySelector("#status");
  const memoList = root.querySelector("#memo-list");
  const message = root.querySelector("#message");
  const submitButton = root.querySelector("#submit-button");

  // 何か入力・変更されたときだけ下書きを保存する
  let dirty = false;

  // ===== 下書き =====

  function collect() {
    return {
      title: titleInput.value,
      author: authorInput.value,
      status: statusSelect.value,
      genre: Array.from(
        form.querySelectorAll('input[name="genre"]:checked')
      ).map((input) => input.value),
      memoSections: Array.from(
        memoList.querySelectorAll(".memo-item")
      ).map((item) => ({
        label: item.querySelector(".memo-label").value,
        content: item.querySelector(".memo-content").value
      }))
    };
  }

  function saveDraft() {
    // 非表示のとき、または未変更のときは保存しない
    if (root.hidden || !dirty) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(collect()));
    } catch (error) {
      console.error("下書き保存エラー:", error);
    }
  }

  function markDirty() {
    dirty = true;
    saveDraft();
  }

  function loadDraft() {
    try {
      const text = localStorage.getItem(draftKey);
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error("下書き読み込みエラー:", error);
      return null;
    }
  }

  function clearDraft() {
    dirty = false;
    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error(error);
    }
  }

  // 入力のたびに保存
  form.addEventListener("input", markDirty);
  form.addEventListener("change", markDirty);

  // 別アプリに切り替えた瞬間・ページを離れる瞬間にも保存
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveDraft();
  });
  window.addEventListener("pagehide", saveDraft);

  // ===== メモ欄 =====

  function addMemo(label = "", content = "") {
    const item = document.createElement("div");
    item.className = "memo-item";

    const header = document.createElement("div");
    header.className = "memo-header";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "memo-label";
    labelInput.placeholder = "メモのタイトル";
    labelInput.value = label;

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "toggle-memo-button";
    toggleButton.setAttribute("aria-label", "メモを開閉");
    toggleButton.textContent = "▼";

    header.append(labelInput, toggleButton);

    const body = document.createElement("div");
    body.className = "memo-body";

    const textarea = document.createElement("textarea");
    textarea.className = "memo-content";
    textarea.placeholder = "内容";
    textarea.value = content;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-memo-button";
    deleteButton.textContent = "このメモを削除";

    body.append(textarea, deleteButton);
    item.append(header, body);
    memoList.appendChild(item);

    resizeTextarea(textarea);
    return item;
  }

  function resizeAll() {
    memoList.querySelectorAll(".memo-content").forEach(resizeTextarea);
  }

  memoList.addEventListener("click", (event) => {
    const item = event.target.closest(".memo-item");
    if (!item) return;

    // 開閉
    if (event.target.closest(".toggle-memo-button")) {
      item.classList.toggle("collapsed");
      resizeTextarea(item.querySelector(".memo-content"));
      return;
    }

    // 削除
    if (event.target.closest(".delete-memo-button")) {
      item.remove();
      markDirty();
    }
  });

  // 入力に合わせて高さを広げる
  memoList.addEventListener("input", (event) => {
    if (event.target.classList.contains("memo-content")) {
      resizeTextarea(event.target);
    }
  });

  root.querySelector("#add-memo-button").addEventListener("click", () => {
    addMemo();
    markDirty();
  });

  // スキャン結果をメモとして追加
  initScanner(root, (label, content) => {
    addMemo(label, content);
    markDirty();
  });

  // ===== 外から使う操作 =====

  // data が null のときは空のフォーム(メモ欄1つ)にする
  function fill(data) {
    const d = data || {};
    titleInput.value = d.title || "";
    authorInput.value = d.author || "";
    statusSelect.value = d.status || STATUSES[0];

    form.querySelectorAll('input[name="genre"]').forEach((checkbox) => {
      checkbox.checked =
        Array.isArray(d.genre) && d.genre.includes(checkbox.value);
    });

    memoList.replaceChildren();
    if (Array.isArray(d.memoSections) && d.memoSections.length > 0) {
      d.memoSections.forEach((memo) => {
        addMemo(memo.label || "", memo.content || "");
      });
    } else if (!data) {
      addMemo("メモ", "");
    }

    message.textContent = "";
    dirty = false;
  }

  function show() {
    root.hidden = false;
    resizeAll();
  }

  function hide() {
    root.hidden = true;
  }

  // ===== 保存・キャンセル =====

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    const data = {
      title: titleInput.value.trim(),
      author: authorInput.value.trim(),
      status: statusSelect.value,
      genre: collect().genre,
      memoSections: collect().memoSections.map((memo) => ({
        label: memo.label.trim(),
        content: memo.content.trim()
      }))
    };

    submitButton.disabled = true;
    try {
      const result = await onSubmit(data);
      dirty = false;
      if (typeof result === "string") {
        message.textContent = result;
      }
    } catch (error) {
      console.error("保存エラー:", error);
      message.textContent =
        "保存できませんでした: " + (error.code || "") + " " + error.message;
    } finally {
      submitButton.disabled = false;
    }
  });

  if (onCancel) {
    root.querySelector("#cancel-button").addEventListener("click", onCancel);
  }

  return { fill, show, hide, loadDraft, clearDraft };
}
