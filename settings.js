import { exportJson, importJson } from "./storage.js";

const message = document.getElementById("message");
const importFile = document.getElementById("import-file");

document.getElementById("back-button").addEventListener("click", () => {
  window.location.href = "index.html";
});

function todayText() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
}

// バックアップを保存する(ファイルをダウンロード)
document.getElementById("export-button").addEventListener("click", () => {
  try {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "yomimono-backup-" + todayText() + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 10000);
    message.textContent = "バックアップを保存しました。";
  } catch (error) {
    console.error("バックアップ保存エラー:", error);
    message.textContent = "バックアップを保存できませんでした: " + error.message;
  }
});

// バックアップから戻す
document.getElementById("import-button").addEventListener("click", () => {
  importFile.click();
});

importFile.addEventListener("change", async () => {
  const file = importFile.files[0];
  if (!file) return;

  try {
    const count = importJson(await file.text());
    message.textContent = count + "件のメモを戻しました。";
  } catch (error) {
    console.error("バックアップ読み込みエラー:", error);
    message.textContent = "戻せませんでした: " + error.message;
  } finally {
    importFile.value = "";
  }
});
