/**
 * tasks.js
 * タスク登録・管理
 * 各タスクは { id, name, done, doneDate } を持つ
 * 完了日は Calendar.getWorkDays() が返す稼働日のみ選択可能な <select> で管理する
 */

window.Tasks = (() => {
  let taskList = [];
  let nextId = 1;

  function today() { return toKey(new Date()); }

  function toKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getAll() { return taskList; }

  function formatDate(key) {
    if (!key) return '';
    const [, m, d] = key.split('-');
    return `${parseInt(m)}/${parseInt(d)}`;
  }

  function getWorkDays() {
    return typeof Calendar !== 'undefined' ? Calendar.getWorkDays() : [];
  }

  function buildDateOptions(selectedKey) {
    const workDays = getWorkDays();
    if (workDays.length === 0) return `<option value="">（期間未設定）</option>`;
    return workDays.map(day => {
      const sel = day === selectedKey ? ' selected' : '';
      return `<option value="${day}"${sel}>${formatDate(day)}</option>`;
    }).join('');
  }

  function updateStats() {
    const total = taskList.length;
    const done  = taskList.filter(t => t.done).length;
    document.getElementById('stat-total-tasks').textContent     = total;
    document.getElementById('stat-done-tasks').textContent      = done;
    document.getElementById('stat-remaining-tasks').textContent = total - done;
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 保存用データ取得
  function getData() {
    return { tasks: taskList, nextId };
  }

  // 復元
  function setData(data) {
    if (!data || !data.tasks) return;
    taskList = data.tasks;
    nextId   = data.nextId || (Math.max(0, ...taskList.map(t => t.id)) + 1);
    render();
  }

  function autoSave() {
    if (typeof Storage === 'undefined' || !Storage._collector) return;
    Storage.save(Storage._collector());
  }

  function render() {
    const tbody = document.getElementById('task-tbody');
    tbody.innerHTML = '';

    if (taskList.length === 0) {
      tbody.innerHTML = `<tr class="task-empty-row"><td colspan="5">
        <div class="empty-state">
          <span class="empty-icon">📋</span>
          <p>タスク数を入力して「一括生成」を押してください</p>
        </div></td></tr>`;
      updateStats();
      if (typeof BurnUpChart !== 'undefined') BurnUpChart.update();
      return;
    }

    taskList.forEach((task, idx) => {
      const tr = document.createElement('tr');
      if (task.done) tr.classList.add('done-row');
      tr.innerHTML = `
        <td class="col-no">${idx + 1}</td>
        <td class="col-name">
          <input class="task-name-input${task.done ? ' done-text' : ''}"
            type="text" value="${escapeHtml(task.name)}"
            placeholder="タスク名（任意）" data-id="${task.id}">
        </td>
        <td class="col-done">
          <input class="task-checkbox" type="checkbox"
            ${task.done ? 'checked' : ''} data-id="${task.id}">
        </td>
        <td class="col-date">
          ${task.done
            ? `<select class="task-date-select" data-id="${task.id}">
                ${buildDateOptions(task.doneDate)}
               </select>`
            : '<span class="date-empty">－</span>'}
        </td>
        <td class="col-action">
          <button class="btn-row-delete" data-id="${task.id}" title="削除">×</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.task-name-input').forEach(input => {
      input.addEventListener('change', e => {
        const task = taskList.find(t => t.id === Number(e.target.dataset.id));
        if (task) { task.name = e.target.value; autoSave(); }
      });
    });

    tbody.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('change', e => {
        const task = taskList.find(t => t.id === Number(e.target.dataset.id));
        if (!task) return;
        task.done = e.target.checked;
        if (task.done) {
          const workDays = getWorkDays();
          const t = today();
          task.doneDate = workDays.includes(t)
            ? t
            : (workDays.filter(d => d <= t).pop() || workDays[0] || null);
        } else {
          task.doneDate = null;
        }
        render();
        if (typeof BurnUpChart !== 'undefined') BurnUpChart.update();
        autoSave();
      });
    });

    tbody.querySelectorAll('.task-date-select').forEach(sel => {
      sel.addEventListener('change', e => {
        const task = taskList.find(t => t.id === Number(e.target.dataset.id));
        if (task) {
          task.doneDate = e.target.value || null;
          if (typeof BurnUpChart !== 'undefined') BurnUpChart.update();
          autoSave();
        }
      });
    });

    tbody.querySelectorAll('.btn-row-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        taskList = taskList.filter(t => t.id !== Number(e.target.dataset.id));
        render();
        if (typeof BurnUpChart !== 'undefined') BurnUpChart.update();
        autoSave();
      });
    });

    updateStats();
    if (typeof BurnUpChart !== 'undefined') BurnUpChart.update();
  }

  function generate(count) {
    taskList = [];
    nextId   = 1;
    for (let i = 0; i < count; i++) {
      taskList.push({ id: nextId++, name: '', done: false, doneDate: null });
    }
    render();
    autoSave();
  }

  function addOne() {
    taskList.push({ id: nextId++, name: '', done: false, doneDate: null });
    render();
    document.querySelector('.task-table-wrap').scrollTop = 99999;
    autoSave();
  }

  function clearAll() {
    if (taskList.length === 0) return;
    if (!confirm('すべてのタスクを削除しますか？')) return;
    taskList = [];
    nextId   = 1;
    render();
    autoSave();
  }

  function refreshDates() {
    const workDays = getWorkDays();
    taskList.forEach(task => {
      if (task.done && task.doneDate && !workDays.includes(task.doneDate)) {
        task.doneDate = workDays.filter(d => d <= task.doneDate).pop()
          || workDays[0] || null;
      }
    });
    render();
  }

  function init() {
    document.getElementById('btn-generate').addEventListener('click', () => {
      const val = parseInt(document.getElementById('task-count').value, 10);
      if (!val || val < 1) { alert('タスク数を1以上の整数で入力してください'); return; }
      generate(val);
    });
    document.getElementById('task-count').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-generate').click();
    });
    document.getElementById('btn-add-one').addEventListener('click', addOne);
    document.getElementById('btn-clear-all').addEventListener('click', clearAll);
    render();
  }

  return { init, getAll, getData, setData, refreshDates };
})();
