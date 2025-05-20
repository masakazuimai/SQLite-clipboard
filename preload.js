// preload.js
const { contextBridge, ipcRenderer, clipboard } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  readClipboard: () => clipboard.readText(),
  saveToHistory: (text) => ipcRenderer.invoke("save-to-history", text),
  getHistory: () => ipcRenderer.invoke("get-history"),
  toggleFavorite: (id) => ipcRenderer.invoke("toggle-favorite", id),
  deleteHistory: (id) => ipcRenderer.invoke("delete-history", id),
  clearHistory: () => ipcRenderer.invoke("clear-history"),
  clearNonFavorites: () => ipcRenderer.invoke("clear-non-favorites"),
  onClipboardUpdated: (callback) => {
    ipcRenderer.on("new-clipboard", (_, text) => {
      callback(text);
    });
  },
});
