/**
 * main.js
 * アプリ起動・ページ切り替え・データ保存統括
 */

document.addEventListener('DOMContentLoaded', () => {

  // ---- ページ切り替え ----
  const navBtns = document.querySelectorAll('.nav-btn');
  const pages   = document.querySelectorAll('.page');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.page;
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pages.forEach(p => p.classList.toggle('hidden', p.id !== `page-${target}`));
      if (target === 'chart') BurnUpChart.update();
    });
  });

  // ---- プロジェクト名 ----
  const projectNameEl = document.getElementById('project-name');
  const DEFAULT_NAME  = 'Burn Up Chart';

  function getProjectName() {
    return projectNameEl.textContent.trim() || DEFAULT_NAME;
  }

  function setProjectName(name) {
    projectNameEl.textContent = name || DEFAULT_NAME;
    document.title = (name || DEFAULT_NAME);
  }

  // Enter で確定、Escape でキャンセル
  projectNameEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      projectNameEl.blur();
    }
    if (e.key === 'Escape') {
      projectNameEl.blur();
    }
  });

  // フォーカスが外れたら保存
  projectNameEl.addEventListener('blur', () => {
    const name = getProjectName();
    setProjectName(name);
    autoSave();
  });

  // ---- 全データ収集 ----
  function collectAll() {
    return {
      projectName: getProjectName(),
      calendar:    Calendar.getData(),
      tasks:       Tasks.getData(),
    };
  }

  function autoSave() {
    Storage.save(collectAll());
  }

  // Storage / Calendar に collector を注入
  Storage._collector    = collectAll;
  Calendar.setCollector(collectAll);

  // ---- 各モジュール初期化 ----
  Calendar.init();
  Tasks.init();
  BurnUpChart.init();

  // ---- localStorage から復元 ----
  const saved = Storage.load();
  if (saved) {
    if (saved.projectName) setProjectName(saved.projectName);
    Calendar.setData(saved.calendar);
    Tasks.setData(saved.tasks);
    BurnUpChart.update();
  }

  // ---- JSON エクスポート ----
  document.getElementById('btn-export').addEventListener('click', () => {
    Storage.exportJSON(collectAll());
  });

  // ---- JSON インポート ----
  document.getElementById('btn-import').addEventListener('click', () => {
    Storage.importJSON(data => {
      if (!data.calendar || !data.tasks) {
        alert('形式が正しくないJSONファイルです。');
        return;
      }
      if (data.projectName) setProjectName(data.projectName);
      Calendar.setData(data.calendar);
      Tasks.setData(data.tasks);
      BurnUpChart.update();
      alert('データを読み込みました！');
    });
  });

});
