
const THEME_KEY = 'arina_sim_theme';
const MOON_ICON = '<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>';
const SUN_ICON = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/>';

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('theme-icon').innerHTML = SUN_ICON;
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('theme-icon').innerHTML = MOON_ICON;
  }
}
function toggleTheme() {
  const current = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
applyTheme(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');

/* ========================================================================
   SCROLL-НАВИГАЦИЯ
   ======================================================================== */
const navLinks = document.querySelectorAll('.nav-link');
const observedSections = ['scenarios', 'cases', 'talk'].map(id => document.getElementById(id)).filter(Boolean);
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) navLinks.forEach(link => link.classList.toggle('active', link.dataset.target === entry.target.id));
  });
}, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
observedSections.forEach(sec => navObserver.observe(sec));

/* ========================================================================
   ОБЩИЙ РЕНДЕРИНГ SVG-СХЕМЫ (прямоугольные узлы)
   ======================================================================== */
function wrapText(label, cx, cy, maxChars) {
  const words = label.split(' ');
  const lines = []; let line = '';
  words.forEach(w => {
    if ((line + ' ' + w).trim().length > maxChars) { lines.push(line.trim()); line = w; }
    else { line = (line + ' ' + w).trim(); }
  });
  if (line) lines.push(line);
  const startY = cy - ((lines.length - 1) * 7) + 4;
  return lines.map((l, i) => `<text x="${cx}" y="${startY + i * 14}">${l}</text>`).join('');
}

function buildSchemeSvg(scheme, opts) {
  opts = opts || {};
  const activeNodeId = opts.activeNodeId || null;
  const visitedNodeIds = opts.visitedNodeIds || [];
  const doneEdges = opts.doneEdges || [];
  const nodeMap = {};
  scheme.nodes.forEach(n => nodeMap[n.id] = n);

  let edgesSvg = '';
  scheme.edges.forEach(([fromId, toId], i) => {
    const a = nodeMap[fromId], b = nodeMap[toId];
    if (!a || !b) return;
    const ax = a.x + a.w, ay = a.y + a.h / 2;
    const bx = b.x, by = b.y + b.h / 2;
    const midX = (ax + bx) / 2;
    const path = `M ${ax} ${ay} C ${midX} ${ay}, ${midX} ${by}, ${bx} ${by}`;
    const isDone = doneEdges.some(([df, dt]) => df === fromId && dt === toId);
    edgesSvg += `<path class="scheme-edge" d="${path}"/>`;
    edgesSvg += `<path class="scheme-edge-flow ${isDone ? 'done' : ''}" d="${path}" style="animation-delay:${(i * 0.15).toFixed(2)}s"/>`;
  });

  let nodesSvg = '';
  scheme.nodes.forEach(n => {
    const isActive = n.id === activeNodeId;
    const isVisited = visitedNodeIds.includes(n.id);
    const cls = ['scheme-node', `kind-${n.kind}`];
    if (isActive) cls.push('active-live');
    else if (isVisited) cls.push('selected');
    nodesSvg += `<g class="${cls.join(' ')}" data-id="${n.id}">
      <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="14" ry="14"/>
      ${wrapText(n.label, n.x + n.w / 2, n.y + n.h / 2, 20)}
    </g>`;
  });

  return `<svg viewBox="${scheme.viewBox}" xmlns="http://www.w3.org/2000/svg">${edgesSvg}${nodesSvg}</svg>`;
}

/* ========================================================================
   СЦЕНАРИИ (раздел 01)
   ======================================================================== */
let currentScenarioKey = null;
let currentFilter = 'all';

function renderScenarioList() {
  const container = document.getElementById('scenario-list');
  const keys = Object.keys(SCENARIOS).filter(k => currentFilter === 'all' || SCENARIOS[k].category === currentFilter);
  container.innerHTML = keys.map(key => {
    const s = SCENARIOS[key];
    const badgeType = s.type === 'dialog' ? 'badge-dialog' : 'badge-monolog';
    return `<div class="scenario-item ${key === currentScenarioKey ? 'active' : ''}" data-key="${key}">
      <div class="scenario-item-title">${s.title}</div>
      <div class="scenario-item-meta">
        <span class="badge ${badgeType}">${s.typeLabel}</span>
        <span class="badge badge-cat">${s.categoryLabel}</span>
      </div>
    </div>`;
  }).join('') || '<div class="canvas-placeholder">Нет сценариев в этой категории</div>';
  container.querySelectorAll('.scenario-item').forEach(el => el.addEventListener('click', () => selectScenario(el.dataset.key)));
}

document.querySelectorAll('#scenario-filters .filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    currentFilter = chip.dataset.filter;
    document.querySelectorAll('#scenario-filters .filter-chip').forEach(c => c.classList.toggle('active', c === chip));
    renderScenarioList();
  });
});

function selectScenario(key) {
  currentScenarioKey = key;
  renderScenarioList();
  const s = SCENARIOS[key];
  document.getElementById('scenario-canvas-title').textContent = s.title;
  document.getElementById('scenario-canvas-type').textContent = s.typeLabel;
  document.getElementById('scenario-canvas-desc').textContent = s.description;
  document.getElementById('scheme-node-detail').classList.remove('show');

  const canvas = document.getElementById('scenario-canvas');
  canvas.innerHTML = buildSchemeSvg(s.scheme);
  canvas.querySelectorAll('.scheme-node').forEach(el => {
    el.addEventListener('click', () => {
      canvas.querySelectorAll('.scheme-node').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      showNodeDetail(key, el.dataset.id);
    });
  });

  renderObjections(s);
}

function showNodeDetail(scenarioKey, schemeNodeId) {
  const s = SCENARIOS[scenarioKey];
  const dialogEntry = Object.values(s.dialog.nodes).find(n => n.schemeId === schemeNodeId);
  const detail = document.getElementById('scheme-node-detail');
  if (!dialogEntry) { detail.classList.remove('show'); return; }
  detail.innerHTML = `<b>Реплика робота:</b> "${dialogEntry.robot}"`;
  detail.classList.add('show');
}

function renderObjections(scenario) {
  const wrap = document.getElementById('objections-wrap');
  const grid = document.getElementById('objections-grid');
  const keys = Object.keys(GLOBAL_OBJECTIONS);
  if (!keys.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  grid.innerHTML = keys.map(q => `<div class="objection-card"><div class="objection-q">«${capitalize(q)}»</div><div class="objection-a">${GLOBAL_OBJECTIONS[q]}</div></div>`).join('');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

renderScenarioList();

/* ========================================================================
   КЕЙСЫ (раздел 02): переключатель Аудио / Отчёт по обзвону
   ======================================================================== */
document.querySelectorAll('#cases-view-toggle .view-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#cases-view-toggle .view-toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
    const view = btn.dataset.view;
    document.getElementById('cases-view-audio').style.display = view === 'audio' ? 'block' : 'none';
    document.getElementById('cases-view-campaign').style.display = view === 'campaign' ? 'block' : 'none';
    if (view === 'campaign') renderCampaign();
    else stopAllPlayback();
  });
});

let caseFilter = 'all';

function renderCases() {
  const grid = document.getElementById('cases-grid');
  const list = CASES.filter(c => caseFilter === 'all' || c.category === caseFilter);
  grid.innerHTML = list.map(c => {
    const color = CATEGORY_COLORS[c.category] || '#35c2e0';
    const bars = c.peaks.map((p, i) => `<div class="bar" data-idx="${i}" style="height:${Math.max(8, p * 100)}%"></div>`).join('');
    const transcript = c.transcript.map((t, i) => `<div class="transcript-line ${t.speaker}" data-idx="${i}" data-t="${t.t}"><b>${labelFor(t.speaker)}:</b> ${t.text}</div>`).join('');
    return `<div class="case-card" data-id="${c.id}" style="--cat-color:${color}">
      <div class="case-card-head">
        <div><div class="case-card-title">${c.title}</div><div class="case-card-cat"><span class="cat-dot" style="background:${color}"></span>${c.categoryLabel}</div></div>
        <div class="case-duration">${c.duration}</div>
      </div>
      <div class="player" data-id="${c.id}">
        <button class="play-btn" data-id="${c.id}"><svg class="icon-play" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
        <div class="waveform" data-id="${c.id}">${bars}</div>
      </div>
      <div class="transcript" data-id="${c.id}">${transcript}</div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.play-btn').forEach(btn => btn.addEventListener('click', () => togglePlayback(btn.dataset.id)));
  grid.querySelectorAll('.waveform').forEach(wf => {
    wf.addEventListener('click', (e) => {
      const rect = wf.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      seekCase(wf.dataset.id, pct);
    });
  });
}

function labelFor(speaker) {
  if (speaker === 'robot') return 'Арина';
  if (speaker === 'client') return 'Клиент';
  return 'Система';
}

document.querySelectorAll('#case-filters .filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    caseFilter = chip.dataset.filter;
    document.querySelectorAll('#case-filters .filter-chip').forEach(c => c.classList.toggle('active', c === chip));
    stopAllPlayback();
    renderCases();
  });
});

const playbackState = {};
function parseDuration(str) { const [m, s] = str.split(':').map(Number); return m * 60 + s; }

function togglePlayback(id) {
  const c = CASES.find(x => x.id === id);
  if (!c) return;
  if (playbackState[id] && playbackState[id].playing) pausePlayback(id);
  else { stopAllPlayback(); startPlayback(id, c); }
}
function startPlayback(id, c) {
  const total = parseDuration(c.duration);
  const state = playbackState[id] || { progress: 0 };
  state.playing = true;
  playbackState[id] = state;
  updatePlayIcon(id, true);
  pulseBoost = 1;
  state.timer = setInterval(() => {
    state.progress += 0.1;
    renderProgress(id, state.progress / total, c);
    highlightTranscript(id, state.progress, c);
    if (state.progress >= total) stopPlayback(id);
  }, 100);
}
function pausePlayback(id) { const state = playbackState[id]; if (!state) return; state.playing = false; clearInterval(state.timer); updatePlayIcon(id, false); }
function stopPlayback(id) { pausePlayback(id); const state = playbackState[id]; if (state) state.progress = 0; const c = CASES.find(x => x.id === id); if (c) { renderProgress(id, 0, c); highlightTranscript(id, 0, c); } }
function stopAllPlayback() { Object.keys(playbackState).forEach(id => stopPlayback(id)); }

function seekCase(id, pct) {
  const c = CASES.find(x => x.id === id);
  if (!c) return;
  const total = parseDuration(c.duration);
  const state = playbackState[id] || { progress: 0 };
  state.progress = Math.max(0, Math.min(total, total * pct));
  playbackState[id] = state;
  renderProgress(id, state.progress / total, c);
  highlightTranscript(id, state.progress, c);
}
function renderProgress(id, ratio, c) {
  const wf = document.querySelector(`.waveform[data-id="${id}"]`);
  if (!wf) return;
  const bars = wf.querySelectorAll('.bar');
  const activeCount = Math.floor(bars.length * ratio);
  bars.forEach((b, i) => b.classList.toggle('played', i < activeCount));
}
function highlightTranscript(id, progressSec, c) {
  const container = document.querySelector(`.transcript[data-id="${id}"]`);
  if (!container) return;
  const lines = container.querySelectorAll('.transcript-line');
  let activeIdx = -1;
  c.transcript.forEach((t, i) => { if (progressSec >= t.t) activeIdx = i; });
  lines.forEach((l, i) => l.classList.toggle('active', i === activeIdx));
}
function updatePlayIcon(id, playing) {
  const btn = document.querySelector(`.play-btn[data-id="${id}"]`);
  if (!btn) return;
  btn.innerHTML = playing
    ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>'
    : '<svg class="icon-play" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
}

renderCases();

/* ===== Campaign (ЛК-стиль) ===== */
function renderCampaign() {
  const panel = document.getElementById('campaign-panel');
  const camp = CAMPAIGNS[0];
  if (!camp) { panel.innerHTML = ''; return; }

  const breakdownChips = camp.breakdown.map(b => `<div class="breakdown-chip"><span class="chip-dot" style="background:${b.color}"></span>${b.label} <b>${b.count}</b></div>`).join('');
  const rows = camp.calls.map(c => `<tr>
      <td>${c.duration}</td>
      <td class="phone-cell">${c.phone}</td>
      <td>${c.date}</td>
      <td><span class="result-tag" style="background:${resultColor(c.result)}22; color:${resultColor(c.result)}">${c.result}</span></td>
    </tr>`).join('');

  panel.innerHTML = `
    <div class="campaign-card">
      <div class="campaign-head">
        <div>
          <div class="campaign-date">${camp.date}</div>
          <h3 class="campaign-name">${camp.name}</h3>
          <div class="campaign-meta">
            <span>Период: ${camp.period}</span>
            <span>Автоперезвоны: ${camp.autoRetry}</span>
          </div>
        </div>
        <div class="campaign-status">${camp.status} &nbsp;${camp.processed}/${camp.total}</div>
      </div>
      <div class="campaign-stats-row">
        <div class="stat-pill"><div class="stat-pill-value success">${camp.dozvonilis}</div><div class="stat-pill-label">Дозвонились</div></div>
        <div class="stat-pill"><div class="stat-pill-value danger">${camp.nedozvonilis}</div><div class="stat-pill-label">Не дозвонились</div></div>
        <div class="stat-pill"><div class="stat-pill-value">${camp.ozhidayut}</div><div class="stat-pill-label">Ожидают звонка</div></div>
      </div>
      <div class="campaign-breakdown">${breakdownChips}</div>
      <table class="campaign-table">
        <thead><tr><th>Длительность</th><th>Телефон</th><th>Дата вызова</th><th>Результат</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function resultColor(result) {
  const map = { 'Автоответчик': '#f0a94e', 'Положили трубку': '#e0596b', 'Отказ': '#e0596b', 'Отказ. Помощь не нужна': '#e0596b' };
  return map[result] || '#35c2e0';
}

/* ========================================================================
   СИМУЛЯТОР (раздел 03): выбор сценария / чат-подсказки / живая схема
   ======================================================================== */
let talkScenarioKey = null;
let talkCurrentNodeId = null;
let talkVisitedNodes = [];
let talkDoneEdges = [];

function renderTalkScenarioList() {
  const container = document.getElementById('talk-scenario-list');
  container.innerHTML = Object.keys(SCENARIOS).map(key => {
    const s = SCENARIOS[key];
    return `<div class="talk-scenario-item ${key === talkScenarioKey ? 'active' : ''}" data-key="${key}">
      <h4>${s.title}</h4>
      <p>${s.description}</p>
    </div>`;
  }).join('');
  container.querySelectorAll('.talk-scenario-item').forEach(el => el.addEventListener('click', () => startTalk(el.dataset.key)));
}
renderTalkScenarioList();

function startTalk(key) {
  talkScenarioKey = key;
  renderTalkScenarioList();
  const s = SCENARIOS[key];
  talkCurrentNodeId = s.dialog.start;
  talkVisitedNodes = [];
  talkDoneEdges = [];

  document.getElementById('talk-chat-title').textContent = s.title;
  document.getElementById('chat-window').innerHTML = '';
  document.getElementById('talk-status').textContent = 'Идёт диалог...';
  document.getElementById('talk-restart').disabled = false;

  renderLiveScheme();
  playRobotNode(talkCurrentNodeId);
}

document.getElementById('talk-restart').addEventListener('click', () => {
  if (talkScenarioKey) startTalk(talkScenarioKey);
});

function addChatMsg(text, cls) {
  const win = document.getElementById('chat-window');
  const div = document.createElement('div');
  div.className = `chat-msg ${cls}`;
  div.textContent = text;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}
function addSystemMsg(text) { addChatMsg(text, 'system'); }

function playRobotNode(nodeId) {
  const s = SCENARIOS[talkScenarioKey];
  const node = s.dialog.nodes[nodeId];
  if (!node) return;

  if (!talkVisitedNodes.includes(nodeId)) talkVisitedNodes.push(nodeId);

  const avatar = document.getElementById('robot-avatar');
  avatar.classList.add('speaking');
  pulseBoost = 1;
  document.getElementById('talk-status').textContent = 'Арина говорит...';

  setTimeout(() => {
    addChatMsg(node.robot, 'robot');
    avatar.classList.remove('speaking');
    renderLiveScheme();

    if (node.final) {
      document.getElementById('talk-status').textContent = 'Диалог завершён';
      addSystemMsg('— Звонок завершён —');
      renderQuickReplies(true);
    } else {
      document.getElementById('talk-status').textContent = 'Ожидание ответа';
      renderQuickReplies(false);
    }
  }, 550);
}

function renderQuickReplies(disabledAll) {
  const container = document.getElementById('quick-replies');
  container.innerHTML = GLOBAL_ANSWERS.map(a => `<button class="quick-reply-btn" data-answer="${a}" ${disabledAll ? 'disabled' : ''}>${a}</button>`).join('');
  if (disabledAll) return;
  container.querySelectorAll('.quick-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(btn.dataset.answer));
  });
}

function handleAnswer(answer) {
  const s = SCENARIOS[talkScenarioKey];
  const node = s.dialog.nodes[talkCurrentNodeId];
  if (!node || node.final) return;

  addChatMsg(answer, 'user');
  const lower = answer.toLowerCase();

  if (lower === 'повторите') {
    setTimeout(() => addChatMsg(node.robot, 'robot'), 300);
    return;
  }
  if (GLOBAL_OBJECTIONS[lower]) {
    setTimeout(() => addChatMsg(GLOBAL_OBJECTIONS[lower], 'robot'), 300);
    return;
  }
  if (lower === 'не звоните мне больше') {
    advanceDialog(s.dialog.endings.notMe, node.schemeId);
    return;
  }
  if (lower === 'перезвоните') {
    advanceDialog(s.dialog.endings.callBack, node.schemeId);
    return;
  }
  if (node.routes && node.routes[lower]) {
    advanceDialog(node.routes[lower], node.schemeId);
    return;
  }

  setTimeout(() => {
    addSystemMsg('Этот ответ не предусмотрен в текущей ветке сценария. Попробуйте другой вариант.');
    renderQuickReplies(false);
  }, 300);
}

function advanceDialog(nextNodeId, fromSchemeId) {
  const s = SCENARIOS[talkScenarioKey];
  const nextNode = s.dialog.nodes[nextNodeId];
  if (fromSchemeId && nextNode && nextNode.schemeId) {
    talkDoneEdges.push([fromSchemeId, nextNode.schemeId]);
  }
  talkCurrentNodeId = nextNodeId;
  playRobotNode(nextNodeId);
}

function renderLiveScheme() {
  const container = document.getElementById('talk-live-scheme');
  if (!talkScenarioKey) { container.innerHTML = '<div class="canvas-placeholder">Схема появится после выбора сценария</div>'; return; }
  const s = SCENARIOS[talkScenarioKey];
  const currentNode = s.dialog.nodes[talkCurrentNodeId];
  const activeSchemeId = currentNode ? currentNode.schemeId : null;
  const visitedSchemeIds = talkVisitedNodes.map(id => s.dialog.nodes[id] && s.dialog.nodes[id].schemeId).filter(Boolean);
  container.innerHTML = buildSchemeSvg(s.scheme, { activeNodeId: activeSchemeId, visitedNodeIds: visitedSchemeIds, doneEdges: talkDoneEdges });
}

/* ========================================================================
   ФОНОВАЯ АНИМАЦИЯ "ПРОВОДА / СВЯЗИ" + КОЛЬЦА-ИМПУЛЬСЫ
   ======================================================================== */
let pulseBoost = 0;
const clickRipples = [];

(function () {
  const canvas = document.getElementById('wires-bg');
  const ctx = canvas.getContext('2d');
  let w, h, nodes, dpr;
  let mouseX = -9999, mouseY = -9999;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initNodes();
  }
  function initNodes() {
    const count = Math.max(26, Math.round((w * h) / 38000));
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16, r: 1 + Math.random() * 1.5, phase: Math.random() * Math.PI * 2 });
    }
  }
  function getColor() { const style = getComputedStyle(document.documentElement); return style.getPropertyValue('--wire-color').trim() || '53,194,224'; }

  const MAX_DIST = 170;
  let t = 0; let rafId = null;

  function step() {
    t += 0.016;
    ctx.clearRect(0, 0, w, h);
    const color = getColor();
    if (pulseBoost > 0) pulseBoost *= 0.96;

    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      const dx = n.x - mouseX, dy = n.y - mouseY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 120) { n.x += dx / dist * 0.4; n.y += dy / dist * 0.4; }
      if (n.x < -20) n.x = w + 20;
      if (n.x > w + 20) n.x = -20;
      if (n.y < -20) n.y = h + 20;
      if (n.y > h + 20) n.y = -20;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const baseAlpha = (1 - dist / MAX_DIST) * 0.2;
          const flicker = 0.5 + 0.5 * Math.sin(t * 1.3 + a.phase + b.phase);
          const alpha = Math.min(0.55, baseAlpha * (0.6 + 0.4 * flicker) + pulseBoost * 0.2);
          ctx.strokeStyle = `rgba(${color},${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      const glow = 0.35 + 0.3 * Math.sin(t * 1.5 + n.phase);
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${(glow + pulseBoost * 0.3).toFixed(3)})`; ctx.fill();
    }
    for (let i = clickRipples.length - 1; i >= 0; i--) {
      const r = clickRipples[i];
      r.radius += 3.2; r.alpha *= 0.955;
      if (r.alpha < 0.02 || r.radius > 260) { clickRipples.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${color},${r.alpha.toFixed(3)})`; ctx.lineWidth = 2; ctx.stroke();
    }
    rafId = requestAnimationFrame(step);
  }

  window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });
  window.addEventListener('click', (e) => { clickRipples.push({ x: e.clientX, y: e.clientY, radius: 4, alpha: 0.6 }); pulseBoost = 1; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(rafId); else rafId = requestAnimationFrame(step); });

  window.addEventListener('resize', resize);
  resize();
  rafId = requestAnimationFrame(step);
})();
