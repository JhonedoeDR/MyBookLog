// 資料スキャン(カメラ + OCR)
// root の中に scan-modal などの要素がある前提。

let tesseractPromise = null;

// OCRライブラリは、初めて撮影したときに読み込む
function loadTesseract() {
  if (window.Tesseract) {
    return Promise.resolve(window.Tesseract);
  }
  if (!tesseractPromise) {
    tesseractPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.onload = () => resolve(window.Tesseract);
      script.onerror = () => {
        tesseractPromise = null;
        reject(new Error("OCRの読み込みに失敗しました"));
      };
      document.head.appendChild(script);
    });
  }
  return tesseractPromise;
}

export function initScanner(root, onAdd) {
  const scanButton = root.querySelector("#scan-button");
  const modal = root.querySelector("#scan-modal");
  const video = root.querySelector("#scan-video");
  const canvas = root.querySelector("#scan-canvas");
  const captureButton = root.querySelector("#capture-button");
  const closeButton = root.querySelector("#close-scan-button");
  const status = root.querySelector("#scan-status");
  const result = root.querySelector("#scan-result");
  const copyButton = root.querySelector("#copy-result-button");
  const addButton = root.querySelector("#add-to-memo-button");

  let stream = null;

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    video.srcObject = null;
  }

  function closeModal() {
    stopCamera();
    modal.hidden = true;
  }

  scanButton.addEventListener("click", async () => {
    modal.hidden = false;
    result.value = "";
    status.textContent = "";

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      video.srcObject = stream;
    } catch (error) {
      console.error("カメラ起動エラー:", error);
      status.textContent = "カメラを起動できませんでした: " + error.message;
    }
  });

  closeButton.addEventListener("click", closeModal);
  window.addEventListener("pagehide", stopCamera);

  captureButton.addEventListener("click", async () => {
    if (!stream || !video.videoWidth) {
      status.textContent = "カメラが起動していません。";
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(
      video, 0, 0, canvas.width, canvas.height
    );

    status.textContent = "文字を読み取っています…";
    captureButton.disabled = true;

    try {
      const Tesseract = await loadTesseract();
      const { data } = await Tesseract.recognize(canvas, "jpn+eng");
      result.value = data.text.trim();
      status.textContent = "読み取りが完了しました。";
    } catch (error) {
      console.error("OCRエラー:", error);
      status.textContent = "読み取りに失敗しました: " + error.message;
    } finally {
      captureButton.disabled = false;
    }
  });

  copyButton.addEventListener("click", async () => {
    if (!result.value) return;
    try {
      await navigator.clipboard.writeText(result.value);
      status.textContent = "コピーしました。";
    } catch (error) {
      console.error("コピーエラー:", error);
      status.textContent = "コピーできませんでした: " + error.message;
    }
  });

  addButton.addEventListener("click", () => {
    if (!result.value) return;
    onAdd("スキャンしたメモ", result.value);
    closeModal();
  });
}
