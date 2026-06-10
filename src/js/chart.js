/**
 * chart.js
 * バーンアップチャート描画 + 画像保存（PNG / クリップボード）
 */

window.BurnUpChart = (() => {
  let chartInstance = null;

  function getWorkDays() {
    return typeof Calendar !== 'undefined' ? Calendar.getWorkDays() : [];
  }

  function dateLE(a, b) { return a <= b; }

  function update() {
    const workDays = getWorkDays();
    const tasks    = typeof Tasks !== 'undefined' ? Tasks.getAll() : [];
    const total    = tasks.length;
    const done     = tasks.filter(t => t.done).length;

    document.getElementById('chart-stat-total').textContent = total || '－';
    document.getElementById('chart-stat-done').textContent  = done || (total ? '0' : '－');
    document.getElementById('chart-stat-pct').textContent   =
      total ? Math.round(done / total * 100) + '%' : '－';

    const hint = document.getElementById('chart-hint');

    if (workDays.length === 0 || total === 0) {
      hint.textContent = workDays.length === 0
        ? '期間設定タブで開始日・終了日を設定してください'
        : 'タスクタブでタスクを登録してください';
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
      // ボタン無効化
      ['btn-save-png', 'btn-copy-img'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = true;
      });
      return;
    }

    hint.textContent = '';
    ['btn-save-png', 'btn-copy-img'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });

    const actualData = workDays.map(day =>
      tasks.filter(t => t.done && t.doneDate && dateLE(t.doneDate, day)).length
    );
    const idealData = workDays.map((_, i) =>
      parseFloat((total * i / (workDays.length - 1 || 1)).toFixed(2))
    );
    const scopeData = workDays.map(() => total);
    const labels    = workDays.map(d => {
      const [, m, day] = d.split('-');
      return `${parseInt(m)}/${parseInt(day)}`;
    });

    const canvas = document.getElementById('burnup-chart');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '総タスク数（スコープ）',
            data: scopeData,
            borderColor: '#c5d0f8',
            backgroundColor: 'rgba(197,208,248,0.15)',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
            order: 3,
          },
          {
            label: '理想線',
            data: idealData,
            borderColor: '#f5b8a8',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [6, 3],
            pointRadius: 0,
            fill: false,
            tension: 0,
            order: 2,
          },
          {
            label: '完了数（実績）',
            data: actualData,
            borderColor: '#4361ee',
            backgroundColor: 'rgba(67,97,238,0.08)',
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: '#4361ee',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            fill: true,
            tension: 0.3,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a2e',
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.8)',
            padding: 10,
            callbacks: {
              label: ctx => {
                const val = ctx.parsed.y;
                return ` ${ctx.dataset.label}: ${Number.isInteger(val) ? val : val.toFixed(1)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 11 }, color: '#999', maxRotation: 45, autoSkip: true, maxTicksLimit: 15 },
            border: { color: '#e8ecf4' },
          },
          y: {
            min: 0,
            max: total + Math.ceil(total * 0.05) || 10,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 11 }, color: '#999', stepSize: Math.ceil(total / 10) || 1, precision: 0 },
            border: { color: '#e8ecf4' },
          }
        }
      }
    });
  }

  // チャートを白背景の PNG として blob で返す
  function getChartBlob() {
    return new Promise(resolve => {
      if (!chartInstance) { resolve(null); return; }
      const src    = document.getElementById('burnup-chart');
      const off    = document.createElement('canvas');
      off.width    = src.width;
      off.height   = src.height;
      const ctx    = off.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, off.width, off.height);
      ctx.drawImage(src, 0, 0);
      off.toBlob(blob => resolve(blob), 'image/png');
    });
  }

  // PNG ダウンロード
  async function savePNG() {
    const blob = await getChartBlob();
    if (!blob) return;
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const now  = new Date();
    const ts   = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    a.href     = url;
    a.download = `burnup-chart-${ts}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // クリップボードにコピー
  async function copyToClipboard() {
    const blob = await getChartBlob();
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showToast('クリップボードにコピーしました！');
    } catch {
      showToast('コピーに失敗しました（ブラウザが非対応の場合があります）', true);
    }
  }

  // トースト通知
  function showToast(msg, isError = false) {
    let toast = document.getElementById('chart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'chart-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className   = 'chart-toast' + (isError ? ' toast-error' : ' toast-ok');
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function init() {
    update();
    document.getElementById('btn-save-png').addEventListener('click', savePNG);
    document.getElementById('btn-copy-img').addEventListener('click', copyToClipboard);
  }

  return { init, update };
})();
