// renderer.js
let isInternalCopy = false;
let lastSavedText = "";

const inputText = document.getElementById("inputText");
const normalList = document.getElementById("normalList");
const favoriteList = document.getElementById("favoriteList");

async function loadHistory() {
  const history = await window.electronAPI.getHistory();
  const favorites = history.filter((item) => item.favorite);
  const normal = history.filter((item) => !item.favorite);

  renderList(normalList, normal);
  renderList(favoriteList, favorites);
}

function renderList(target, items) {
  target.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const left = document.createElement("span");
    const text = document.createElement("span");
    text.textContent = item.text;
    left.appendChild(text);

    const right = document.createElement("div");

    const star = document.createElement("span");
    star.className = "icon-btn star";
    star.textContent = item.favorite ? "★" : "☆";
    star.onclick = () => toggleFavorite(item.id);
    right.appendChild(star);

    const copyBtn = document.createElement("button");
    copyBtn.className = "icon-btn";
    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
    copyBtn.onclick = () => {
      isInternalCopy = true;
      navigator.clipboard.writeText(item.text).then(() => {
        alert("Copy!");
        setTimeout(() => {
          isInternalCopy = false;
        }, 500);
      });
    };
    right.appendChild(copyBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn";
    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteBtn.onclick = () => deleteItem(item.id);
    right.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(right);

    target.appendChild(li);
  });
}

function copyText() {
  const text = inputText.value.trim();
  if (!text) return alert("空のテキストはコピーできません");
  navigator.clipboard.writeText(text).then(() => {
    window.electronAPI.saveToHistory(text).then(() => {
      inputText.value = "";
      loadHistory();
    });
  });
}

function toggleFavorite(id) {
  window.electronAPI.toggleFavorite(id).then(loadHistory);
}

function deleteItem(id) {
  if (confirm("削除しますか？")) {
    window.electronAPI.deleteHistory(id).then(loadHistory);
  }
}

function clearAll() {
  if (confirm("すべての履歴を削除しますか？")) {
    window.electronAPI.clearHistory().then(() => {
      inputText.value = ""; // 念のため
      loadHistory();
    });
  }
}

function clearOnlyNormal() {
  if (confirm("通常の履歴のみ削除しますか？")) {
    window.electronAPI.clearNonFavorites().then(() => {
      inputText.value = ""; // ← 空でも明示的に消す
      loadHistory(); // ← UI更新を必ず実行
    });
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((tc) => tc.classList.remove("active"));
    tab.classList.add("active");
    const target = document.getElementById(tab.getAttribute("data-target"));
    target.classList.add("active");
  });
});

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

async function handleClipboardEvent() {
  try {
    if (isInternalCopy) return;
    const text = await navigator.clipboard.readText();
    const trimmed = text.trim();
    if (document.activeElement !== inputText) {
      inputText.value = trimmed;
    }
    if (trimmed && trimmed !== lastSavedText) {
      lastSavedText = trimmed;
      await window.electronAPI.saveToHistory(trimmed);
      await loadHistory();
    }
  } catch (err) {
    console.error("Clipboard処理失敗:", err);
  }
}

window.addEventListener("focus", handleClipboardEvent);
document.addEventListener("copy", handleClipboardEvent);
document.addEventListener("cut", handleClipboardEvent);

window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }

  loadHistory();

  if (window.electronAPI?.onClipboardUpdated) {
    window.electronAPI.onClipboardUpdated((text) => {
      inputText.value = text;
      lastSavedText = text.trim();
      loadHistory();
    });
  } else {
    console.warn("electronAPI が使用できません。preload.js を確認してください。");
  }
});
