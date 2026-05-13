// ══════════════════════════════════════════════════════════════════════════════
// map.js — core map viewer
// ══════════════════════════════════════════════════════════════════════════════
import { TRADE_INFO, BUFF_DESC, TRADES_RAW } from './trades.js';
import { t, setLang, lang, applyStaticStrings, tradeName, buffName, buffDesc } from './locale.js';

export const STAT_KEYS = ['hammers', 'beakers', 'growth', 'happiness'];
export const CELL = 6;

export let RAW = [], grid = [], ranges = {};
export let COLS = 0, ROWS = 0, X_MIN = 0, Z_MIN = 0, STEP = 160;
export let offsetX = 0, offsetY = 0, scale = 1;

let currentStat = 'score';
let dragging = false, dragStartX, dragStartY, dragOffX, dragOffY;
let wasDragging = false;
let searchHighlight = null;
let viewMode = 'heat';

// ── Preferences ────────────────────────────────────────────────────────────────────────────────
const PREFS_KEY = 'worldmap_prefs';

function savePrefs() {
    const scoreToggles = {};
    document.querySelectorAll('.weight-row input[type=checkbox]').forEach(cb => {
        scoreToggles[cb.dataset.toggle] = cb.checked;
    });
    localStorage.setItem(PREFS_KEY, JSON.stringify({
        currentStat,
        viewMode,
        heatOpacity: document.getElementById('heat-opacity').value,
        scoreToggles,
        tradesVisible,
        scale,
        offsetX,
        offsetY,
    }));
}

function restoreSavedView() {
    let prefs;
    try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY)); } catch { return; }
    if (!prefs || prefs.scale == null) return;
    scale = prefs.scale; offsetX = prefs.offsetX; offsetY = prefs.offsetY;
}

function loadPrefs() {
    let prefs;
    try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY)); } catch { return; }
    if (!prefs) return;

    if (prefs.currentStat) {
        currentStat = prefs.currentStat;
        document.querySelectorAll('[data-stat]').forEach(b => b.classList.toggle('active', b.dataset.stat === currentStat));
        // score-toggles always visible
    }
    if (prefs.viewMode) {
        viewMode = prefs.viewMode;
        document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === viewMode));
        document.getElementById('opacity-control').style.display = viewMode === 'both' ? 'flex' : 'none';
    }
    if (prefs.heatOpacity != null) {
        const slider = document.getElementById('heat-opacity');
        slider.value = prefs.heatOpacity;
        document.getElementById('opacity-val').textContent = prefs.heatOpacity + '%';
    }
    if (prefs.scoreToggles) {
        document.querySelectorAll('.weight-row input[type=checkbox]').forEach(cb => {
            if (prefs.scoreToggles[cb.dataset.toggle] != null)
                cb.checked = prefs.scoreToggles[cb.dataset.toggle];
        });
    }
    if (prefs.tradesVisible) {
        tradesVisible = prefs.tradesVisible;
        document.getElementById('trades-toggle-btn').classList.toggle('active-trades', tradesVisible);
    }
}

export const wrap    = document.getElementById('canvas-wrap');
export const canvas  = document.getElementById('map');
export const ctx     = canvas.getContext('2d');
const tooltip        = document.getElementById('tooltip');
const overlay        = document.getElementById('overlay');
const coordDisplay   = document.getElementById('coord-display');

// ── Shared setters (planner writes back to map state) ─────────────────────────
export function setOffset(x, y) { offsetX = x; offsetY = y; }
export function setScale(s)     { scale = s; }
export function getState()      { return { RAW, grid, COLS, ROWS, X_MIN, Z_MIN, STEP, scale, offsetX, offsetY }; }

let _onDraw = null;
export function registerDrawHook(fn) { _onDraw = fn; }

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getZoneByGrid(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return grid[row * COLS + col] || null;
}

export function worldToScreen(wx, wz) {
    const cs = CELL * scale;
    const col = (wx - X_MIN) / STEP;
    const row = (wz - Z_MIN) / STEP;
    return [col * cs + offsetX, row * cs + offsetY];
}

export function gridToScreen(col, row) {
    const cs = CELL * scale;
    return [col * cs + offsetX, row * cs + offsetY];
}

export function screenToGridCoord(px, py) {
    const cs = CELL * scale;
    return [Math.floor((px - offsetX) / cs), Math.floor((py - offsetY) / cs)];
}

// ── Heat color ────────────────────────────────────────────────────────────────
function heatColor(t) {
    const steps = [
        [0.0,  [60,  0,   80]],
        [0.15, [0,   0,   180]],
        [0.30, [0,   140, 200]],
        [0.45, [0,   180, 80]],
        [0.60, [200, 200, 0]],
        [0.75, [220, 120, 0]],
        [0.90, [220, 30,  0]],
        [1.0,  [255, 255, 255]],
    ];
    let i = 0;
    while (i < steps.length - 2 && t > steps[i + 1][0]) i++;
    const [t0, c0] = steps[i], [t1, c1] = steps[i + 1];
    const f = (t - t0) / (t1 - t0);
    return c0.map((v, j) => Math.round(v + f * (c1[j] - v)));
}

// ── Legend gradient bar ───────────────────────────────────────────────────────
const gradCtx = document.getElementById('gradient-bar').getContext('2d');
const grd = gradCtx.createLinearGradient(0, 0, 120, 0);
for (let i = 0; i <= 10; i++) {
    const [r, g, b] = heatColor(i / 10);
    grd.addColorStop(i / 10, `rgb(${r},${g},${b})`);
}
gradCtx.fillStyle = grd;
gradCtx.fillRect(0, 0, 120, 14);

// ── Data ──────────────────────────────────────────────────────────────────────
export function initData(data) {
    RAW = data;
    const xs = [...new Set(data.map(z => z.x))].sort((a, b) => a - b);
    const zs = [...new Set(data.map(z => z.z))].sort((a, b) => a - b);
    COLS  = xs.length; ROWS  = zs.length;
    X_MIN = xs[0];     Z_MIN = zs[0];
    STEP  = xs.length > 1 ? xs[1] - xs[0] : 160;

    grid = new Array(COLS * ROWS).fill(null);
    for (const z of RAW) {
        const col = Math.round((z.x - X_MIN) / STEP);
        const row = Math.round((z.z - Z_MIN) / STEP);
        if (col >= 0 && col < COLS && row >= 0 && row < ROWS)
            grid[row * COLS + col] = z;
    }
    for (const s of STAT_KEYS) {
        const vals = RAW.map(z => z[s]);
        ranges[s] = { min: Math.min(...vals), max: Math.max(...vals) };
    }
    ranges['score'] = { min: 0, max: 1 };
    computeScores();
    computePercentiles();
    centerView();
    restoreSavedView();
    updateLegend();
    overlay.style.display = 'none';
    coordDisplay.textContent = t('hoverHint');
    resize();
}

function computeScores() {
    const active = STAT_KEYS.filter(s => {
        const cb = document.querySelector(`input[data-toggle="${s}"]`);
        return cb ? cb.checked : true;
    });
    const count = active.length || 1;
    for (const z of RAW) {
        z._score = active.reduce((sum, s) =>
            sum + (z[s] - ranges[s].min) / (ranges[s].max - ranges[s].min), 0) / count;
    }
}

function computePercentiles() {
    for (const s of [...STAT_KEYS, 'score']) {
        const vals = RAW.map(z => s === 'score' ? z._score : z[s]).sort((a, b) => a - b);
        ranges[s].p5  = vals[Math.floor(vals.length * 0.05)];
        ranges[s].p95 = vals[Math.floor(vals.length * 0.95)];
    }
}

function getNorm(zone) {
    if (currentStat === 'score') return zone._score;
    const r = ranges[currentStat];
    return (zone[currentStat] - r.min) / (r.max - r.min);
}

// ── Draw ──────────────────────────────────────────────────────────────────────
const worldMapImg = new Image();
worldMapImg.src = 'world_map.png';
worldMapImg.onload = () => { if (RAW.length) draw(); };

const heatOpacity = document.getElementById('heat-opacity');

export function draw() {
    if (!RAW.length) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cs = CELL * scale;
    const mapW = COLS * cs;
    const mapH = ROWS * cs;

    if ((viewMode === 'image' || viewMode === 'both') && worldMapImg.complete && worldMapImg.naturalWidth) {
        ctx.drawImage(worldMapImg, offsetX, offsetY, mapW, mapH);
    }

    if (viewMode === 'heat' || viewMode === 'both') {
        ctx.globalAlpha = viewMode === 'both' ? parseInt(heatOpacity.value) / 100 : 1;
        if (viewMode === 'both') {
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(offsetX, offsetY, mapW, mapH);
        }
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const zone = grid[row * COLS + col];
                if (!zone) continue;
                const px = col * cs + offsetX;
                const py = row * cs + offsetY;
                if (px + cs < 0 || py + cs < 0 || px > canvas.width || py > canvas.height) continue;
                const [r, g, b] = heatColor(getNorm(zone));
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(px, py, cs, cs);
            }
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (!grid[row * COLS + col]) continue;
                const px = col * cs + offsetX;
                const py = row * cs + offsetY;
                if (px + cs < 0 || py + cs < 0 || px > canvas.width || py > canvas.height) continue;
                ctx.strokeRect(px, py, cs, cs);
            }
        }
        const ox = Math.round((0 - X_MIN) / STEP) * cs + offsetX;
        const oy = Math.round((0 - Z_MIN) / STEP) * cs + offsetY;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(canvas.width, oy);  ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;

    const mapSize = 127;
    const centerX = offsetX + (mapSize / 2) * cs;
    const centerY = offsetY + (mapSize / 2) * cs;
    const radius  = (mapSize / 2 - 1) * cs;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.85)';
    ctx.lineWidth = Math.max(2, cs * 0.4);
    ctx.setLineDash([cs * 0.6, cs * 0.3]);
    ctx.stroke();
    ctx.setLineDash([]);

    _onDraw?.();
    drawSearchHighlight();
    drawTrades();
}

function drawSearchHighlight() {
    if (!searchHighlight) return;
    const cs = CELL * scale;
    const { col, row } = searchHighlight;
    const sx = col * cs + offsetX;
    const sy = row * cs + offsetY;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 220, 0, 0.95)';
    ctx.lineWidth = Math.max(2, cs * 0.12);
    ctx.setLineDash([]);
    ctx.strokeRect(sx + 1, sy + 1, cs - 2, cs - 2);
    ctx.fillStyle = 'rgba(255, 220, 0, 0.15)';
    ctx.fillRect(sx + 1, sy + 1, cs - 2, cs - 2);
    ctx.restore();
}

// ── View / Legend ─────────────────────────────────────────────────────────────
function centerView() {
    const mapW = COLS * CELL, mapH = ROWS * CELL;
    scale   = Math.min(wrap.clientWidth / mapW, wrap.clientHeight / mapH) * 0.95;
    offsetX = (wrap.clientWidth  - mapW * scale) / 2;
    offsetY = (wrap.clientHeight - mapH * scale) / 2;
}

function updateLegend() {
    if (currentStat === 'score') {
        document.getElementById('legend-min').textContent = '0%';
        document.getElementById('legend-max').textContent = '100%';
    } else {
        const r = ranges[currentStat];
        if (!r) return;
        document.getElementById('legend-min').textContent = r.min;
        document.getElementById('legend-max').textContent = r.max;
    }
}

export function resize() {
    const pfgCanvas = document.getElementById('planner-fg');
    canvas.width  = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    pfgCanvas.width  = wrap.clientWidth;
    pfgCanvas.height = wrap.clientHeight;
    draw();
}

// ── Trades ────────────────────────────────────────────────────────────────────
const COLOR_WATER = '#00cfff';
const COLOR_LAND  = '#ffb300';

const TRADES = [...new Map(TRADES_RAW.map(t => [`${t.name}|${t.x}|${t.z}`, t])).values()];
let tradesVisible = false;

function tradeColor(name) {
    const info = TRADE_INFO[name];
    return info && info.water ? COLOR_WATER : COLOR_LAND;
}

function drawTrades() {
    if (!tradesVisible || !RAW.length) return;
    const cs   = CELL * scale;
    const dotR = Math.max(2, Math.min(cs * 0.25, 7));
    const showLabels = cs > 8;

    ctx.save();
    ctx.font = `bold ${Math.max(8, Math.min(11, cs * 0.55))}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    for (const t of TRADES) {
        const [sx, sy] = worldToScreen(t.x, t.z);
        if (sx < -dotR || sy < -dotR || sx > canvas.width + dotR || sy > canvas.height + dotR) continue;

        const color = tradeColor(t.name);

        ctx.beginPath();
        ctx.arc(sx, sy, dotR + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (showLabels) {
            const labelY = sy - dotR - 2;
            const tw = ctx.measureText(t.name).width;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(sx - tw / 2 - 2, labelY - 10, tw + 4, 11);
            ctx.fillStyle = color;
            ctx.fillText(t.name, sx, labelY);
        }
    }
    ctx.restore();
}

// ── Input events ──────────────────────────────────────────────────────────────
wrap.addEventListener('mousedown', e => {
    const pfgCanvas = document.getElementById('planner-fg');
    if (e.target === pfgCanvas) return;
    dragging = true;
    wasDragging = false;
    dragStartX = e.clientX; dragStartY = e.clientY;
    dragOffX = offsetX;     dragOffY = offsetY;
    wrap.classList.add('grabbing');
});
window.addEventListener('mouseup', () => { dragging = false; wrap.classList.remove('grabbing'); savePrefs(); });
window.addEventListener('mousemove', e => {
    if (!dragging) return;
    if (Math.abs(e.clientX - dragStartX) > 3 || Math.abs(e.clientY - dragStartY) > 3) wasDragging = true;
    offsetX = dragOffX + e.clientX - dragStartX;
    offsetY = dragOffY + e.clientY - dragStartY;
    draw();
});
export function getWasDragging() { return wasDragging; }

wrap.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const newScale = Math.max(0.3, Math.min(20, scale * (e.deltaY < 0 ? 1.12 : 0.89)));
    const realFactor = newScale / scale;
    offsetX = mx - (mx - offsetX) * realFactor;
    offsetY = my - (my - offsetY) * realFactor;
    scale = newScale;

    if (dragging) {
        dragStartX = e.clientX; dragStartY = e.clientY;
        dragOffX = offsetX;     dragOffY = offsetY;
    }

    const base = COLS && ROWS ? Math.min(wrap.clientWidth / (COLS * CELL), wrap.clientHeight / (ROWS * CELL)) * 0.95 : 1;
    document.getElementById('zoom-display').textContent = `${Math.round(scale / base * 100)}%`;
    draw();
    savePrefs();
}, { passive: false });

wrap.addEventListener('mousemove', e => {
    if (dragging || !RAW.length) return;
    const rect = wrap.getBoundingClientRect();
    const cs   = CELL * scale;
    const col  = Math.floor((e.clientX - rect.left - offsetX) / cs);
    const row  = Math.floor((e.clientY - rect.top  - offsetY) / cs);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) {
        tooltip.style.display = 'none';
        coordDisplay.textContent = t('hoverHint');
        return;
    }
    const zone = grid[row * COLS + col];
    if (!zone) { tooltip.style.display = 'none'; return; }

    const score  = (zone._score * 100).toFixed(1);
    const statVal = currentStat === 'score' ? score + '%' : zone[currentStat];
    coordDisplay.textContent = `(${zone.x}, ${zone.z})  ·  id ${zone.id}  ·  ${currentStat} ${statVal}`;

    const hl = s => currentStat === s ? 'highlight' : '';
    tooltip.innerHTML =
        `<div class="tip-title">${t('zoneLabel')} ${zone.id}</div>` +
        `<div class="tip-biome">${zone.biomes}</div>` +
        `<div class="tip-row"><span class="tip-label">${t('coordinates')}</span><span class="tip-val">(${zone.x}, ${zone.z})</span></div>` +
        `<div class="tip-row"><span class="tip-label">${t('score')}</span><span class="tip-val highlight">${score}%</span></div>` +
        `<div class="tip-row"><span class="tip-label">${t('hammers')}</span><span class="tip-val ${hl('hammers')}">${zone.hammers}</span></div>` +
        `<div class="tip-row"><span class="tip-label">${t('beakers')}</span><span class="tip-val ${hl('beakers')}">${zone.beakers}</span></div>` +
        `<div class="tip-row"><span class="tip-label">${t('growth')}</span><span class="tip-val ${hl('growth')}">${zone.growth}</span></div>` +
        `<div class="tip-row"><span class="tip-label">${t('happiness')}</span><span class="tip-val ${hl('happiness')}">${zone.happiness}</span></div>`;

    tooltip.style.display = 'block';
    let tx = e.clientX + 16, ty = e.clientY - 10;
    if (tx + 220 > window.innerWidth)  tx = e.clientX - 230;
    if (ty + 200 > window.innerHeight) ty = window.innerHeight - 210;
    tooltip.style.left = tx + 'px';
    tooltip.style.top  = ty + 'px';
});
wrap.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

// Trades tooltip (capture phase, higher priority)
wrap.addEventListener('mousemove', e => {
    if (!tradesVisible || !RAW.length) return;
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cs = CELL * scale;
    const hitR = Math.max(6, Math.min(cs * 0.5, 14));

    let nearest = null, nearestD2 = hitR * hitR;
    for (const t of TRADES) {
        const [sx, sy] = worldToScreen(t.x, t.z);
        const d2 = (mx - sx) ** 2 + (my - sy) ** 2;
        if (d2 < nearestD2) { nearestD2 = d2; nearest = t; }
    }

    if (nearest) {
        const info = TRADE_INFO[nearest.name] || {};
        const color = tradeColor(nearest.name);
        const terrain = info.water ? t('fishingBoat') : t('tradeOutpost');
        const buffNames = info.buffs ? info.buffs.split(' | ') : [];
        const buffsHtml = buffNames.map(b => {
            const desc = buffDesc(b) || BUFF_DESC[b] || b;
            return `<div class="tip-row" style="margin-top:3px"><span class="tip-label" style="color:#7ec8ff;min-width:0;flex-shrink:0">${buffName(b)}</span></div>` +
                `<div style="font-size:10px;color:#ccc;padding-left:4px;margin-bottom:2px">${desc}</div>`;
        }).join('');
        tooltip.innerHTML =
            `<div class="tip-title" style="color:${color}">${tradeName(nearest.name)}</div>` +
            `<div class="tip-biome">${terrain}</div>` +
            `<div class="tip-row"><span class="tip-label">${t('coinsPerHour')}</span><span class="tip-val highlight">${info.coins ?? '?'}</span></div>` +
            `<div style="margin-top:5px;border-top:1px solid #1a2a40;padding-top:5px">${buffsHtml}</div>` +
            `<div class="tip-row" style="margin-top:4px;border-top:1px solid #1a2a40;padding-top:4px"><span class="tip-label">${t('coords')}</span><span class="tip-val">(${nearest.x}, ${nearest.z})</span></div>` +
            (() => {
                const col = Math.floor((nearest.x - X_MIN) / STEP);
                const row = Math.floor((nearest.z - Z_MIN) / STEP);
                const zone = getZoneByGrid(col, row);
                return zone ? `<div class="tip-row"><span class="tip-label">${t('zoneId')}</span><span class="tip-val highlight">${zone.id}</span></div>` : '';
            })();
        tooltip.style.display = 'block';
        let tx = e.clientX + 16, ty = e.clientY - 10;
        if (tx + 280 > window.innerWidth)  tx = e.clientX - 290;
        if (ty + 220 > window.innerHeight) ty = window.innerHeight - 230;
        tooltip.style.left = tx + 'px';
        tooltip.style.top  = ty + 'px';
        e.stopImmediatePropagation();
    }
}, true);

document.querySelectorAll('[data-stat]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-stat]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStat = btn.dataset.stat;
        // score-toggles always visible
        updateLegend();
        draw();
        savePrefs();
    });
});

document.querySelectorAll('.weight-row input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
        const any = [...document.querySelectorAll('.weight-row input')].some(c => c.checked);
        if (!any) { cb.checked = true; return; }
        computeScores();
        draw();
        savePrefs();
    });
});

document.getElementById('reset-btn').addEventListener('click', () => {
    centerView();
    document.getElementById('zoom-display').textContent = '100%';
    draw();
});

document.getElementById('upload-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
});
document.getElementById('file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    overlay.textContent = t('loadingFile', file.name);
    overlay.style.display = 'flex';
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            let text = ev.target.result;
            const end = text.lastIndexOf(']');
            if (end !== -1) text = text.slice(0, end + 1);
            initData(JSON.parse(text));
        } catch (err) {
            overlay.textContent = t('loadError', err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

// ── View Mode ─────────────────────────────────────────────────────────────────
const opacityVal  = document.getElementById('opacity-val');
const opacityCtrl = document.getElementById('opacity-control');

function applyViewMode() {
    opacityCtrl.style.display = viewMode === 'both' ? 'flex' : 'none';
    if (RAW.length) draw();
}

document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
        viewMode = btn.dataset.view;
        document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyViewMode();
        savePrefs();
    });
});

heatOpacity.addEventListener('input', () => {
    opacityVal.textContent = heatOpacity.value + '%';
    if (RAW.length) draw();
    savePrefs();
});

// ── Coord search ──────────────────────────────────────────────────────────────
function searchAndJump() {
    if (!RAW.length) return;
    const wx = parseInt(document.getElementById('search-x').value);
    const wz = parseInt(document.getElementById('search-z').value);
    if (isNaN(wx) || isNaN(wz)) return;

    const col = Math.round((wx - X_MIN) / STEP);
    const row = Math.round((wz - Z_MIN) / STEP);
    const zone = getZoneByGrid(col, row);

    if (!zone && (col < 0 || col >= COLS || row < 0 || row >= ROWS)) {
        coordDisplay.textContent = t('notFound', wx, wz);
        searchHighlight = null;
        draw();
        return;
    }

    searchHighlight = { col, row };
    const cs = CELL * scale;
    offsetX = wrap.clientWidth  / 2 - (col + 0.5) * cs;
    offsetY = wrap.clientHeight / 2 - (row + 0.5) * cs;
    draw();
    if (zone) coordDisplay.textContent = `(${zone.x}, ${zone.z})  ·  id ${zone.id}`;
}

document.getElementById('search-btn').addEventListener('click', searchAndJump);
document.getElementById('search-x').addEventListener('keydown', e => { if (e.key === 'Enter') searchAndJump(); });
document.getElementById('search-z').addEventListener('keydown', e => { if (e.key === 'Enter') searchAndJump(); });

document.getElementById('trades-toggle-btn').addEventListener('click', () => {
    tradesVisible = !tradesVisible;
    document.getElementById('trades-toggle-btn').classList.toggle('active-trades', tradesVisible);
    draw();
    savePrefs();
});

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('resize', resize);
canvas.width  = wrap.clientWidth;
canvas.height = wrap.clientHeight;
document.getElementById('planner-fg').width  = wrap.clientWidth;
document.getElementById('planner-fg').height = wrap.clientHeight;

loadPrefs();
applyStaticStrings();

document.getElementById('lang-btn').addEventListener('click', () => {
    const next = lang === 'en' ? 'ru' : 'en';
    setLang(next);
    document.getElementById('lang-btn').textContent = next.toUpperCase();
    applyStaticStrings();
    if (RAW.length) draw();
});
document.getElementById('lang-btn').textContent = lang.toUpperCase();


fetch('data.json')
    .then(r => { if (!r.ok) throw new Error('data.json not found'); return r.json(); })
    .then(data => initData(data))
    .catch(() => {
        overlay.textContent = t('noData');
    });