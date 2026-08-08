
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
   SCROLL-НАВИГАЦИЯ + АКТИВНЫЙ ПУНКТ МЕНЮ
   ======================================================================== */
document.querySelectorAll('[data-scroll]').forEach(btn => {
  btn.addEventListener('click', () => {
    const el = document.getElementById(btn.dataset.scroll);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  });
});

const navLinks = document.querySelectorAll('.nav-link');
const observedSections = ['scenarios', 'cases', 'talk'].map(id => document.getElementById(id)).filter(Boolean);

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => link.classList.toggle('active', link.dataset.target === entry.target.id));
    }
  });
}, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

observedSections.forEach(sec => navObserver.observe(sec));

/* ========================================================================
   МЕТРИКИ И "КАК ЭТО РАБОТАЕТ"
   ======================================================================== */
function renderMetrics() {
  const grid = document.getElementById('metrics-grid');
  grid.innerHTML = METRICS.map(m => `<div class="metric-card"><div class="metric-value">${m.value}</div><div class="metric-label">${m.label}</div></div>`).join('');
}
function renderHowItWorks() {
  const grid = document.getElementById('how-grid');
  grid.innerHTML = HOW_IT_WORKS.map(s => `<div class="how-card"><div class="how-num">${s.num}</div><h3>${s.title}</h3><p>${s.text}</p></div>`).join('');
}
renderMetrics();
renderHowItWorks();

/* ========================================================================
   СЦЕНАРИИ
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
  renderScheme(s.scheme, key);
}

function renderScheme(scheme, scenarioKey) {
  const canvas = document.getElementById('scenario-canvas');
  const nodeMap = {};
  scheme.nodes.forEach(n => nodeMap[n.id] = n);
  let edgesSvg = '';
  scheme.edges.forEach(([fromId, toId], i) => {
    const a = nodeMap[fromId], b = nodeMap[toId];
    if (!a || !b) return;
    const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
    const path = `M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`;
    edgesSvg += `<path class="scheme-edge" d="${path}"/>`;
    edgesSvg += `<path class="scheme-edge-flow" d="${path}" style="animation-delay:${(i * 0.15).toFixed(2)}s"/>`;
  });
  let nodesSvg = '';
  scheme.nodes.forEach(n => {
    const r = n.kind === 'start' ? 34 : 30;
    nodesSvg += `<g class="scheme-node kind-${n.kind}" data-id="${n.id}"><circle cx="${n.x}" cy="${n.y}" r="${r}"/>${wrapText(n.label, n.x, n.y)}</g>`;
  });
  canvas.innerHTML = `<svg viewBox="${scheme.viewBox}" xmlns="http://www.w3.org/2000/svg">${edgesSvg}${nodesSvg}</svg>`;
  canvas.querySelectorAll('.scheme-node').forEach(el => {
    el.addEventListener('click', () => {
      canvas.querySelectorAll('.scheme-node').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      showNodeDetail(scenarioKey, el.dataset.id);
    });
  });
}

function wrapText(label, cx, cy) {
  const words = label.split(' ');
  const lines = []; let line = '';
  words.forEach(w => {
    if ((line + ' ' + w).trim().length > 14) { lines.push(line.trim()); line = w; }
    else { line = (line + ' ' + w).trim(); }
  });
  if (line) lines.push(line);
  const startY = cy - ((lines.length - 1) * 6);
  return lines.map((l, i) => `<text x="${cx}" y="${startY + i * 12}">${l}</text>`).join('');
}

function showNodeDetail(scenarioKey, nodeId) {
  const tree = DIALOG_TREES[scenarioKey];
  const node = tree && tree.nodes[nodeId];
  const detail = document.getElementById('scheme-node-detail');
  if (!node) { detail.classList.remove('show'); return; }
  detail.innerHTML = `<b>Реплика робота:</b> "${node.robot}"`;
  detail.classList.add('show');
}

renderScenarioList();

/* ========================================================================
   КЕЙСЫ
   ======================================================================== */
let caseFilter = 'all';

function renderCases() {
  const grid = document.getElementById('cases-grid');
  const list = CASES.filter(c => caseFilter === 'all' || c.category === caseFilter);
  grid.innerHTML = list.map(c => {
    const bars = c.peaks.map((p, i) => `<div class="bar" data-idx="${i}" style="height:${Math.max(8, p * 100)}%"></div>`).join('');
    const transcript = c.transcript.map((t, i) => `<div class="transcript-line ${t.speaker}" data-idx="${i}" data-t="${t.t}"><b>${labelFor(t.speaker)}:</b> ${t.text}</div>`).join('');
    return `<div class="case-card" data-id="${c.id}">
      <div class="case-card-head">
        <div><div class="case-card-title">${c.title}</div><div class="case-card-cat">${c.categoryLabel}</div></div>
        <div class="case-duration">${c.duration}</div>
      </div>
      <div class="case-metric">${c.metric}</div>
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

/* ========================================================================
   СИМУЛЯТОР
   ======================================================================== */
let talkScenarioKey = null;
let talkCurrentNodeId = null;

function renderTalkPicker() {
  const container = document.getElementById('talk-scenario-picker');
  container.innerHTML = Object.keys(SCENARIOS).map(key => {
    const s = SCENARIOS[key];
    return `<div class="talk-scenario-card" data-key="${key}"><h4>${s.title}</h4><p>${s.description}</p></div>`;
  }).join('');
  container.querySelectorAll('.talk-scenario-card').forEach(el => el.addEventListener('click', () => startTalk(el.dataset.key)));
}
renderTalkPicker();

function startTalk(key) {
  talkScenarioKey = key;
  const tree = DIALOG_TREES[key];
  talkCurrentNodeId = tree.start;
  document.getElementById('talk-setup').style.display = 'none';
  document.getElementById('talk-layout').style.display = 'grid';
  document.getElementById('chat-window').innerHTML = '';
  document.getElementById('talk-status').textContent = 'Идёт диалог...';
  playRobotNode(talkCurrentNodeId);
}

document.getElementById('talk-restart').addEventListener('click', () => {
  document.getElementById('talk-setup').style.display = 'block';
  document.getElementById('talk-layout').style.display = 'none';
  talkScenarioKey = null;
  talkCurrentNodeId = null;
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
  const tree = DIALOG_TREES[talkScenarioKey];
  const node = tree.nodes[nodeId];
  if (!node) return;
  const avatar = document.getElementById('robot-avatar');
  avatar.classList.add('speaking');
  pulseBoost = 1;
  document.getElementById('talk-status').textContent = 'Арина говорит...';
  setTimeout(() => {
    addChatMsg(node.robot, 'robot');
    avatar.classList.remove('speaking');
    if (node.final) {
      document.getElementById('talk-status').textContent = 'Диалог завершён';
      addSystemMsg('— Звонок завершён —');
      renderQuickReplies([]);
    } else {
      document.getElementById('talk-status').textContent = 'Ожидание ответа';
      renderQuickReplies(node.quick || []);
    }
  }, 550);
}

function renderQuickReplies(quick) {
  const container = document.getElementById('quick-replies');
  container.innerHTML = quick.map(q => `<button class="quick-reply-btn" data-next="${q.next}">${q.label}</button>`).join('');
  container.querySelectorAll('.quick-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addChatMsg(btn.textContent, 'user');
      advanceDialog(btn.dataset.next);
    });
  });
}

function advanceDialog(nextNodeId) { talkCurrentNodeId = nextNodeId; playRobotNode(nextNodeId); }

function matchKeywords(userText, node) {
  const lower = userText.toLowerCase();
  for (const [nextId, words] of Object.entries(node.keywords || {})) {
    for (const w of words) {
      if (w === '.*') return nextId;
      if (lower.includes(w)) return nextId;
    }
  }
  return null;
}

function handleUserInput(text) {
  if (!talkScenarioKey || !text.trim()) return;
  const tree = DIALOG_TREES[talkScenarioKey];
  const node = tree.nodes[talkCurrentNodeId];
  if (!node || node.final) return;
  addChatMsg(text, 'user');
  const nextId = matchKeywords(text, node);
  if (nextId && tree.nodes[nextId]) advanceDialog(nextId);
  else setTimeout(() => { addSystemMsg(FALLBACK_MSG); renderQuickReplies(node.quick || []); }, 300);
}

document.getElementById('chat-send').addEventListener('click', () => {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  handleUserInput(text);
});
document.getElementById('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('chat-send').click(); });

(function initMic() {
  const micBtn = document.getElementById('mic-btn');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { micBtn.classList.add('unsupported'); return; }
  const recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.continuous = false;
  recognition.interimResults = false;
  let recording = false;
  micBtn.addEventListener('click', () => {
    if (recording) { recognition.stop(); return; }
    try { recognition.start(); recording = true; micBtn.classList.add('recording'); } catch (e) {}
  });
  recognition.addEventListener('result', (e) => {
    const text = e.results[0][0].transcript;
    document.getElementById('chat-input').value = text;
    handleUserInput(text);
    document.getElementById('chat-input').value = '';
  });
  recognition.addEventListener('end', () => { recording = false; micBtn.classList.remove('recording'); });
  recognition.addEventListener('error', () => { recording = false; micBtn.classList.remove('recording'); });
})();

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
