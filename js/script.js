const inputText = document.getElementById("inputText");
const normalList = document.getElementById("normalList");
const favoriteList = document.getElementById("favoriteList");

const loadHistory = () => {
  const history = JSON.parse(localStorage.getItem("clipboardHistory") || "[]");
  const favorites = history.filter((item) => item.favorite);
  const normal = history.filter((item) => !item.favorite);

  const createList = (targetList, data) => {
    targetList.innerHTML = "";
    data.forEach((item) => {
      const index = history.indexOf(item);
      const li = document.createElement("li");
      const container = document.createElement("div");
      container.className = "history-item";

      // 左側（★ + テキスト）
      const left = document.createElement("span");
      const star = document.createElement("span");
      star.className = "star";
      star.textContent = item.favorite ? "★" : "☆";
      star.onclick = () => toggleFavorite(index);

      const textSpan = document.createElement("span");
      textSpan.textContent = item.text; // ← 🔐 ここが安全

      left.appendChild(star);
      left.appendChild(textSpan);

      // 右側（アイコンボタン）
      const right = document.createElement("div");

      const copyBtn = document.createElement("button");
      copyBtn.className = "icon-btn";
      copyBtn.title = "再コピー";
      copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
      copyBtn.onclick = () => copyFromHistory(index);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-btn";
      deleteBtn.title = "削除";
      deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteBtn.onclick = () => deleteFromHistory(index);

      right.appendChild(copyBtn);
      right.appendChild(deleteBtn);

      container.appendChild(left);
      container.appendChild(right);
      li.appendChild(container);
      targetList.appendChild(li);
    });
  };

  createList(normalList, normal);
  createList(favoriteList, favorites);
};

const saveToHistory = (text) => {
  let history = JSON.parse(localStorage.getItem("clipboardHistory") || "[]");
  history = history.filter((item) => item.text !== text);
  history.unshift({ text, favorite: false });
  localStorage.setItem("clipboardHistory", JSON.stringify(history.slice(0, 50)));
};

const copyText = () => {
  const text = inputText.value.trim();
  if (!text) return alert("空のテキストはコピーできません");
  navigator.clipboard.writeText(text).then(() => {
    saveToHistory(text);
    inputText.value = "";
    loadHistory();
    alert("コピーしました！");
  });
};

const copyFromHistory = (index) => {
  const history = JSON.parse(localStorage.getItem("clipboardHistory") || "[]");
  navigator.clipboard.writeText(history[index].text).then(() => alert("コピーしました！"));
};

const deleteFromHistory = (index) => {
  const history = JSON.parse(localStorage.getItem("clipboardHistory") || "[]");
  history.splice(index, 1);
  localStorage.setItem("clipboardHistory", JSON.stringify(history));
  loadHistory();
};

const toggleFavorite = (index) => {
  const history = JSON.parse(localStorage.getItem("clipboardHistory") || "[]");
  history[index].favorite = !history[index].favorite;
  localStorage.setItem("clipboardHistory", JSON.stringify(history));
  loadHistory();
};

const clearHistory = () => {
  if (confirm("履歴を全て削除しますか？")) {
    localStorage.removeItem("clipboardHistory");
    loadHistory();
  }
};

// Electronのメインプロセスからクリップボードの更新を受け取る
if (window.electronAPI?.onClipboardUpdated) {
  window.electronAPI.onClipboardUpdated((text) => {
    console.log("🟢 受信したテキスト:", text); // ← 追加
    inputText.value = text;
    saveToHistory(text);
    loadHistory();
  });
} else {
  console.warn("electronAPIが使用できません。preload.jsの読み込みを確認してください。");
}

loadHistory();

// 初期テーマ適用
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  const isDark = savedTheme === "dark" || (!savedTheme && window.electronAPI?.getSystemTheme?.());

  document.body.classList.add(isDark ? "dark" : "light");
});

// 切り替え
function toggleTheme() {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  document.body.classList.remove("light", "dark");
  document.body.classList.add(next);
  localStorage.setItem("theme", next);
  window.electronAPI?.setTheme(next);
}

function showTab(tabName) {
  document.getElementById("normalTab").style.display = tabName === "normal" ? "block" : "none";
  document.getElementById("favoriteTab").style.display = tabName === "favorite" ? "block" : "none";
}
