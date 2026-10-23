import { addBook } from "./storage.js";
import { mountEditor } from "./editor.js";

document.getElementById("back-button").addEventListener("click", () => {
  window.location.href = "index.html";
});

const editor = mountEditor(document.getElementById("editor"), {
  draftKey: "draft-new",
  submitLabel: "保存する",
  onSubmit: (data) => {
    addBook(data);
    editor.clearDraft();

    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);

    return "保存しました。";
  }
});

// 前回の入力途中の内容があれば、復元するか聞く
const draft = editor.loadDraft();
if (draft && window.confirm("前回の入力途中の内容があります。復元しますか？")) {
  editor.fill(draft);
} else {
  editor.clearDraft();
  editor.fill(null);
}
editor.show();
