const MARKET_API = 'https://xxx-drogo-market-data.candyfordegens.workers.dev/candles';
const POOLS = {
  'XXX/LUNA': { address: 'terra1eq67ztwkr66zwpg0vw7k5e6rt0ty9a5ftd5ttcfvd0t0r62sj5tswscxwg', url: 'https://app.astroport.fi/trade?poolAddress=terra1eq67ztwkr66zwpg0vw7k5e6rt0ty9a5ftd5ttcfvd0t0r62sj5tswscxwg' },
  'DROGO/LUNA': { address: 'terra1syndrvvxshz3getn4r732ywqruf985v20rgl8qe3qy8cdeyt6fqsqlsxja', url: 'https://app.astroport.fi/trade?poolAddress=terra1syndrvvxshz3getn4r732ywqruf985v20rgl8qe3qy8cdeyt6fqsqlsxja' }
};
const INTERVAL = { H1: '60', H4: '240', D1: '1D', W1: '1W' };
const STEP = { H1: 3600000, H4: 14400000, D1: 86400000, W1: 604800000 };
let pair = 'XXX/LUNA', timeframe = 'H1', candles = [], zoom = 120, shift = 0, hover = -1, dragX = null;
const canvas = document.querySelector('#candle-chart');
const ctx = canvas.getContext('2d');

function formatPrice(value) { return Number(value).toLocaleString('en-US', { maximumSignificantDigits: 7 }) + ' LUNA'; }
function formatDate(time) { return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric', ...(timeframe === 'H1' || timeframe === 'H4' ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}) }).format(new Date(time)) + ' UTC'; }
function formatAxisDate(time) { return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short' }).format(new Date(time)); }
function candleStart(time) { const d = new Date(time); if (timeframe === 'W1') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - d.getUTCDay()); if (timeframe === 'D1') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); if (timeframe === 'H4') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(d.getUTCHours() / 4) * 4); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()); }
function visible() { return candles.slice(Math.max(0, candles.length - shift - zoom), Math.max(0, candles.length - shift)); }
function changeFromPrevious(points, index) { const point = points[index]; if (!point || point.gap) return 0; for (let i = index - 1; i >= 0; i--) if (!points[i].gap) return (point.close / points[i].close - 1) * 100; return 0; }
function setReadout(points, index) { const node = document.querySelector('#ohlc-readout'), point = points?.[index]; if (!point) { node.textContent = 'Hover a candle: O — · H — · L — · C — · Δ —'; return; } const change = changeFromPrevious(points, index); node.textContent = `${formatDate(point.time)} · O ${point.open.toExponential(3)} · H ${point.high.toExponential(3)} · L ${point.low.toExponential(3)} · C ${point.close.toExponential(3)} · Δ ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`; }
function draw() {
  const points = visible(), rect = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio; canvas.height = rect.height * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);
  const empty = document.querySelector('#chart-empty'); if (empty) empty.hidden = points.length > 0; if (!points.length) return;
  const values = points.flatMap(p => [p.high, p.low]), min = Math.min(...values), max = Math.max(...values), spread = Math.max(max - min, Math.abs(max) * .03, 1e-18);
  const pad = { top: 25, right: 72, bottom: 32, left: 12 }, w = rect.width - pad.left - pad.right, h = rect.height - pad.top - pad.bottom;
  const x = i => pad.left + (i + .5) * w / points.length, y = value => pad.top + (max + spread * .1 - value) / (spread * 1.2) * h;
  ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'left';
  for (let i = 0; i < 4; i++) { const value = min + spread * i / 3, yy = y(value); ctx.strokeStyle = 'rgba(231,222,255,.12)'; ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(rect.width - pad.right, yy); ctx.stroke(); ctx.fillStyle = '#93899f'; ctx.fillText(value.toExponential(3), rect.width - pad.right + 8, yy + 3); }
  for (let i = 0; i < points.length; i++) { const p = points[i], xx = x(i), up = p.close >= p.open, color = up ? '#f3c85d' : '#9a79ff', width = Math.max(1, Math.min(15, w / points.length * .62)); if (p.flat) { ctx.strokeStyle = '#847a90'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx - width / 2, y(p.close)); ctx.lineTo(xx + width / 2, y(p.close)); ctx.stroke(); continue; } ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, y(p.high)); ctx.lineTo(xx, y(p.low)); ctx.stroke(); ctx.fillStyle = color; ctx.fillRect(xx - width / 2, Math.min(y(p.open), y(p.close)), width, Math.max(1, Math.abs(y(p.close) - y(p.open)))); }
  ctx.textAlign = 'center'; ctx.fillStyle = '#93899f'; const labels = Math.min(6, points.length); for (let i = 0; i < labels; i++) { const index = Math.round(i * (points.length - 1) / Math.max(1, labels - 1)); ctx.fillText(formatAxisDate(points[index].time), x(index), rect.height - 10); }
  if (hover >= 0 && points[hover]) { const xx = x(hover), label = formatDate(points[hover].time), labelWidth = ctx.measureText(label).width + 12, left = Math.max(6, Math.min(rect.width - labelWidth - 6, xx - labelWidth / 2)); ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.beginPath(); ctx.moveTo(xx, pad.top); ctx.lineTo(xx, rect.height - pad.bottom); ctx.stroke(); ctx.fillStyle = '#21182f'; ctx.fillRect(left, rect.height - 25, labelWidth, 19); ctx.fillStyle = '#e7deff'; ctx.fillText(label, left + labelWidth / 2, rect.height - 11); }
}
function fillGaps(rows) {
  if (!rows.length) return []; const result = [], step = STEP[timeframe]; let last = null, at = candleStart(rows[0].time);
  for (const row of rows) { const target = candleStart(row.time); while (last && at < target) { result.push({ time: at, open: last.close, high: last.close, low: last.close, close: last.close, flat: true, gap: true }); at += step; } result.push({ ...row, time: target, flat: row.open === row.close && row.high === row.low, gap: false }); last = row; at = target + step; }
  return result;
}
function aggregate(rows) {
  const grouped = new Map();
  for (const row of rows) { const key = candleStart(row.time); const current = grouped.get(key); if (current) { current.high = Math.max(current.high, row.high); current.low = Math.min(current.low, row.low); current.close = row.close; current.volume += row.volume; } else grouped.set(key, { ...row, time: key }); }
  return [...grouped.values()];
}
async function load() {
  document.querySelector('#chart-status').textContent = 'Loading Astroport candle history…';
  try {
    const to = Math.floor(Date.now() / 1000), from = to - 90 * 86400;
    const url = new URL(MARKET_API); url.searchParams.set('pair', pair); url.searchParams.set('from', from); url.searchParams.set('to', to);
    const response = await fetch(url); if (!response.ok) throw new Error('Astroport unavailable'); const payload = await response.json();
    const rows = (payload?.candles || []).map(p => ({ time: Number(p.time), open: Number(p.open), high: Number(p.high), low: Number(p.low), close: Number(p.close), volume: Number(p.volume || 0) })).filter(p => p.time && p.close > 0).sort((a, b) => a.time - b.time);
    candles = fillGaps(aggregate(rows)); shift = 0; hover = -1; const latest = rows.at(-1);
    document.querySelector('#price-value').textContent = latest ? formatPrice(latest.close) : '—'; document.querySelector('#chart-status').textContent = latest ? 'Astroport candles · 90-day view · no-trade hours shown as lines' : 'No Astroport trades in this period'; document.querySelector('#updated-at').textContent = latest ? `Last trade ${formatDate(latest.time)}` : '—'; setReadout(null); draw();
  } catch { candles = []; document.querySelector('#chart-status').textContent = 'Astroport candle data is temporarily unavailable'; setReadout(null); draw(); }
}
document.querySelectorAll('.pair-tab').forEach(button => button.addEventListener('click', () => { pair = button.dataset.pair; document.querySelectorAll('.pair-tab').forEach(x => { x.classList.toggle('is-active', x === button); x.setAttribute('aria-selected', x === button); }); document.querySelector('#pair-label').textContent = pair.replace('/', ' / '); document.querySelector('#trade-link').href = POOLS[pair].url; load(); }));
document.querySelectorAll('.time-tab').forEach(button => button.addEventListener('click', () => { timeframe = button.dataset.timeframe; document.querySelectorAll('.time-tab').forEach(x => x.classList.toggle('is-active', x === button)); load(); }));
canvas.addEventListener('mousemove', event => { const rect = canvas.getBoundingClientRect(), points = visible(), width = rect.width - 84; hover = Math.max(0, Math.min(points.length - 1, Math.floor((event.clientX - rect.left - 12) / width * points.length))); if (dragX !== null) { shift = Math.max(0, Math.min(Math.max(0, candles.length - zoom), shift + Math.round((dragX - event.clientX) / 6))); dragX = event.clientX; } setReadout(points, hover); draw(); });
canvas.addEventListener('mouseleave', () => { hover = -1; dragX = null; setReadout(null); draw(); }); canvas.addEventListener('mousedown', event => { dragX = event.clientX; }); canvas.addEventListener('mouseup', () => { dragX = null; });
function changeZoom(delta) { zoom = Math.max(20, Math.min(360, zoom + delta)); shift = Math.min(shift, Math.max(0, candles.length - zoom)); draw(); }
canvas.addEventListener('wheel', event => { event.preventDefault(); changeZoom(event.deltaY > 0 ? 20 : -20); }, { passive: false }); document.querySelector('#zoom-in').addEventListener('click', () => changeZoom(-20)); document.querySelector('#zoom-out').addEventListener('click', () => changeZoom(20));
window.addEventListener('resize', draw); load(); setInterval(load, 300000);
