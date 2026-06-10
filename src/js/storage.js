/**
 * storage.js
 * データ永続化モジュール
 * - localStorage への自動保存・復元
 * - JSON ファイルへのエクスポート／インポート
 */

window.Storage = (() => {
  const KEY = 'burnup-chart-data';

  // ---- 保存 ----
  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('保存失敗:', e);
    }
  }

  // ---- 読み込み ----
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('読み込み失敗:', e);
      return null;
    }
  }

  // ---- JSON エクスポート ----
  function exportJSON(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const now  = new Date();
    const ts   = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    a.href     = url;
    a.download = `burnup-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- JSON インポート ----
  function importJSON(callback) {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          callback(data);
        } catch {
          alert('JSONファイルの読み込みに失敗しました。');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  return { save, load, exportJSON, importJSON };
})();
