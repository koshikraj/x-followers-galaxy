import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const OWNER = {
  id: '91826016',
  username: 'rajkoshik',
  name: 'Koshik',
  bio: 'All things agentic crypto at @zhentanme · GPG: 02D9 4C3B BBA9 A627',
  location: 'Bangalore',
  followers: 1210,
  following: 4634,
  posts: 5073,
  verified: true,
  avatar: 'https://pbs.twimg.com/profile_images/2020892188062969856/BwB7MLyo_normal.jpg',
};

const TOPICS = [
  { id: 'crypto', label: 'Crypto & Web3', color: '#86efac', words: ['crypto', 'web3', 'blockchain', 'ethereum', 'bitcoin', 'btc', 'defi', 'solana', 'onchain', 'on-chain', 'dao', 'nft', 'wallet', 'protocol'] },
  { id: 'ai', label: 'AI & Data', color: '#67e8f9', words: [' ai ', 'artificial intelligence', 'llm', 'agentic', 'machine learning', 'data scientist', 'genai', 'models'] },
  { id: 'builders', label: 'Builders', color: '#fbbf24', words: ['founder', 'co-founder', 'building', 'builder', 'startup', 'entrepreneur', 'maker', 'venture'] },
  { id: 'engineering', label: 'Engineering', color: '#a78bfa', words: ['engineer', 'developer', 'software', 'coding', 'programmer', 'full stack', 'backend', 'frontend', 'devrel'] },
  { id: 'community', label: 'Community', color: '#fb7185', words: ['community', 'marketing', 'growth', 'content', 'creator', 'lead', 'ecosystem'] },
  { id: 'finance', label: 'Finance', color: '#f97316', words: ['investor', 'trader', 'finance', 'fintech', 'capital', 'fund', 'markets', 'investment'] },
  { id: 'other', label: 'Everything else', color: '#94a3b8', words: [] },
];

const app = document.querySelector('#app');
let followers = [];
let nodes = [];
let filteredNodes = [];
let selectedNode = null;
let hoveredNode = null;
let animationFrame = 0;
let activeMode = 'galaxy';
const bubbleCenters = new Map();
let focus3DNode = null;

const view = { x: 0, y: 0, scale: 1, targetX: 0, targetY: 0, targetScale: 1 };
const pointer = { x: 0, y: 0, downX: 0, downY: 0, dragging: false, moved: false };

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const headers = rows.shift();
  return rows.map((values) => Object.fromEntries(headers.map((key, index) => [key, values[index] ?? ''])));
}

function topicFor(profile) {
  const haystack = ` ${profile.description} ${profile.name} `.toLowerCase();
  let best = TOPICS.at(-1);
  let bestScore = 0;
  for (const topic of TOPICS.slice(0, -1)) {
    const score = topic.words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
    if (score > bestScore) { best = topic; bestScore = score; }
  }
  return best;
}

function seededRandom(seed) {
  let value = Number(String(seed).slice(-9)) || 1;
  return () => {
    value = Math.imul(1664525, value) + 1013904223 | 0;
    return (value >>> 0) / 4294967296;
  };
}

function compactNumber(number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(number);
}

function percentile(sorted, value) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (sorted[mid] < value) low = mid + 1;
    else high = mid;
  }
  return Math.round((low / sorted.length) * 100);
}

function normalizeProfiles(data) {
  const followerCounts = data.map((d) => Number(d.followers_count)).sort((a, b) => a - b);
  return data.map((d) => {
    const profile = {
      ...d,
      verified: d.verified === 'true',
      protected: d.protected === 'true',
      followers: Number(d.followers_count),
      following: Number(d.following_count),
      posts: Number(d.tweet_count),
    };
    profile.topic = topicFor(profile);
    profile.percentile = percentile(followerCounts, profile.followers);
    profile.ratio = profile.following ? profile.followers / profile.following : profile.followers;
    return profile;
  });
}

function buildNodes(data) {
  const maxFollowers = Math.max(...data.map((d) => d.followers));
  const built = data.map((profile) => {
    const rand = seededRandom(profile.id);
    const topicIndex = TOPICS.findIndex((topic) => topic.id === profile.topic.id);
    const clusterAngle = (topicIndex / TOPICS.length) * Math.PI * 2 - Math.PI / 2;
    const popularity = Math.log10(profile.followers + 10) / Math.log10(maxFollowers + 10);
    const ring = 150 + (1 - popularity) * 460 + rand() * 95;
    const spread = (rand() - 0.5) * 0.68;
    const angle = clusterAngle + spread;
    const galaxyX = Math.cos(angle) * ring;
    const galaxyY = Math.sin(angle) * ring * 0.78;
    return {
      profile,
      x: (rand() - 0.5) * 40,
      y: (rand() - 0.5) * 40,
      z: (rand() - 0.5) * 40,
      targetX: galaxyX,
      targetY: galaxyY,
      targetZ: (rand() - 0.5) * 330,
      galaxyX,
      galaxyY,
      galaxyZ: (rand() - 0.5) * 330,
      bubbleX: 0,
      bubbleY: 0,
      bubbleZ: 0,
      landscapeX: 0,
      landscapeY: 0,
      landscapeZ: 0,
      phase: rand() * Math.PI * 2,
      speed: 0.12 + rand() * 0.2,
      radius: 2.4 + popularity * 7 + (profile.verified ? 1 : 0),
      visible: true,
    };
  });
  const centerLayout = [
    [-310, -195], [0, -230], [310, -185],
    [-340, 150], [0, 125], [330, 150], [0, 370],
  ];
  TOPICS.forEach((topic, topicIndex) => {
    const center = centerLayout[topicIndex];
    bubbleCenters.set(topic.id, { x: center[0], y: center[1] });
    const group = built.filter((node) => node.profile.topic.id === topic.id).sort((a, b) => b.profile.followers - a.profile.followers);
    group.forEach((node, index) => {
      const angle = index * 2.399963;
      const distance = 13.5 * Math.sqrt(index);
      node.bubbleX = center[0] + Math.cos(angle) * distance;
      node.bubbleY = center[1] + Math.sin(angle) * distance;
      node.bubbleZ = (seededRandom(`${node.profile.id}17`)() - 0.5) * 150;
      const rankProgress = group.length > 1 ? index / (group.length - 1) : 0;
      const laneWidth = 160;
      node.landscapeX = (topicIndex - (TOPICS.length - 1) / 2) * laneWidth + (seededRandom(node.profile.id)() - 0.5) * laneWidth * 0.82;
      node.landscapeY = 285 - (1 - rankProgress) * 510;
      node.landscapeZ = (seededRandom(`${node.profile.id}31`)() - 0.5) * 190;
    });
  });
  return built;
}

function renderShell() {
  app.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <a class="brand" href="#" aria-label="Audience Galaxy home">
          <span class="brand-mark"><i></i></span>
          <span>Audience <b>Galaxy</b></span>
        </a>
        <nav class="mode-switch" aria-label="Visualization mode">
          <button class="active" data-mode="galaxy" aria-pressed="true"><span>✦</span>Galaxy</button>
          <button data-mode="bubbles" aria-pressed="false"><span>◉</span>Bubbles</button>
          <button data-mode="landscape" aria-pressed="false"><span>⌁</span>Landscape</button>
          <button data-mode="insights" aria-pressed="false"><span>▥</span>Insights</button>
        </nav>
        <div class="topbar-actions">
          <button class="x402-banner" id="promptBanner" type="button"><b>Built with x402</b><span>One prompt ↗</span></button>
          <div class="topbar-meta"><span class="live-dot"></span><span>${followers.length.toLocaleString()} profiles mapped</span></div>
        </div>
      </header>

      <section class="hero-copy">
        <p class="eyebrow">THE ORBIT OF @RAJKOSHIK</p>
        <h1>Your audience,<br><em>alive.</em></h1>
        <p class="hero-subtitle">Explore the people, builders and communities in your social gravity.</p>
      </section>

      <section class="graph-stage" id="graphStage" aria-label="Interactive follower graph">
        <canvas id="galaxyCanvas"></canvas>
        <div class="tour-cue" id="tourCue" aria-hidden="true">
          <span>Click for a tour</span>
          <i></i>
        </div>
        <div class="insights-view" id="insightsView"></div>
        <div class="graph-hint"><span>Drag to explore</span><i></i><span>Scroll to zoom</span></div>
        <div class="zoom-controls">
          <button data-zoom="in" aria-label="Zoom in">+</button>
          <button data-zoom="out" aria-label="Zoom out">−</button>
          <button data-zoom="reset" aria-label="Reset view">⌾</button>
        </div>
        <div class="journey-hud" id="journeyHud" aria-live="polite">
          <div class="journey-reticle"></div>
          <p><span>POPULARITY VOYAGE</span><strong id="journeyTarget">Launching…</strong></p>
          <small id="journeyState">Click a profile to pause · click space to continue</small>
          <button id="journeyExit" type="button">Exit journey</button>
        </div>
        <div class="tooltip" id="tooltip"></div>
      </section>

      <aside class="control-panel">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path></svg>
          <input id="searchInput" type="search" placeholder="Find a follower" autocomplete="off" />
          <kbd>/</kbd>
        </div>
        <div class="filter-row">
          <select id="topicFilter" aria-label="Filter by topic">
            <option value="all">All constellations</option>
            ${TOPICS.map((topic) => `<option value="${topic.id}">${topic.label}</option>`).join('')}
          </select>
          <button class="filter-button" id="verifiedFilter" aria-pressed="false"><span>✓</span> Verified</button>
        </div>
        <div class="legend" id="legend">
          ${TOPICS.map((topic) => `<button data-topic="${topic.id}"><i style="--topic:${topic.color}"></i>${topic.label}<span></span></button>`).join('')}
        </div>
      </aside>

      <section class="stats-strip" id="statsStrip"></section>

      <aside class="detail-drawer" id="detailDrawer" aria-live="polite">
        <button class="drawer-close" id="drawerClose" aria-label="Close profile">×</button>
        <div id="drawerContent"></div>
      </aside>
      <div class="drawer-scrim" id="drawerScrim"></div>
    </main>
  `;
}

function renderStats() {
  const verified = followers.filter((d) => d.verified).length;
  const counts = followers.map((d) => d.followers).sort((a, b) => a - b);
  const median = counts[Math.floor(counts.length / 2)];
  const reach = counts.reduce((sum, value) => sum + value, 0);
  const topics = TOPICS.map((topic) => ({ topic, count: followers.filter((d) => d.topic.id === topic.id).length })).sort((a, b) => b.count - a.count);
  document.querySelector('#statsStrip').innerHTML = `
    <article><span>Mapped audience</span><strong>${followers.length.toLocaleString()}</strong><small>of ${OWNER.followers.toLocaleString()} headline followers</small></article>
    <article><span>Verified voices</span><strong>${verified}</strong><small>${Math.round((verified / followers.length) * 100)}% of your orbit</small></article>
    <article><span>Median reach</span><strong>${compactNumber(median)}</strong><small>followers per profile</small></article>
    <article><span>Network reach</span><strong>${compactNumber(reach)}</strong><small>combined follower audiences</small></article>
    <article><span>Largest constellation</span><strong>${topics[0].topic.label}</strong><small>${topics[0].count} profiles</small></article>
  `;
  document.querySelectorAll('#legend button').forEach((button) => {
    const topic = topics.find((item) => item.topic.id === button.dataset.topic);
    button.querySelector('span').textContent = topic?.count ?? 0;
  });
}

function renderInsights(data = followers) {
  const insightView = document.querySelector('#insightsView');
  if (!insightView) return;
  const verified = data.filter((profile) => profile.verified).length;
  const protectedCount = data.filter((profile) => profile.protected).length;
  const totalReach = data.reduce((sum, profile) => sum + profile.followers, 0);
  const topProfiles = [...data].sort((a, b) => b.followers - a.followers).slice(0, 12);
  const topicCounts = TOPICS.map((topic) => ({ topic, count: data.filter((profile) => profile.topic.id === topic.id).length })).sort((a, b) => b.count - a.count);
  const maxTopic = Math.max(...topicCounts.map((item) => item.count), 1);
  const tiers = [
    { label: '10K+', count: data.filter((p) => p.followers >= 10000).length },
    { label: '1K–10K', count: data.filter((p) => p.followers >= 1000 && p.followers < 10000).length },
    { label: '100–1K', count: data.filter((p) => p.followers >= 100 && p.followers < 1000).length },
    { label: 'Under 100', count: data.filter((p) => p.followers < 100).length },
  ];
  const maxTier = Math.max(...tiers.map((tier) => tier.count), 1);
  const locationCounts = new Map();
  data.forEach((profile) => {
    const location = profile.location.trim();
    if (location) locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
  });
  const locations = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  insightView.innerHTML = `
    <div class="insights-scroll">
      <div class="insights-heading">
        <div><p class="eyebrow">AUDIENCE SIGNALS</p><h2>Inside your orbit.</h2></div>
        <p>Computed locally from ${data.length.toLocaleString()} visible profiles.</p>
      </div>
      <div class="insight-kpis">
        <article><span>Combined reach</span><strong>${compactNumber(totalReach)}</strong><small>potential second-degree audience</small></article>
        <article><span>Verified</span><strong>${verified}</strong><small>${data.length ? Math.round(verified / data.length * 100) : 0}% of visible profiles</small></article>
        <article><span>Public profiles</span><strong>${Math.max(0, data.length - protectedCount)}</strong><small>${protectedCount} protected accounts</small></article>
      </div>
      <div class="insight-grid">
        <article class="insight-card topic-card">
          <header><span>Audience DNA</span><small>Bio-inferred interests</small></header>
          <div class="topic-bars">${topicCounts.map(({ topic, count }) => `<button data-insight-topic="${topic.id}"><i style="--topic:${topic.color};--size:${count / maxTopic * 100}%"></i><span>${topic.label}</span><b>${count}</b></button>`).join('')}</div>
        </article>
        <article class="insight-card tier-card">
          <header><span>Popularity tiers</span><small>Followers per profile</small></header>
          <div class="tier-chart">${tiers.map((tier, index) => `<div style="--height:${Math.max(6, tier.count / maxTier * 100)}%;--delay:${index * 80}ms"><i></i><b>${tier.count}</b><span>${tier.label}</span></div>`).join('')}</div>
        </article>
        <article class="insight-card locations-card">
          <header><span>Audience places</span><small>Self-reported locations</small></header>
          <div class="location-list">${locations.map(([location, count], index) => `<div><b>${String(index + 1).padStart(2, '0')}</b><span>${escapeHTML(location)}</span><small>${count}</small></div>`).join('') || '<p>No location data in this filter.</p>'}</div>
        </article>
        <article class="insight-card leaders-card">
          <header><span>High-gravity profiles</span><small>Click to inspect</small></header>
          <div class="leader-list">${topProfiles.map((profile, index) => `<button data-profile-id="${profile.id}"><b>${String(index + 1).padStart(2, '0')}</b><img src="${profile.profile_image_url}" alt="" referrerpolicy="no-referrer"><span><strong>${escapeHTML(profile.name)}</strong><small>@${escapeHTML(profile.username)}</small></span><em>${compactNumber(profile.followers)}</em></button>`).join('')}</div>
        </article>
      </div>
    </div>`;
}

function profileTemplate(profile) {
  const xUrl = `https://x.com/${encodeURIComponent(profile.username)}`;
  return `
    <div class="profile-cover" style="--accent:${profile.topic.color}">
      <img src="${profile.profile_image_url}" alt="" referrerpolicy="no-referrer" />
      ${profile.verified ? '<span class="verified-badge">✓</span>' : ''}
    </div>
    <p class="drawer-kicker">${profile.topic.label} · top ${Math.max(1, 100 - profile.percentile)}%</p>
    <h2>${escapeHTML(profile.name)}</h2>
    <a class="handle" href="${xUrl}" target="_blank" rel="noreferrer">@${escapeHTML(profile.username)} ↗</a>
    <p class="bio">${escapeHTML(profile.description || 'No profile bio provided.')}</p>
    <div class="profile-facts">
      <div><span>Followers</span><strong>${profile.followers.toLocaleString()}</strong></div>
      <div><span>Following</span><strong>${profile.following.toLocaleString()}</strong></div>
      <div><span>Posts</span><strong>${profile.posts.toLocaleString()}</strong></div>
      <div><span>Ratio</span><strong>${profile.ratio.toFixed(profile.ratio >= 10 ? 0 : 1)}×</strong></div>
    </div>
    <div class="profile-meta">
      <p><span>⌖</span>${escapeHTML(profile.location || 'Location not shared')}</p>
      <p><span>◉</span>${profile.protected ? 'Protected account' : 'Public account'}</p>
      <p><span>✦</span>${profile.verified ? 'Verified profile' : 'Not verified'}</p>
      <p><span>↗</span>${profile.percentile}th audience percentile</p>
    </div>
  `;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function openDrawer(node) {
  selectedNode = node;
  document.querySelector('.app-shell').classList.add('drawer-open');
  document.querySelector('#tourCue')?.classList.add('dismissed');
  document.querySelector('#detailDrawer').classList.remove('prompt-open');
  document.querySelector('#drawerContent').innerHTML = profileTemplate(node.profile);
  document.querySelector('#detailDrawer').classList.add('open');
  document.querySelector('#drawerScrim').classList.add('open');
  focusNode(node);
}

function closeDrawer() {
  selectedNode = null;
  document.querySelector('.app-shell').classList.remove('drawer-open');
  document.querySelector('#detailDrawer').classList.remove('open');
  document.querySelector('#drawerScrim').classList.remove('open');
}

async function openPromptDrawer() {
  const drawer = document.querySelector('#detailDrawer');
  const content = document.querySelector('#drawerContent');
  document.querySelector('.app-shell').classList.add('drawer-open');
  drawer.classList.add('open', 'prompt-open');
  document.querySelector('#drawerScrim').classList.add('open');
  content.innerHTML = '<p class="prompt-loading">Loading the one-shot prompt…</p>';
  try {
    const response = await fetch('/build-prompt.txt');
    if (!response.ok) throw new Error('Prompt unavailable');
    const prompt = await response.text();
    content.innerHTML = `
      <p class="drawer-kicker">BUILT WITH x402</p>
      <h2>Give it to any agent.</h2>
      <p class="prompt-intro">One prompt fetches the followers with x402, creates the CSV, and builds this experience.</p>
      <div class="agent-row" aria-label="Compatible coding agents">
        <span aria-label="Claude" title="Claude"><img src="https://cdn.simpleicons.org/claude/D97757" alt="Claude"></span>
        <span aria-label="ChatGPT" title="ChatGPT"><img src="https://chatgpt.com/favicon.ico" alt="ChatGPT"></span>
        <span aria-label="Nous Research Hermes" title="Nous Research Hermes"><img src="https://raw.githubusercontent.com/NousResearch/hermes-agent/main/apps/desktop/assets/icon.png" alt="Nous Research Hermes"></span>
        <span aria-label="OpenClaw" title="OpenClaw"><img src="https://raw.githubusercontent.com/openclaw/openclaw/main/apps/ios/Sources/Assets.xcassets/AppIcon.appiconset/1024.png" alt="OpenClaw"></span>
        <span aria-label="Cursor" title="Cursor"><img src="https://cdn.simpleicons.org/cursor/FFFFFF" alt="Cursor"></span>
        <span aria-label="Grok" title="Grok"><img src="https://raw.githubusercontent.com/openclaw/openclaw/main/apps/ios/Sources/Assets.xcassets/ProviderIconXAI.imageset/ProviderIconXAI.svg" alt="Grok"></span>
        <span aria-label="Gemini" title="Gemini"><img src="https://cdn.simpleicons.org/googlegemini/8E75B2" alt="Gemini"></span>
        <span aria-label="GitHub Copilot" title="GitHub Copilot"><img src="https://cdn.simpleicons.org/githubcopilot/FFFFFF" alt="GitHub Copilot"></span>
      </div>
      <label class="prompt-box"><span>One-shot build prompt</span><textarea id="buildPrompt" readonly spellcheck="false">${escapeHTML(prompt.trim())}</textarea></label>
      <button class="copy-prompt" id="copyPrompt" type="button"><span>□</span> Copy prompt</button>`;
  } catch (error) {
    content.innerHTML = `<p class="fatal-prompt">${escapeHTML(error.message)}. Open README.md to copy it.</p>`;
  }
}

function focusNode(node) {
  if (focus3DNode) { focus3DNode(node); return; }
  view.targetScale = Math.max(1.45, view.targetScale);
  view.targetX = -node.x * view.targetScale;
  view.targetY = -node.y * view.targetScale;
}

function applyFilters() {
  const query = document.querySelector('#searchInput').value.trim().toLowerCase();
  const topic = document.querySelector('#topicFilter').value;
  const verifiedOnly = document.querySelector('#verifiedFilter').getAttribute('aria-pressed') === 'true';
  filteredNodes = nodes.filter((node) => {
    const p = node.profile;
    const matchesQuery = !query || p.username.toLowerCase().includes(query) || p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
    return matchesQuery && (topic === 'all' || p.topic.id === topic) && (!verifiedOnly || p.verified);
  });
  const allowed = new Set(filteredNodes);
  nodes.forEach((node) => { node.visible = allowed.has(node); });
  if (query && filteredNodes.length === 1) focusNode(filteredNodes[0]);
  document.querySelector('.topbar-meta span:last-child').textContent = `${filteredNodes.length.toLocaleString()} profiles visible`;
  renderInsights(filteredNodes.map((node) => node.profile));
}

function setMode(mode) {
  activeMode = mode;
  document.querySelector('.app-shell').dataset.mode = mode;
  document.querySelectorAll('.mode-switch button').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (mode !== 'insights') {
    nodes.forEach((node) => {
      node.targetX = mode === 'bubbles' ? node.bubbleX : mode === 'landscape' ? node.landscapeX : node.galaxyX;
      node.targetY = mode === 'bubbles' ? node.bubbleY : mode === 'landscape' ? node.landscapeY : node.galaxyY;
      node.targetZ = mode === 'bubbles' ? node.bubbleZ : mode === 'landscape' ? node.landscapeZ : node.galaxyZ;
    });
    Object.assign(view, {
      targetX: 0,
      targetY: mode === 'bubbles' ? -40 : mode === 'landscape' ? -30 : 0,
      targetScale: mode === 'bubbles' ? 0.85 : mode === 'landscape' ? 0.78 : 1,
    });
  }
}

function setupGraph() {
  const canvas = document.querySelector('#galaxyCanvas');
  const stage = document.querySelector('#graphStage');
  const tooltip = document.querySelector('#tooltip');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    stage.classList.add('webgl-failed');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setClearColor(0x030a08, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07110e, 0.00065);
  const camera = new THREE.PerspectiveCamera(48, 1, 1, 4200);
  camera.position.set(0, 40, 1120);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.minDistance = 280;
  controls.maxDistance = 2200;
  controls.rotateSpeed = 0.42;
  controls.zoomSpeed = 0.7;
  controls.panSpeed = 0.55;

  scene.add(new THREE.AmbientLight(0x9fffd0, 1.15));
  const keyLight = new THREE.PointLight(0x86efac, 24, 1800, 1.45);
  keyLight.position.set(120, 180, 500);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x67e8f9, 18, 1400, 1.6);
  rimLight.position.set(-520, -180, 160);
  scene.add(rimLight);

  const sphereGeometry = new THREE.IcosahedronGeometry(1, 1);
  const peakGeometry = new THREE.ConeGeometry(1, 2.7, 5);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94, toneMapped: false });
  const peakMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94, toneMapped: false });
  const pickMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
  const sphereMesh = new THREE.InstancedMesh(sphereGeometry, sphereMaterial, nodes.length);
  const peakMesh = new THREE.InstancedMesh(peakGeometry, peakMaterial, nodes.length);
  const pickMesh = new THREE.InstancedMesh(sphereGeometry, pickMaterial, nodes.length);
  sphereMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  peakMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pickMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // Instances animate far from their initial origin. A stable broad-phase bound
  // prevents Three.js from rejecting raycasts against a stale computed sphere.
  pickMesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2400);
  nodes.forEach((node, index) => {
    const color = new THREE.Color(node.profile.topic.color);
    sphereMesh.setColorAt(index, color);
    peakMesh.setColorAt(index, color);
  });
  sphereMesh.instanceColor.needsUpdate = true;
  peakMesh.instanceColor.needsUpdate = true;
  scene.add(sphereMesh, peakMesh, pickMesh);

  // Portraits remain separate from the instanced bodies, keeping the graph
  // fast while allowing each miniature planet to have a unique profile image.
  const portraitGroup = new THREE.Group();
  portraitGroup.renderOrder = 5;
  scene.add(portraitGroup);
  const portraitLoader = new THREE.TextureLoader();
  portraitLoader.crossOrigin = 'anonymous';
  const portraitMaskCanvas = document.createElement('canvas');
  portraitMaskCanvas.width = portraitMaskCanvas.height = 96;
  const maskContext = portraitMaskCanvas.getContext('2d');
  maskContext.fillStyle = '#fff';
  maskContext.beginPath();
  maskContext.arc(48, 48, 44, 0, Math.PI * 2);
  maskContext.fill();
  const portraitMask = new THREE.CanvasTexture(portraitMaskCanvas);
  const rankedNodes = [...nodes].sort((a, b) => b.profile.followers - a.profile.followers);
  const popularPortraits = new Set(rankedNodes.slice(0, 42));
  const mountainPortraits = new Set(rankedNodes.slice(0, 24));
  let loadedPortraits = 0;

  function ensurePortrait(node) {
    if (node.portraitSprite) return node.portraitSprite;
    const material = new THREE.SpriteMaterial({
      color: new THREE.Color(node.profile.topic.color),
      alphaMap: portraitMask,
      alphaTest: .08,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.renderOrder = 5;
    node.portraitSprite = sprite;
    portraitGroup.add(sprite);
    portraitLoader.load(node.profile.profile_image_url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
      loadedPortraits += 1;
    });
    return sprite;
  }

  const hoverHalo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: .72, toneMapped: false }),
  );
  hoverHalo.visible = false;
  hoverHalo.renderOrder = 4;
  scene.add(hoverHalo);

  const owner = new THREE.Group();
  const ownerCore = new THREE.Mesh(new THREE.IcosahedronGeometry(23, 3), new THREE.MeshStandardMaterial({ color: 0xd1fae5, emissive: 0x1e7d5c, emissiveIntensity: 1.5, roughness: 0.24 }));
  const ownerRing = new THREE.Mesh(new THREE.TorusGeometry(38, .8, 12, 96), new THREE.MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: .52 }));
  ownerRing.rotation.x = 1.18;
  const ownerTraceGroup = new THREE.Group();
  const ownerTraceMint = new THREE.Mesh(
    new THREE.TorusGeometry(42, 1.15, 8, 56, Math.PI * .68),
    new THREE.MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: .92, toneMapped: false }),
  );
  const ownerTraceCyan = new THREE.Mesh(
    new THREE.TorusGeometry(47, .72, 8, 52, Math.PI * .46),
    new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: .82, toneMapped: false }),
  );
  ownerTraceMint.rotation.x = 1.08;
  ownerTraceCyan.rotation.set(.62, .76, .15);
  ownerTraceGroup.add(ownerTraceMint, ownerTraceCyan);
  const ownerHalo = new THREE.Mesh(new THREE.SphereGeometry(47, 24, 24), new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: .035, side: THREE.BackSide }));
  const ownerPortraitMaterial = new THREE.SpriteMaterial({ alphaMap: portraitMask, alphaTest: .08, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const ownerPortrait = new THREE.Sprite(ownerPortraitMaterial);
  ownerPortrait.scale.set(43, 43, 1);
  ownerPortrait.renderOrder = 6;
  portraitLoader.load(OWNER.avatar, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    ownerPortraitMaterial.map = texture;
    ownerPortraitMaterial.needsUpdate = true;
  });
  owner.add(ownerCore, ownerRing, ownerTraceGroup, ownerHalo, ownerPortrait);
  scene.add(owner);

  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(900 * 3);
  for (let i = 0; i < starPositions.length; i += 3) {
    starPositions[i] = (Math.random() - .5) * 2600;
    starPositions[i + 1] = (Math.random() - .5) * 1600;
    starPositions[i + 2] = (Math.random() - .5) * 1600 - 250;
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x8bb7a4, size: 1.4, transparent: true, opacity: .34, sizeAttenuation: true }));
  scene.add(stars);

  const landscapeGroup = new THREE.Group();
  const ground = new THREE.GridHelper(1500, 28, 0x2a6c54, 0x123527);
  ground.position.y = 315;
  ground.rotation.x = Math.PI / 2;
  landscapeGroup.add(ground);
  [250, 110, -45, -205].forEach((y) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-650, y, -210), new THREE.Vector3(650, y, -210)]);
    const guide = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color: 0x86efac, transparent: true, opacity: .14, dashSize: 7, gapSize: 11 }));
    guide.computeLineDistances();
    landscapeGroup.add(guide);
  });
  scene.add(landscapeGroup);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(2, 2);
  const dummy = new THREE.Object3D();
  const targetCamera = new THREE.Vector3();
  const targetLook = new THREE.Vector3();
  const portraitPoint = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  const viewProjection = new THREE.Matrix4();
  const cameraFrustum = new THREE.Frustum();
  const journeyFrom = new THREE.Vector3();
  const journeyTo = new THREE.Vector3();
  const journeyLook = new THREE.Vector3();
  const journeyDirection = new THREE.Vector3();
  const journeySide = new THREE.Vector3();
  const journeyCamera = new THREE.Vector3();
  const ownerScreen = new THREE.Vector3();
  const autoTooltipScreen = new THREE.Vector3();
  const journeyRoute = rankedNodes.slice(0, 22);
  const journey = { active: false, paused: false, segment: 0, progress: 0, lastTime: 0 };
  const appShell = document.querySelector('.app-shell');
  const journeyHud = document.querySelector('#journeyHud');
  const tourCue = document.querySelector('#tourCue');
  const journeyTarget = document.querySelector('#journeyTarget');
  const journeyState = document.querySelector('#journeyState');
  let cameraAnimating = false;
  let hoveredOwner = false;
  let pointerDown = { x: 0, y: 0 };

  function nodePoint(node, target) {
    return target.set(node?.renderX ?? node?.x ?? 0, node?.renderY ?? node?.y ?? 0, node?.renderZ ?? node?.z ?? 0);
  }

  function setJourneyPaused(paused) {
    journey.paused = paused;
    journeyState.textContent = paused ? 'Journey paused · click empty space to continue' : 'Click a profile to pause · click space to continue';
    journeyHud.classList.toggle('paused', paused);
  }

  function startJourney() {
    setMode('galaxy');
    document.querySelector('#tourCue')?.classList.add('dismissed');
    journey.active = true;
    journey.segment = 0;
    journey.progress = 0;
    journey.lastTime = performance.now();
    cameraAnimating = false;
    setJourneyPaused(false);
    stage.classList.add('journey-active');
    journeyHud.classList.add('visible');
    journeyTarget.textContent = `Approaching ${journeyRoute[0].profile.name}`;
  }

  function stopJourney() {
    journey.active = false;
    stage.classList.remove('journey-active');
    journeyHud.classList.remove('visible', 'paused');
    targetCamera.set(0, 40, 1120);
    targetLook.set(0, 0, 0);
    cameraAnimating = true;
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  function updateMouse(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickNode(event) {
    updateMouse(event);
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObject(pickMesh, false).find((item) => nodes[item.instanceId]?.visible);
    return hit ? nodes[hit.instanceId] : null;
  }

  function pickOwner(event) {
    if (!owner.visible) return false;
    updateMouse(event);
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObject(ownerCore, false).length > 0;
  }

  focus3DNode = (node) => {
    const point = new THREE.Vector3(node.x, node.y, node.z);
    const direction = camera.position.clone().sub(controls.target).normalize();
    targetLook.copy(point);
    targetCamera.copy(point).add(direction.multiplyScalar(300));
    cameraAnimating = true;
  };

  canvas.addEventListener('pointerdown', (event) => { pointerDown = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointermove', (event) => {
    if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5 && event.buttons) {
      tooltip.classList.remove('visible');
      return;
    }
    hoveredNode = pickNode(event);
    hoveredOwner = !hoveredNode && pickOwner(event);
    canvas.style.cursor = hoveredNode || hoveredOwner ? 'pointer' : 'grab';
    if (hoveredNode) {
      tooltip.dataset.source = 'pointer';
      tooltip.innerHTML = `<img src="${hoveredNode.profile.profile_image_url}" alt="" referrerpolicy="no-referrer"><span class="tooltip-copy"><strong>${escapeHTML(hoveredNode.profile.name)}</strong><span>@${escapeHTML(hoveredNode.profile.username)} · ${compactNumber(hoveredNode.profile.followers)} followers</span></span>`;
      const rect = canvas.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left}px`;
      tooltip.style.top = `${event.clientY - rect.top}px`;
      tooltip.classList.add('visible');
    } else if (hoveredOwner) {
      tooltip.dataset.source = 'pointer';
      tooltip.innerHTML = `<img src="${OWNER.avatar}" alt="" referrerpolicy="no-referrer"><span class="tooltip-copy"><strong>${OWNER.name}</strong><span>@${OWNER.username} · Start popularity voyage</span></span>`;
      const rect = canvas.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left}px`;
      tooltip.style.top = `${event.clientY - rect.top}px`;
      tooltip.classList.add('visible');
    } else tooltip.classList.remove('visible');
  });
  canvas.addEventListener('pointerup', (event) => {
    if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) < 5) {
      const node = pickNode(event);
      if (node) {
        if (journey.active) setJourneyPaused(true);
        openDrawer(node);
      } else if (pickOwner(event)) {
        startJourney();
      } else if (journey.active) {
        setJourneyPaused(false);
        closeDrawer();
      }
    }
  });
  canvas.addEventListener('pointerleave', () => { hoveredNode = null; hoveredOwner = false; tooltip.classList.remove('visible'); });
  document.querySelector('#journeyExit').addEventListener('click', stopJourney);

  document.querySelector('.zoom-controls').addEventListener('click', (event) => {
    const action = event.target.dataset.zoom;
    if (!action) return;
    if (action === 'reset') {
      targetCamera.set(0, 40, 1120);
      targetLook.set(0, 0, 0);
      cameraAnimating = true;
      return;
    }
    const factor = action === 'in' ? .78 : 1.28;
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
    targetLook.copy(controls.target);
    targetCamera.copy(controls.target).add(offset);
    cameraAnimating = true;
  });

  function frame(time) {
    animationFrame = requestAnimationFrame(frame);
    let approachedNode = null;
    controls.enabled = activeMode !== 'insights';
    if (journey.active) controls.enabled = false;
    sphereMesh.visible = activeMode !== 'insights' && activeMode !== 'landscape';
    peakMesh.visible = activeMode === 'landscape';
    pickMesh.visible = activeMode !== 'insights';
    owner.visible = activeMode === 'galaxy';
    landscapeGroup.visible = activeMode === 'landscape';
    stars.visible = activeMode !== 'insights';

    if (journey.active) {
      const elapsed = Math.min(64, Math.max(0, time - journey.lastTime));
      journey.lastTime = time;
      if (!journey.paused) journey.progress += elapsed / 4300;
      if (journey.progress >= 1) {
        journey.progress = 0;
        journey.segment = (journey.segment + 1) % journeyRoute.length;
      }
      const current = journeyRoute[journey.segment];
      approachedNode = current;
      const previous = journey.segment === 0 ? null : journeyRoute[journey.segment - 1];
      if (previous) nodePoint(previous, journeyFrom); else journeyFrom.set(0, 0, 0);
      nodePoint(current, journeyTo);
      const smooth = journey.progress * journey.progress * (3 - 2 * journey.progress);
      journeyLook.lerpVectors(journeyFrom, journeyTo, smooth);
      journeyDirection.copy(journeyTo).sub(journeyFrom);
      if (journeyDirection.lengthSq() < 1) journeyDirection.set(0, 0, -1);
      journeyDirection.normalize();
      journeySide.crossVectors(journeyDirection, camera.up).normalize();
      journeyCamera.copy(journeyLook)
        .addScaledVector(journeyDirection, -145)
        .addScaledVector(journeySide, Math.sin(journey.progress * Math.PI) * 52);
      journeyCamera.y += 34 + Math.sin(time * .0014) * 8;
      camera.position.lerp(journeyCamera, .045);
      controls.target.lerp(journeyLook, .075);
      journeyTarget.textContent = `${journey.paused ? 'Paused at' : 'Approaching'} ${current.profile.name} · ${compactNumber(current.profile.followers)}`;
    } else if (cameraAnimating) {
      camera.position.lerp(targetCamera, .075);
      controls.target.lerp(targetLook, .075);
      if (camera.position.distanceTo(targetCamera) < 1.5) cameraAnimating = false;
    }
    controls.update();
    camera.updateMatrixWorld();
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    cameraFrustum.setFromProjectionMatrix(viewProjection);
    owner.updateWorldMatrix(true, false);
    owner.getWorldPosition(ownerScreen).project(camera);
    tourCue.style.left = `${(ownerScreen.x * .5 + .5) * stage.clientWidth}px`;
    tourCue.style.top = `${(-ownerScreen.y * .5 + .5) * stage.clientHeight - 92}px`;
    const closeZoom = camera.position.distanceTo(controls.target) < 690;
    appShell.classList.toggle('zoomed-in', closeZoom);
    if (!approachedNode && closeZoom && activeMode !== 'insights') {
      let nearestDistance = 145 * 145;
      nodes.forEach((node) => {
        if (!node.visible) return;
        const dx = node.x - controls.target.x;
        const dy = node.y - controls.target.y;
        const dz = node.z - controls.target.z;
        const distance = dx * dx + dy * dy + dz * dz;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          approachedNode = node;
        }
      });
    }
    const highlightedNode = hoveredNode || selectedNode || approachedNode;
    hoverHalo.visible = Boolean(highlightedNode) && activeMode !== 'insights';
    if ((!approachedNode || selectedNode) && !hoveredNode && tooltip.dataset.source === 'auto') {
      tooltip.classList.remove('visible');
      delete tooltip.dataset.source;
      delete tooltip.dataset.profileId;
    }
    owner.rotation.y += .003;
    ownerRing.rotation.z += .002;
    ownerTraceMint.rotation.z += .018;
    ownerTraceCyan.rotation.z -= .013;
    ownerTraceGroup.rotation.y = Math.sin(time * .0008) * .22;
    ownerHalo.scale.setScalar(1 + Math.sin(time * .0018) * .045);
    stars.rotation.y = time * (journey.active && !journey.paused ? .000055 : .000012);

    let autoTooltipShown = false;
    nodes.forEach((node, index) => {
      node.x += (node.targetX - node.x) * .022;
      node.y += (node.targetY - node.y) * .022;
      node.z += (node.targetZ - node.z) * .022;
      const active = node === highlightedNode || node === selectedNode;
      const hidden = !node.visible || activeMode === 'insights';
      const drift = activeMode === 'landscape' ? 0 : 2.8;
      dummy.position.set(
        node.x + Math.cos(time * .0002 * node.speed + node.phase) * drift,
        node.y + Math.sin(time * .00018 * node.speed + node.phase) * drift,
        node.z + Math.sin(time * .00013 * node.speed + node.phase) * drift,
      );
      node.renderX = dummy.position.x;
      node.renderY = dummy.position.y;
      node.renderZ = dummy.position.z;
      const base = hidden ? 0 : node.radius * (active ? 1.55 : 1);
      dummy.scale.setScalar(base);
      dummy.rotation.set(0, time * .00015 + node.phase, 0);
      dummy.updateMatrix();
      sphereMesh.setMatrixAt(index, dummy.matrix);
      dummy.scale.set(base * .72, base * (active ? 2.7 : 2.15), base * .72);
      dummy.updateMatrix();
      peakMesh.setMatrixAt(index, dummy.matrix);
      const pickSize = hidden ? 0 : Math.max(node.radius * 2.35, 11);
      dummy.scale.setScalar(pickSize);
      dummy.updateMatrix();
      pickMesh.setMatrixAt(index, dummy.matrix);
      if (node === highlightedNode) {
        hoverHalo.position.copy(dummy.position);
        hoverHalo.scale.setScalar(node.radius * 1.95);
        hoverHalo.material.color.set(node.profile.topic.color);
        hoverHalo.rotation.x = time * .00045;
        hoverHalo.rotation.y = time * .00065;
      }

      portraitPoint.set(node.renderX, node.renderY, node.renderZ);
      if (node === approachedNode && !hoveredNode && !selectedNode && !hidden) {
        autoTooltipShown = true;
        autoTooltipScreen.copy(portraitPoint).project(camera);
        if (tooltip.dataset.profileId !== node.profile.id || tooltip.dataset.source !== 'auto') {
          tooltip.innerHTML = `<img src="${node.profile.profile_image_url}" alt="" referrerpolicy="no-referrer"><span class="tooltip-copy"><strong>${escapeHTML(node.profile.name)}</strong><span>@${escapeHTML(node.profile.username)} · ${compactNumber(node.profile.followers)} followers</span></span>`;
          tooltip.dataset.profileId = node.profile.id;
          tooltip.dataset.source = 'auto';
        }
        tooltip.style.left = `${(autoTooltipScreen.x * .5 + .5) * stage.clientWidth}px`;
        tooltip.style.top = `${(-autoTooltipScreen.y * .5 + .5) * stage.clientHeight}px`;
        tooltip.classList.add('visible');
      }
      const modeLeader = activeMode === 'landscape' ? mountainPortraits.has(node) : popularPortraits.has(node);
      const zoomPortrait = closeZoom && cameraFrustum.containsPoint(portraitPoint);
      const showPortrait = !hidden && (node === highlightedNode || modeLeader || zoomPortrait);
      if (showPortrait) {
        const sprite = ensurePortrait(node);
        sprite.visible = true;
        const portraitSize = Math.max(17, node.radius * (node === highlightedNode ? 3.25 : 2.65));
        if (activeMode === 'landscape') {
          sprite.position.set(node.renderX, node.renderY + node.radius * 2.45 + portraitSize * .46, node.renderZ + 2);
        } else {
          cameraDirection.copy(camera.position).sub(portraitPoint).normalize();
          sprite.position.copy(portraitPoint).addScaledVector(cameraDirection, node.radius * 1.12 + 1.5);
        }
        sprite.scale.setScalar(portraitSize);
        sprite.material.opacity = node === highlightedNode ? 1 : .94;
      } else if (node.portraitSprite) {
        node.portraitSprite.visible = false;
      }
    });
    if (approachedNode && !hoveredNode && !autoTooltipShown && tooltip.dataset.source === 'auto') {
      tooltip.classList.remove('visible');
    }
    sphereMesh.instanceMatrix.needsUpdate = true;
    peakMesh.instanceMatrix.needsUpdate = true;
    pickMesh.instanceMatrix.needsUpdate = true;
    canvas.dataset.avatarSprites = String(portraitGroup.children.filter((sprite) => sprite.visible).length);
    canvas.dataset.avatarTextures = String(loadedPortraits);
    canvas.dataset.closeZoom = String(closeZoom);
    canvas.dataset.journeyActive = String(journey.active);
    renderer.render(scene, camera);
  }

  new ResizeObserver(resize).observe(stage);
  resize();
  animationFrame = requestAnimationFrame(frame);
  window.setTimeout(() => {
    scene.updateMatrixWorld(true);
    const sampleNode = nodes.reduce((best, node) => node.radius > best.radius ? node : best, nodes[0]);
    const samplePoint = new THREE.Vector3(sampleNode.x, sampleNode.y, sampleNode.z).project(camera);
    raycaster.setFromCamera(new THREE.Vector2(samplePoint.x, samplePoint.y), camera);
    const hits = raycaster.intersectObject(pickMesh, false).filter((hit) => nodes[hit.instanceId]?.visible);
    canvas.dataset.nodeColor = `#${sphereMesh.getColorAt(nodes.indexOf(sampleNode), new THREE.Color()).getHexString()}`;
    canvas.dataset.pickHits = String(hits.length);
    canvas.dataset.runtimeVerified = 'true';
  }, 2800);
}

function bindUI() {
  const search = document.querySelector('#searchInput');
  search.addEventListener('input', applyFilters);
  document.querySelector('#topicFilter').addEventListener('change', applyFilters);
  document.querySelector('#verifiedFilter').addEventListener('click', (event) => {
    const button = event.currentTarget;
    button.setAttribute('aria-pressed', button.getAttribute('aria-pressed') !== 'true');
    applyFilters();
  });
  document.querySelector('#legend').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    document.querySelector('#topicFilter').value = button.dataset.topic;
    applyFilters();
  });
  document.querySelector('#drawerClose').addEventListener('click', closeDrawer);
  document.querySelector('#drawerScrim').addEventListener('click', closeDrawer);
  document.querySelector('#promptBanner').addEventListener('click', openPromptDrawer);
  document.querySelector('#drawerContent').addEventListener('click', async (event) => {
    const button = event.target.closest('#copyPrompt');
    if (!button) return;
    const textarea = document.querySelector('#buildPrompt');
    try {
      await navigator.clipboard.writeText(textarea.value);
    } catch {
      textarea.select();
      document.execCommand('copy');
    }
    button.innerHTML = '<span>✓</span> Copied';
    window.setTimeout(() => { button.innerHTML = '<span>□</span> Copy prompt'; }, 1800);
  });
  document.querySelector('.mode-switch').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-mode]');
    if (button) setMode(button.dataset.mode);
  });
  document.querySelector('#insightsView').addEventListener('click', (event) => {
    const profileButton = event.target.closest('[data-profile-id]');
    if (profileButton) {
      const node = nodes.find((item) => item.profile.id === profileButton.dataset.profileId);
      if (node) openDrawer(node);
      return;
    }
    const topicButton = event.target.closest('[data-insight-topic]');
    if (topicButton) {
      document.querySelector('#topicFilter').value = topicButton.dataset.insightTopic;
      applyFilters();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== search) { event.preventDefault(); search.focus(); }
    if (event.key === 'Escape') closeDrawer();
  });
}

async function init() {
  try {
    const response = await fetch('/followers.csv');
    if (!response.ok) throw new Error(`Could not load follower data (${response.status})`);
    followers = normalizeProfiles(parseCSV(await response.text()));
    nodes = buildNodes(followers);
    filteredNodes = nodes;
    renderShell();
    renderStats();
    renderInsights();
    bindUI();
    setupGraph();
    setMode('galaxy');
  } catch (error) {
    app.innerHTML = `<div class="fatal"><p>Audience map unavailable</p><strong>${escapeHTML(error.message)}</strong></div>`;
  }
}

init();

window.addEventListener('beforeunload', () => cancelAnimationFrame(animationFrame));
