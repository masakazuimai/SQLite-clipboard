const { app, BrowserWindow, ipcMain, clipboard, screen } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(app.getPath("userData"), "history.sqlite");
const db = new Database(dbPath);
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY,
    text TEXT,
    favorite INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`
).run();

let mainWindow;

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = Math.floor(screenWidth * 0.2);
  const windowHeight = Math.floor(screenHeight * 0.5);
  const windowX = screenWidth - windowWidth;
  const windowY = Math.floor((screenHeight - windowHeight) / 2);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowX,
    y: windowY,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

  // 📦 アップデートチェック
  autoUpdater.checkForUpdatesAndNotify();

  // 📋 クリップボード監視
  let lastClipboardText = "";

  setInterval(() => {
    try {
      const text = clipboard.readText().trim();
      if (text && text !== lastClipboardText) {
        lastClipboardText = text;

        const last = db.prepare("SELECT text FROM history ORDER BY id DESC LIMIT 1").get();
        if (!last || last.text !== text) {
          db.prepare("INSERT INTO history (text, favorite) VALUES (?, 0)").run(text);

          // 最大100件に制限
          const count = db.prepare("SELECT COUNT(*) as cnt FROM history").get().cnt;
          if (count > 100) {
            const toDelete = db.prepare("SELECT id FROM history WHERE favorite = 0 ORDER BY created_at ASC LIMIT ?").all(count - 100);
            const delStmt = db.prepare("DELETE FROM history WHERE id = ?");
            const tx = db.transaction(() => {
              toDelete.forEach((row) => delStmt.run(row.id));
            });
            tx();
          }

          if (mainWindow) {
            mainWindow.webContents.send("new-clipboard", text);
          }
        }
      }
    } catch (err) {
      console.error("[main] clipboard.readText() 失敗:", err);
    }
  }, 1000);
});

// 🔔 自動アップデート通知
autoUpdater.on("update-available", () => {
  mainWindow?.webContents.send("message", "新しいバージョンがあります。ダウンロード中…");
});

autoUpdater.on("update-downloaded", () => {
  mainWindow?.webContents.send("message", "アップデートの準備ができました。再起動します。");
  autoUpdater.quitAndInstall();
});

// 🎛 IPC操作
ipcMain.handle("save-to-history", (_, text) => {
  db.prepare("INSERT INTO history (text, favorite) VALUES (?, 0)").run(text);
});

ipcMain.handle("get-history", () => {
  return db.prepare("SELECT * FROM history ORDER BY id DESC").all();
});

ipcMain.handle("toggle-favorite", (_, id) => {
  db.prepare("UPDATE history SET favorite = NOT favorite WHERE id = ?").run(id);
});

ipcMain.handle("delete-history", (_, id) => {
  db.prepare("DELETE FROM history WHERE id = ?").run(id);
});

ipcMain.handle("clear-history", () => {
  db.prepare("DELETE FROM history").run();
});

ipcMain.handle("clear-non-favorites", () => {
  const items = db.prepare("SELECT id, favorite FROM history").all();
  const stmt = db.prepare("DELETE FROM history WHERE id = ?");
  const tx = db.transaction(() => {
    items.forEach((item) => {
      if (!item.favorite) stmt.run(item.id);
    });
  });
  tx();
});

// ⛔ macOSでは閉じても終了しないようにする（常駐）
app.on("window-all-closed", () => {});
