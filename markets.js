const API = 'https://xxx-drogo-market-data.candyfordegens.workers.dev';
const FCD = 'https://phoenix-fcd.terra.dev/v1/txs';
const POOLS = {
  'XXX/LUNA': 'https://app.astroport.fi/trade?poolAddress=terra1eq67ztwkr66zwpg0vw7k5e6rt0ty9a5ftd5ttcfvd0t0r62sj5tswscxwg',
  'DROGO/LUNA': 'https://app.astroport.fi/trade?poolAddress=terra1syndrvvxshz3getn4r732ywqruf985v20rgl8qe3qy8cdeyt6fqsqlsxja'
};
const POOL_ADDRESSES = {
  'XXX/LUNA': 'terra1eq67ztwkr66zwpg0vw7k5e6rt0ty9a5ftd5ttcfvd0t0r62sj5tswscxwg',
  'DROGO/LUNA': 'terra1syndrvvxshz3getn4r732ywqruf985v20rgl8qe3qy8cdeyt6fqsqlsxja'
};
let pair = 'XXX/LUNA', timeframe = 'H1', samples = [], zoom = 120, shift = 0, hover = -1, dragX = null;
const canvas = document.querySelector('#candle-chart');
const ctx = canvas.getContext('2d');

function formatPrice(value) { return Number(value).toLocaleString('en-US', { maximumSignificantDigits: 7 }) + ' LUNA'; }
function bucket(time) { const d = new Date(time * 1000), h = timeframe === 'H4' ? Math.floor(d.getUTCHours()/4)*4 : d.getUTCHours(); return timeframe === 'W1' ? Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-d.getUTCDay()) : timeframe === 'D1' ? Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()) : Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),h); }
function candles(data) {
  const groups = new Map();
  data.forEach((x) => { const key = bucket(x.sampled_at); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(x); });
  let prior = null;
  return [...groups].map(([time, values]) => {
    const prices = values.map(x => Number(x.price_luna)); const open = prices[0], close = prices.at(-1);
    const high = Math.max(...prices), low = Math.min(...prices);
    const candle = { time, open, close, high, low, flat: values.length < 2 || high === low };
    prior = close; return candle;
  }).slice(Math.max(0, groups.size - shift - zoom), Math.max(0, groups.size - shift));
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
  if(hover >= 0 && points[hover]) { const p=points[hover], xx=x(hover), change=(p.close/p.open-1)*100; ctx.strokeStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.moveTo(xx,pad.top);ctx.lineTo(xx,rect.height-pad.bottom);ctx.stroke(); const text='O '+p.open.toExponential(3)+'  H '+p.high.toExponential(3)+'  L '+p.low.toExponential(3)+'  C '+p.close.toExponential(3)+'  '+(change>=0?'+':'')+change.toFixed(2)+'%'; ctx.font='11px DM Mono, monospace';const tw=ctx.measureText(text).width+16;const bx=Math.min(rect.width-tw-6,Math.max(6,xx-tw/2));ctx.fillStyle='#21182f';ctx.fillRect(bx,8,tw,24);ctx.fillStyle=change>=0?'#f3c85d':'#9a79ff';ctx.fillText(text,bx+8,24); }
}
function eventAttributes(event) { return Object.fromEntries((event.attributes || []).map(({ key, value }) => [key, value])); }
async function swapHistory(whichPair) {
  const address = POOL_ADDRESSES[whichPair], history = []; let offset = '';
  for (let page = 0; page < 6; page++) {
    const url = new URL(FCD); url.searchParams.set('account', address); url.searchParams.set('limit', '100'); if (offset) url.searchParams.set('offset', offset);
    const response = await fetch(url); if (!response.ok) break;
    const data = await response.json();
    for (const tx of data.txs || []) {
      if (Number(tx.code) !== 0) continue;
      for (const log of tx.logs || []) for (const event of log.events || []) {
        const a = event.type === 'wasm' ? eventAttributes(event) : {};
        if (a._contract_address !== address || a.action !== 'swap') continue;
        const offer = Number(a.offer_amount), returned = Number(a.return_amount);
        const price = a.offer_asset === 'uluna' ? offer / returned : a.ask_asset === 'uluna' ? returned / offer : 0;
        const sampled_at = Math.floor(Date.parse(tx.timestamp) / 1000);
        if (Number.isFinite(price) && price > 0 && Number.isFinite(sampled_at)) history.push({ sampled_at, price_luna: price });
      }
    }
    offset = data.next; if (!offset) break;
  }
  return history;
}
async function load() {
  document.querySelector('#chart-status').textContent='Loading pool data and verified swaps…';
  try {
    const [live, history] = await Promise.all([
      fetch(`${API}/samples?pair=${encodeURIComponent(pair)}&days=730`).then(r => r.json()),
      swapHistory(pair).catch(() => [])
    ]);
    samples = [...history, ...(live.samples || [])].sort((a, b) => a.sampled_at - b.sampled_at);
    const latest = (live.samples || []).at(-1) || samples.at(-1);
    document.querySelector('#price-value').textContent=latest?formatPrice(latest.price_luna):'—';
    document.querySelector('#chart-status').textContent=latest?'Pool price and verified swaps':'Waiting for first pool sample';
    document.querySelector('#updated-at').textContent=latest?'Last sample '+new Date(latest.sampled_at*1000).toLocaleString():'No samples yet'; draw();
  } catch { document.querySelector('#chart-status').textContent='Pool data is temporarily unavailable'; samples=[]; draw(); }
}
document.querySelectorAll('.pair-tab').forEach(button=>button.addEventListener('click',()=>{pair=button.dataset.pair;document.querySelectorAll('.pair-tab').forEach(x=>{x.classList.toggle('is-active',x===button);x.setAttribute('aria-selected',x===button)});document.querySelector('#pair-label').textContent=pair.replace('/',' / ');document.querySelector('#trade-link').href=POOLS[pair];load();}));
document.querySelectorAll('.time-tab').forEach(button=>button.addEventListener('click',()=>{timeframe=button.dataset.timeframe; shift=0;document.querySelectorAll('.time-tab').forEach(x=>x.classList.toggle('is-active',x===button));draw();}));
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect(), n=candles(samples).length; hover=Math.max(0,Math.min(n-1,Math.floor((e.clientX-r.left-12)/(r.width-80)*n))); if(dragX!==null){shift=Math.max(0,Math.min(Math.max(0,samples.length-zoom),shift+Math.round((dragX-e.clientX)/6)));dragX=e.clientX;} draw();});
canvas.addEventListener('mouseleave',()=>{hover=-1;dragX=null;draw();}); canvas.addEventListener('mousedown',e=>{dragX=e.clientX;}); canvas.addEventListener('mouseup',()=>{dragX=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(20,Math.min(360,zoom+(e.deltaY>0?20:-20)));shift=Math.min(shift,Math.max(0,samples.length-zoom));draw();},{passive:false});
window.addEventListener('resize',draw); load(); setInterval(load,300000);
