const API = 'https://xxx-drogo-market-data.candyfordegens.workers.dev';
const POOLS = {
  'XXX/LUNA': 'https://app.astroport.fi/trade?poolAddress=terra1eq67ztwkr66zwpg0vw7k5e6rt0ty9a5ftd5ttcfvd0t0r62sj5tswscxwg',
  'DROGO/LUNA': 'https://app.astroport.fi/trade?poolAddress=terra1syndrvvxshz3getn4r732ywqruf985v20rgl8qe3qy8cdeyt6fqsqlsxja'
};
let pair = 'XXX/LUNA', timeframe = 'H1', samples = [];
const canvas = document.querySelector('#candle-chart');
const ctx = canvas.getContext('2d');

function formatPrice(value) { return Number(value).toLocaleString('en-US', { maximumSignificantDigits: 7 }) + ' LUNA'; }
function bucket(time) { const d = new Date(time * 1000); return timeframe === 'H1' ? Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),d.getUTCHours()) : Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()); }
function candles(data) {
  const groups = new Map();
  data.forEach((x) => { const key = bucket(x.sampled_at); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(x); });
  let prior = null;
  return [...groups].map(([time, values]) => {
    const prices = values.map(x => Number(x.price_luna)); const open = prices[0], close = prices.at(-1);
    const high = Math.max(...prices), low = Math.min(...prices);
    const candle = { time, open, close, high, low, flat: values.length < 2 || high === low };
    prior = close; return candle;
  }).slice(-120);
}
function draw() {
  const points = candles(samples); const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio; canvas.height = rect.height * ratio; ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,rect.width,rect.height);
  document.querySelector('#chart-empty').hidden = points.length > 0;
  if (!points.length) return;
  const values = points.flatMap(p=>[p.high,p.low]); const min = Math.min(...values), max = Math.max(...values), spread = Math.max(max-min, Math.abs(max)*.03, 1e-12);
  const pad = { top:24, right:68, bottom:28, left:12 }, w = rect.width-pad.left-pad.right, h = rect.height-pad.top-pad.bottom;
  const y = v => pad.top + (max + spread*.1-v)/(spread*1.2)*h; const x = i => pad.left + (i+.5)*w/points.length;
  ctx.font = '10px DM Mono, monospace'; ctx.textAlign='left';
  for(let i=0;i<4;i++){ const value=min+spread*i/3, yy=y(value); ctx.strokeStyle='rgba(231,222,255,.12)';ctx.beginPath();ctx.moveTo(pad.left,yy);ctx.lineTo(rect.width-pad.right,yy);ctx.stroke();ctx.fillStyle='#93899f';ctx.fillText(value.toExponential(3),rect.width-pad.right+8,yy+3); }
  points.forEach((p,i)=>{ const xx=x(i), up=p.close>=p.open, color=up?'#f3c85d':'#9a79ff', width=Math.max(2,Math.min(15,w/points.length*.62));
    if(p.flat){ctx.strokeStyle='#847a90';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx-width/2,y(p.close));ctx.lineTo(xx+width/2,y(p.close));ctx.stroke();return;}
    ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,y(p.high));ctx.lineTo(xx,y(p.low));ctx.stroke();ctx.fillStyle=color;ctx.fillRect(xx-width/2,Math.min(y(p.open),y(p.close)),width,Math.max(1,Math.abs(y(p.close)-y(p.open))));
  });
}
async function load() {
  document.querySelector('#chart-status').textContent='Loading pool data…';
  try { const response = await fetch(`${API}/samples?pair=${encodeURIComponent(pair)}&days=365`); const data = await response.json(); samples=data.samples || []; const last=samples.at(-1); document.querySelector('#price-value').textContent=last?formatPrice(last.price_luna):'—'; document.querySelector('#chart-status').textContent=last?'Estimated pool price':'Waiting for first pool sample'; document.querySelector('#updated-at').textContent=last?'Last sample '+new Date(last.sampled_at*1000).toLocaleString():'No samples yet'; draw(); } catch { document.querySelector('#chart-status').textContent='Pool data is temporarily unavailable'; samples=[]; draw(); }
}
document.querySelectorAll('.pair-tab').forEach(button=>button.addEventListener('click',()=>{pair=button.dataset.pair;document.querySelectorAll('.pair-tab').forEach(x=>{x.classList.toggle('is-active',x===button);x.setAttribute('aria-selected',x===button)});document.querySelector('#pair-label').textContent=pair.replace('/',' / ');document.querySelector('#trade-link').href=POOLS[pair];load();}));
document.querySelectorAll('.time-tab').forEach(button=>button.addEventListener('click',()=>{timeframe=button.dataset.timeframe;document.querySelectorAll('.time-tab').forEach(x=>x.classList.toggle('is-active',x===button));draw();}));
window.addEventListener('resize',draw); load(); setInterval(load,300000);
