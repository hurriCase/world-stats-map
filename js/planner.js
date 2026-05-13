// ══════════════════════════════════════════════════════════════════════════════
// planner.js — Civ Planner
// ══════════════════════════════════════════════════════════════════════════════
import {
    CELL, RAW,
    canvas, ctx, wrap,
    gridToScreen, screenToGridCoord, getZoneByGrid,
    getWasDragging, getState, draw, resize, registerDrawHook,
} from './map.js';

const SPREAD_BY_LEVEL = [
    [],
    [[0,0]],
    [[-1,0]],
    [[0,-1]],
    [[1,0]],
    [[0,1]],
    [[-2,0], [-1,-1]],
    [[0,-2], [-1,1]],
    [[1,1], [2,0], [1,-1]],
    [[0,2], [-3,0], [-2,-1]],
    [[-1,-2], [0,-3], [-2,1]],
    [[1,-2], [2,-1], [3,0], [-1,2]],
    [[0,3], [1,2], [2,1], [-4,0]],
    [[-3,-1], [-2,-2], [-1,-3], [0,-4]],
    [[1,-3], [2,-2], [-3,1], [-2,2], [-1,3]],
    [[3,-1], [4,0], [3,1], [2,2], [1,3]],
];

const TOWN_COLORS = ['#4ea8de','#4edfa8','#ffb347','#ff7070','#c77dff','#ff6eb4','#a8d8a8','#ffd700'];

let colorIdx = 0;
let towns = [], nextId = 1;
let plannerMode = 'capital';
let plannerActive = false;

const pfgCanvas = document.getElementById('planner-fg');
const pfgCtx    = pfgCanvas.getContext('2d');

// ── Helpers ───────────────────────────────────────────────────────────────────
function getOffsets(level) {
    const result = [], seen = new Set();
    for (let l = 1; l <= Math.min(level, SPREAD_BY_LEVEL.length - 1); l++) {
        for (const off of SPREAD_BY_LEVEL[l]) {
            const key = off[0] + ',' + off[1];
            if (!seen.has(key)) { seen.add(key); result.push(off); }
        }
    }
    return result;
}

export function setMode(m) {
    plannerMode = m;
    document.getElementById('btn-capital').className = 'p-mode-btn' + (m === 'capital' ? ' active-capital' : '');
    document.getElementById('btn-town').className    = 'p-mode-btn' + (m === 'town'    ? ' active-town'    : '');
    document.getElementById('btn-remove').className  = 'p-mode-btn' + (m === 'remove'  ? ' active-remove'  : '');
}

function hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${a})`;
}

function drawStar(ctx2, cx, cy, spikes, outerR, innerR) {
    let rot = (Math.PI / 2) * 3, step = Math.PI / spikes;
    ctx2.beginPath();
    ctx2.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
        ctx2.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR); rot += step;
        ctx2.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR); rot += step;
    }
    ctx2.closePath();
}

export function computeClaimed() {
    const claimed = new Map(), claimedDist = new Map();
    for (let ti = 0; ti < towns.length; ti++) {
        const t = towns[ti];
        for (const [dc, dr] of getOffsets(t.level)) {
            const key = (t.col + dc) + ',' + (t.row + dr);
            const d2 = dc * dc + dr * dr;
            if (!claimed.has(key) || d2 < claimedDist.get(key)) {
                claimed.set(key, ti);
                claimedDist.set(key, d2);
            }
        }
    }
    return claimed;
}

// ── Draw (called from map.js draw()) ─────────────────────────────────────────
export function drawPlanner() {
    pfgCtx.clearRect(0, 0, pfgCanvas.width, pfgCanvas.height);
    if (!plannerActive || !towns.length) return;

    const { scale } = getState();
    const cs = CELL * scale;
    const claimed = computeClaimed();

    // Fill pass
    for (const [key, ti] of claimed.entries()) {
        const [col, row] = key.split(',').map(Number);
        const [sx, sy] = gridToScreen(col, row);
        if (sx + cs < 0 || sy + cs < 0 || sx > pfgCanvas.width || sy > pfgCanvas.height) continue;
        pfgCtx.fillStyle = hexAlpha(towns[ti].color, 0.35);
        pfgCtx.fillRect(sx, sy, cs, cs);
    }

    // Border pass
    const borderW = Math.max(1.5, cs * 0.08);
    for (const [key, ti] of claimed.entries()) {
        const [col, row] = key.split(',').map(Number);
        const [sx, sy] = gridToScreen(col, row);
        if (sx + cs < 0 || sy + cs < 0 || sx > pfgCanvas.width || sy > pfgCanvas.height) continue;
        const color = towns[ti].color;
        pfgCtx.strokeStyle = hexAlpha(color, 0.9);
        pfgCtx.lineWidth = borderW;
        pfgCtx.lineCap = 'square';
        const neighbors = [[0,-1,'top'],[1,0,'right'],[0,1,'bottom'],[-1,0,'left']];
        for (const [dc, dr, side] of neighbors) {
            const nKey = (col + dc) + ',' + (row + dr);
            if (claimed.get(nKey) === ti) continue;
            pfgCtx.beginPath();
            const half = borderW / 2;
            if (side === 'top')    { pfgCtx.moveTo(sx, sy + half);      pfgCtx.lineTo(sx + cs, sy + half); }
            if (side === 'right')  { pfgCtx.moveTo(sx + cs - half, sy); pfgCtx.lineTo(sx + cs - half, sy + cs); }
            if (side === 'bottom') { pfgCtx.moveTo(sx, sy + cs - half); pfgCtx.lineTo(sx + cs, sy + cs - half); }
            if (side === 'left')   { pfgCtx.moveTo(sx + half, sy);      pfgCtx.lineTo(sx + half, sy + cs); }
            pfgCtx.stroke();
        }
    }

    for (let ti = 0; ti < towns.length; ti++) {
        const t = towns[ti];
        const [sx, sy] = gridToScreen(t.col, t.row);
        const cx = sx + cs / 2, cy = sy + cs / 2;
        const r = Math.max(4, cs * 0.38);
        pfgCtx.save();
        pfgCtx.translate(cx, cy);
        if (t.isCapital) {
            drawStar(pfgCtx, 0, 0, 4, r * 1.3, r * 0.52);
        } else {
            pfgCtx.beginPath();
            pfgCtx.arc(0, 0, r, 0, Math.PI * 2);
        }
        pfgCtx.fillStyle = t.color;
        pfgCtx.fill();
        pfgCtx.strokeStyle = '#fff';
        pfgCtx.lineWidth = 1.2;
        pfgCtx.stroke();
        pfgCtx.restore();
    }

    updatePlannerStats(claimed);
    updateTownList(claimed);
}

function townZoneStats(ti, claimed) {
    let h = 0, b = 0, g = 0, hap = 0, n = 0;
    for (const [key, idx] of claimed.entries()) {
        if (idx !== ti) continue;
        const [col, row] = key.split(',').map(Number);
        const z = getZoneByGrid(col, row);
        if (z) { h += z.hammers; b += z.beakers; g += z.growth; hap += z.happiness; }
        n++;
    }
    return { hammers: h, beakers: b, growth: g, happiness: hap, zones: n };
}

function updatePlannerStats(claimed) {
    let h = 0, b = 0, g = 0, hap = 0;
    for (let ti = 0; ti < towns.length; ti++) {
        const s = townZoneStats(ti, claimed);
        h += s.hammers; b += s.beakers; g += s.growth; hap += s.happiness;
    }
    const hasData = RAW.length > 0;
    document.getElementById('s-hammers').textContent   = hasData && towns.length ? h.toFixed(1)   : '—';
    document.getElementById('s-beakers').textContent   = hasData && towns.length ? b.toFixed(1)   : '—';
    document.getElementById('s-growth').textContent    = hasData && towns.length ? g.toFixed(1)   : '—';
    document.getElementById('s-happiness').textContent = hasData && towns.length ? hap.toFixed(2) : '—';
}

function updateTownList(claimed) {
    const list = document.getElementById('town-list');
    if (!towns.length) {
        list.innerHTML = '<div class="p-empty">Place a capital first,<br>then add towns.</div>';
        return;
    }
    list.innerHTML = '';
    for (let ti = 0; ti < towns.length; ti++) {
        const t = towns[ti];
        const s = townZoneStats(ti, claimed);
        const hasData = RAW.length > 0;
        const el = document.createElement('div');
        el.className = 'town-item';
        el.innerHTML = `
      <div class="town-dot" style="background:${t.color}"></div>
      <div style="flex:1;min-width:0">
        <div class="town-name">${t.isCapital ? '★ Capital' : 'Town'} — Lv ${t.level}</div>
        <div class="town-sub">${s.zones} zones${hasData && s.zones ? ` · H:${s.hammers.toFixed(0)} B:${s.beakers.toFixed(0)} G:${s.growth.toFixed(0)} Hap:${s.happiness.toFixed(1)}` : ''}</div>
      </div>
      <span class="town-remove">✕</span>`;
        el.querySelector('.town-remove').onclick = () => { towns.splice(ti, 1); draw(); };
        list.appendChild(el);
    }
}

// ── Input events ──────────────────────────────────────────────────────────────
wrap.addEventListener('click', e => {
    if (!plannerActive || getWasDragging()) return;
    const rect = wrap.getBoundingClientRect();
    const [col, row] = screenToGridCoord(e.clientX - rect.left, e.clientY - rect.top);
    const level = parseInt(document.getElementById('cult-select').value);

    if (plannerMode === 'remove') {
        let best = -1, bestD = Infinity;
        for (let ti = 0; ti < towns.length; ti++) {
            const t = towns[ti], d = (t.col - col) ** 2 + (t.row - row) ** 2;
            if (d < bestD) { bestD = d; best = ti; }
        }
        if (best >= 0 && bestD <= 9) { towns.splice(best, 1); draw(); }
        return;
    }

    if (plannerMode === 'capital') {
        const ci = towns.findIndex(t => t.isCapital);
        if (ci >= 0) { towns[ci].col = col; towns[ci].row = row; towns[ci].level = level; draw(); return; }
        towns.push({ id: nextId++, col, row, level, isCapital: true, color: TOWN_COLORS[colorIdx++ % TOWN_COLORS.length] });
        setMode('town');
    } else {
        towns.push({ id: nextId++, col, row, level, isCapital: false, color: TOWN_COLORS[colorIdx++ % TOWN_COLORS.length] });
    }
    draw();
});

// ── Export / Import ───────────────────────────────────────────────────────────
document.getElementById('export-btn').addEventListener('click', () => {
    if (!towns.length) return;
    const claimed = computeClaimed();
    const lines = [];
    for (let ti = 0; ti < towns.length; ti++) {
        const t = towns[ti];
        const s = townZoneStats(ti, claimed);
        const zone = getZoneByGrid(t.col, t.row);
        lines.push(`${t.isCapital ? '★ Capital' : 'Town'} (Level ${t.level})`);
        if (zone) lines.push(`  Zone ID: ${zone.id}  Coords: (${zone.x}, ${zone.z})`);
        lines.push(`  Zones claimed: ${s.zones}`);
        if (RAW.length && s.zones) {
            lines.push(`  Hammers:   ${s.hammers.toFixed(1)}`);
            lines.push(`  Beakers:   ${s.beakers.toFixed(1)}`);
            lines.push(`  Growth:    ${s.growth.toFixed(1)}`);
            lines.push(`  Happiness: ${s.happiness.toFixed(2)}`);
        }
        lines.push('');
    }
    let h = 0, b = 0, g = 0, hap = 0;
    const claimed2 = computeClaimed();
    for (let ti = 0; ti < towns.length; ti++) {
        const s = townZoneStats(ti, claimed2);
        h += s.hammers; b += s.beakers; g += s.growth; hap += s.happiness;
    }
    if (RAW.length) {
        lines.push('── Total ──');
        lines.push(`  Hammers:   ${h.toFixed(1)}`);
        lines.push(`  Beakers:   ${b.toFixed(1)}`);
        lines.push(`  Growth:    ${g.toFixed(1)}`);
        lines.push(`  Happiness: ${hap.toFixed(2)}`);
    }
    navigator.clipboard.writeText(lines.join('\n'))
        .then(() => {
            const btn = document.getElementById('export-btn');
            btn.textContent = '✓ Copied!';
            btn.style.color = '#4edfa8';
            setTimeout(() => { btn.innerHTML = '&#128196; Export'; btn.style.color = '#6a8aaa'; }, 2000);
        });
});

document.getElementById('import-btn').addEventListener('click', async () => {
    let text;
    try { text = await navigator.clipboard.readText(); }
    catch { text = prompt('Paste exported layout:'); }
    if (!text) return;

    const result = [];
    let current = null;
    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line.startsWith('★ Capital') || line.startsWith('Town')) {
            if (current) result.push(current);
            const levelMatch = line.match(/Level (\d+)/);
            current = { isCapital: line.startsWith('★'), level: levelMatch ? parseInt(levelMatch[1]) : 1, col: null, row: null };
        } else if (current && line.startsWith('Zone ID:')) {
            const coordMatch = line.match(/Coords:\s*\((-?\d+),\s*(-?\d+)\)/);
            if (coordMatch) {
                const { X_MIN, Z_MIN, STEP } = getState();
                current.col = Math.floor((parseInt(coordMatch[1]) - X_MIN) / STEP);
                current.row = Math.floor((parseInt(coordMatch[2]) - Z_MIN) / STEP);
            }
        }
    }
    if (current) result.push(current);

    const valid = result.filter(t => t.col !== null);
    if (!valid.length) { alert('Nothing to import'); return; }

    towns = [];
    colorIdx = 0;
    nextId = 1;
    for (const t of valid) {
        towns.push({ id: nextId++, col: t.col, row: t.row, level: t.level, isCapital: t.isCapital, color: TOWN_COLORS[colorIdx++ % TOWN_COLORS.length] });
    }
    draw();

    const btn = document.getElementById('import-btn');
    btn.textContent = `✓ Imported ${valid.length} town(s)`;
    btn.style.color = '#4edfa8';
    setTimeout(() => { btn.innerHTML = '&#128228; Import'; btn.style.color = '#6a8aaa'; }, 2000);
});

// ── Panel toggle ──────────────────────────────────────────────────────────────
export function initPlanner() {
    setMode('capital');
    registerDrawHook(drawPlanner);

    if (localStorage.getItem('worldmap_planner_open') === 'true') {
        plannerActive = true;
        document.getElementById('planner-panel').classList.add('open');
        document.getElementById('planner-toggle-btn').classList.add('active');
    }

    document.getElementById('planner-toggle-btn').addEventListener('click', () => {
        plannerActive = !plannerActive;
        document.getElementById('planner-panel').classList.toggle('open', plannerActive);
        document.getElementById('planner-toggle-btn').classList.toggle('active', plannerActive);
        resize();
        localStorage.setItem('worldmap_planner_open', plannerActive);
    });
}

// Expose setMode globally for inline onclick handlers in HTML
window.setMode = setMode;