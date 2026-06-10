/**
 * calendar.js
 * 期間設定・休日管理・稼働日カウント
 */

window.Calendar = (() => {
  let holidays = new Set(); // 手動休日 "YYYY-MM-DD"
  let viewYear, viewMonth;

  const startEl = document.getElementById('start');
  const endEl   = document.getElementById('end');

  function toLocalKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseLocalDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  function getWorkDays() {
    const s = parseLocalDate(startEl.value);
    const e = parseLocalDate(endEl.value);
    if (!s || !e || e < s) return [];
    const days = [];
    const cur  = new Date(s);
    while (cur <= e) {
      if (!isWeekend(cur) && !holidays.has(toLocalKey(cur))) {
        days.push(toLocalKey(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }

  // 保存用データ取得
  function getData() {
    return {
      start:    startEl.value,
      end:      endEl.value,
      holidays: [...holidays],
    };
  }

  // 復元
  function setData(data) {
    if (!data) return;
    startEl.value = data.start || '';
    endEl.value   = data.end   || '';
    holidays      = new Set(data.holidays || []);
    const s = parseLocalDate(startEl.value);
    if (s) { viewYear = s.getFullYear(); viewMonth = s.getMonth(); }
    render();
    updateStats();
  }

  function updateStats() {
    const s = parseLocalDate(startEl.value);
    const e = parseLocalDate(endEl.value);
    if (!s || !e || e < s) {
      document.getElementById('total-days').textContent    = '－';
      document.getElementById('holiday-count').textContent = '0 日';
      document.getElementById('work-days').textContent     = '－';
      return;
    }
    let totalDays = 0, holidayCount = 0;
    const cur = new Date(s);
    while (cur <= e) {
      totalDays++;
      if (isWeekend(cur) || holidays.has(toLocalKey(cur))) holidayCount++;
      cur.setDate(cur.getDate() + 1);
    }
    document.getElementById('total-days').textContent    = totalDays + ' 日';
    document.getElementById('holiday-count').textContent = holidayCount + ' 日';
    document.getElementById('work-days').textContent     = (totalDays - holidayCount) + ' 日';
    if (typeof BurnUpChart !== 'undefined') BurnUpChart.update();
    if (typeof Tasks !== 'undefined') Tasks.refreshDates();
    autoSave();
  }

  function render() {
    document.getElementById('month-label').textContent = `${viewYear}年 ${viewMonth + 1}月`;
    const container = document.getElementById('cal-days');
    container.innerHTML = '';
    const s = parseLocalDate(startEl.value);
    const e = parseLocalDate(endEl.value);
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay  = new Date(viewYear, viewMonth + 1, 0);
    const startDow = firstDay.getDay();

    for (let i = 0; i < startDow; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-day';
      container.appendChild(blank);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const thisDate = new Date(viewYear, viewMonth, d);
      const key      = toLocalKey(thisDate);
      const dow      = thisDate.getDay();
      const inRange  = s && e && thisDate >= s && thisDate <= e;
      const isHol    = holidays.has(key);
      const isSat    = dow === 6;
      const isSun    = dow === 0;

      const el = document.createElement('div');
      el.textContent = d;
      let cls = 'cal-day';
      if (inRange) {
        cls += ' in-range';
        if (isSat) cls += ' sat';
        if (isSun) cls += ' sun';
        if (isHol && !isWeekend(thisDate)) cls += ' holiday';
        if (!isWeekend(thisDate)) {
          el.addEventListener('click', () => {
            if (holidays.has(key)) holidays.delete(key);
            else holidays.add(key);
            render();
            updateStats();
          });
        }
      }
      el.className = cls;
      container.appendChild(el);
    }
  }

  function autoSave() {
    if (typeof Storage === 'undefined') return;
    Storage.save(collectAllData());
  }

  // main.js から呼ばれる全データ収集（循環参照回避のため外部から注入）
  let _collectAll = null;
  function setCollector(fn) { _collectAll = fn; }
  function collectAllData() { return _collectAll ? _collectAll() : {}; }

  function init() {
    const today = new Date();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 13);
    startEl.value = toLocalKey(today);
    endEl.value   = toLocalKey(twoWeeksLater);
    viewYear  = today.getFullYear();
    viewMonth = today.getMonth();
    render();
    updateStats();

    startEl.addEventListener('change', () => {
      const s = parseLocalDate(startEl.value);
      if (s) { viewYear = s.getFullYear(); viewMonth = s.getMonth(); }
      render();
      updateStats();
    });
    endEl.addEventListener('change', () => { render(); updateStats(); });
    document.getElementById('prev-month').addEventListener('click', () => {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      render();
    });
    document.getElementById('next-month').addEventListener('click', () => {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      render();
    });
  }

  return { init, getWorkDays, getData, setData, setCollector };
})();
