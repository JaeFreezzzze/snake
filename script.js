'use strict';
const $ = (id) => document.getElementById(id);
const canvas = $('gameCanvas'), ctx = canvas.getContext('2d');
const size = 720, cells = 24, tile = size / cells;
const presets = { chill: 165, classic: 120, hyper: 78 };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let mode = 'classic', state = 'ready', snake, direction, queue, food, score, eaten, combo, lastMeal;
let particles = [], ripples = [], shake = 0, lastTime = 0, accumulator = 0, sound = false, audio;
let playTime = 0, bonus = null, pickup = null, shield = false, slowUntil = 0;
let dashUntil = 0, dashReady = 0, mission = 0, missionMeals = 0;
const missions = [3, 5, 7, 9];
let best = 0;
try { best = Number(localStorage.getItem('neon-snake-best')) || 0; } catch {}
const stars = Array.from({ length: 45 }, () => ({ x: Math.random() * size, y: Math.random() * size, phase: Math.random() * 7 }));
const pad = (n) => String(n).padStart(3, '0');
function beep(freq, duration = .09, type = 'sine') {
  if (!sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(freq, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(freq / 2, audio.currentTime + duration);
    gain.gain.setValueAtTime(.06, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch {}
}
function createFood() {
  const free = [];
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++)
    if (!snake.some(p => p.x === x && p.y === y) && ![bonus, pickup].some(p => p && p.x === x && p.y === y)) free.push({ x, y });
  if (!free.length && snake.length < cells * cells) { bonus = null; pickup = null; return createFood(); }
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}
function notify(message) {
  $('comboToast').textContent = message;
  $('comboToast').classList.add('show');
  clearTimeout(step.toastTimer);
  step.toastTimer = setTimeout(() => $('comboToast').classList.remove('show'), 1400);
}
function award(points) {
  score += points;
  if (score > best) {
    best = score;
    try { localStorage.setItem('neon-snake-best', String(best)); } catch {}
  }
}
function spawnSpecial(type) {
  const candidates = [];
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
    if (!snake.some(p => p.x === x && p.y === y) &&
      ![food, bonus, pickup].some(p => p && p.x === x && p.y === y)) candidates.push({x, y});
  }
  const spot = candidates[Math.floor(Math.random() * candidates.length)];
  return spot ? {...spot, type, expires: playTime + (type === 'gold' ? 6500 : 10000)} : null;
}
function activateDash() {
  if (state !== 'playing' || playTime < dashReady) return;
  dashUntil = playTime + 1600;
  dashReady = playTime + 6500;
  burst((snake[0].x + .5) * tile, (snake[0].y + .5) * tile, '#4de3db');
  notify('ϟ 冲刺！得分翻倍'); beep(950, .18);
}
function updateAdventureHUD() {
  const target = missions[Math.min(mission, missions.length - 1)];
  $('missionText').textContent = `任务 ${mission + 1} · 吞噬 ${target} 个能量`;
  $('missionCount').textContent = `${missionMeals} / ${target}`;
  $('effectStatus').textContent = shield ? '◈ 护盾已就绪 · 抵挡一次碰撞' : slowUntil > playTime ? `❄ 时间减速 ${Math.ceil((slowUntil - playTime) / 1000)}s` : bonus ? `★ 黄金能量 ${Math.ceil((bonus.expires - playTime) / 1000)}s` : '每 3 次吞噬，触发限时黄金能量';
  const cooldown = Math.max(0, Math.ceil((dashReady - playTime) / 1000));
  $('dashBtn').disabled = state !== 'playing' || cooldown > 0;
  $('dashBtn').textContent = dashUntil > playTime ? 'ϟ 冲刺中 · 双倍得分' : cooldown ? `ϟ 冲刺充能 ${cooldown}s` : 'ϟ 冲刺 / SHIFT';
}
function updateHUD() {
  $('score').textContent = pad(score); $('best').textContent = pad(best);
  $('level').textContent = String(1 + Math.floor(eaten / 5)).padStart(2, '0');
  $('length').textContent = String(snake.length).padStart(2, '0'); $('combo').textContent = '×' + combo;
  $('progress').style.width = (eaten % 5) * 20 + '%'; $('progressLabel').textContent = `${eaten % 5} / 5`;
}
function updateOverlay() {
  const active = state === 'playing';
  $('overlay').classList.toggle('hidden', active);
  $('pauseBtn').disabled = state === 'ready' || state === 'over' || state === 'won';
  $('pauseBtn').textContent = state === 'paused' ? '▶ 继续' : 'Ⅱ 暂停';
  $('arenaStatus').textContent = ({ ready: 'AWAITING PLAYER', playing: 'SIGNAL ACTIVE', paused: 'SIGNAL PAUSED', over: 'SIGNAL LOST', won: 'MISSION COMPLETE' })[state];
  if (active) return;
  const content = {
    ready: ['READY WHEN YOU ARE', '进入霓虹世界', '抢黄金、开冲刺、拿护盾。完成任务，突破纪录。', '开始游戏'],
    paused: ['TAKE A BREATHER', '时间为你暂停', '下一次突破，从这里继续。', '继续游戏'],
    over: ['SIGNAL LOST / TRY AGAIN', '信号中断', `本局获得 ${score} 分 · 再来一次，超越自己。`, '再来一局'],
    won: ['MISSION COMPLETE', '你征服了霓虹', `全屏制霸！最终得分 ${score}。`, '重新挑战']
  }[state];
  ['overlayLabel', 'overlayTitle', 'overlayCopy'].forEach((id, i) => $(id).textContent = content[i]);
  $('startBtn').innerHTML = content[3] + ' <span>↗</span>';
}
function resetGame() {
  snake = [{x:10,y:12},{x:9,y:12},{x:8,y:12},{x:7,y:12}];
  direction = {x:1,y:0}; queue = []; score = 0; eaten = 0; combo = 1; lastMeal = -Infinity;
  particles = []; ripples = []; shake = 0; accumulator = 0; state = 'ready'; food = createFood();
  playTime = 0; bonus = null; pickup = null; shield = false; slowUntil = 0; dashUntil = 0; dashReady = 0; mission = 0; missionMeals = 0; updateAdventureHUD();
  $('comboToast').classList.remove('show'); updateHUD(); updateOverlay();
}
function startOrPause() {
  if (state === 'over' || state === 'won') resetGame();
  state = state === 'playing' ? 'paused' : 'playing'; accumulator = 0;
  if (state === 'playing') beep(440);
  updateOverlay();
}
function burst(x, y, color, count = 32) {
  if (reducedMotion) return;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, speed = 1 + Math.random() * 5;
    particles.push({ x, y, vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, life: 1, color, radius: 1 + Math.random()*3 });
  }
  ripples.push({x,y,r:8,life:1,color});
}
function finish(won = false) {
  state = won ? 'won' : 'over';
  burst((snake[0].x+.5)*tile,(snake[0].y+.5)*tile,won ? '#c1ff65' : '#ff6caa',70);
  shake = reducedMotion ? 0 : 12; beep(won ? 880 : 130,.35,'sawtooth'); updateOverlay();
}
function step() {
  if (state !== 'playing') return;
  if (queue.length) direction = queue.shift();
  let head = {x:snake[0].x+direction.x,y:snake[0].y+direction.y};
  const outside = head.x<0 || head.y<0 || head.x>=cells || head.y>=cells;
  if (outside && shield) {
    head = {x:(head.x+cells)%cells,y:(head.y+cells)%cells}; shield=false;
    notify('◈ 护盾破裂 · 穿墙脱险'); beep(280,.2);
  }
  const eating = food && head.x===food.x && head.y===food.y;
  const body = eating ? snake : snake.slice(0,-1);
  if (head.x<0 || head.y<0 || head.x>=cells || head.y>=cells) { finish(); return; }
  if (body.some(p=>p.x===head.x&&p.y===head.y)) {
    if (!shield) { finish(); return; }
    shield=false; snake=snake.slice(0,2); notify('◈ 护盾破裂 · 舍尾求生');
  }
  snake.unshift(head);
  if (eating) {
    const now = playTime; combo = now-lastMeal<3200 ? Math.min(combo+1,5) : 1; lastMeal=now;
    award(10*combo*(dashUntil>playTime?2:1)); eaten++; missionMeals++;
    burst((head.x+.5)*tile,(head.y+.5)*tile,'#ff8cbb',40); shake = reducedMotion ? 0 : 4;
    beep(500+combo*120,.14,'triangle');
    notify(combo > 1 ? `COMBO ×${combo} / +${10*combo*(dashUntil>playTime?2:1)}` : '+10 ENERGY');
    if (eaten % 3 === 0) bonus = spawnSpecial('gold');
    if (eaten % 4 === 0) pickup = spawnSpecial(Math.random() < .5 ? 'shield' : 'slow');
    const target = missions[Math.min(mission, missions.length - 1)];
    if (missionMeals >= target) {
      award(100 + mission * 50); mission++; missionMeals = 0; shield = true;
      notify('任务完成！奖励积分 + 护盾'); burst(360,360,'#c1ff65',80); beep(1200,.3);
    }
    food=createFood(); updateHUD(); if (!food) finish(true);
  } else snake.pop();
  if (bonus && head.x === bonus.x && head.y === bonus.y) {
    award(75*(dashUntil>playTime?2:1)); bonus=null;
    burst((head.x+.5)*tile,(head.y+.5)*tile,'#ffd56a',65);notify('★ 黄金能量！奖励 +75');beep(1500,.2);
  }
  if (pickup && head.x === pickup.x && head.y === pickup.y) {
    if(pickup.type==='shield'){shield=true;notify('◈ 护盾上线 · 放手一搏');}
    else {slowUntil=playTime+7000;notify('❄ 时间减速 · 持续 7 秒');}
    burst((head.x+.5)*tile,(head.y+.5)*tile,'#69d9ff',45);pickup=null;beep(750,.2);
  }
  updateHUD(); updateAdventureHUD();
}
function setDirection(x,y) {
  if (state !== 'playing' || queue.length>=2) return;
  const previous = queue.length ? queue[queue.length-1] : direction;
  if ((previous.x===-x&&previous.y===-y)||(previous.x===x&&previous.y===y)) return;
  queue.push({x,y});
}
function roundRect(x,y,w,h,r,color) { ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill(); }
function draw(time,dt) {
  ctx.clearRect(0,0,size,size);ctx.save();
  if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.87;if(shake<.1)shake=0;}
  const bg=ctx.createRadialGradient(360,330,20,360,360,520);bg.addColorStop(0,'#10212a');bg.addColorStop(1,'#090e18');ctx.fillStyle=bg;ctx.fillRect(0,0,size,size);
  ctx.lineWidth=1;ctx.strokeStyle='#83c0cd0c';ctx.beginPath();
  for(let i=0;i<=cells;i++){ctx.moveTo(i*tile,0);ctx.lineTo(i*tile,size);ctx.moveTo(0,i*tile);ctx.lineTo(size,i*tile);}ctx.stroke();
  for(const star of stars){ctx.fillStyle=`rgba(146,211,221,${.1+.15*(1+Math.sin(time*.0008+star.phase))})`;ctx.fillRect(star.x,star.y,2,2);}
  // Soft moving radar ring gives the arena depth without distracting from play.
  if(!reducedMotion){ctx.strokeStyle='#4de3db08';ctx.lineWidth=1;ctx.beginPath();ctx.arc(360,360,(time*.035)%560,0,Math.PI*2);ctx.stroke();}
  if(food){const x=(food.x+.5)*tile,y=(food.y+.5)*tile,pulse=reducedMotion?1:1+Math.sin(time*.005)*.13;
    const glow=ctx.createRadialGradient(x,y,1,x,y,48);glow.addColorStop(0,'#ff7bb338');glow.addColorStop(1,'#ff7bb300');ctx.fillStyle=glow;ctx.fillRect(x-48,y-48,96,96);
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.shadowColor='#ff80b5';ctx.shadowBlur=22;roundRect(-7*pulse,-7*pulse,14*pulse,14*pulse,3,'#ffa2c9');ctx.restore();
    ctx.strokeStyle='#ff8cbb45';ctx.beginPath();ctx.arc(x,y,19+Math.sin(time*.003)*3,0,Math.PI*2);ctx.stroke();}
  for (const item of [bonus,pickup]) {
    if(!item)continue;
    const x=(item.x+.5)*tile,y=(item.y+.5)*tile;
    const color=item.type==='gold'?'#ffd56a':'#69d9ff';
    ctx.save();ctx.shadowColor=color;ctx.shadowBlur=25;ctx.fillStyle=color;
    ctx.font='bold 25px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(item.type==='gold'?'★':item.type==='shield'?'◈':'❄',x,y);
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();
    ctx.arc(x,y,22,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,(item.expires-playTime)/(item.type==='gold'?6500:10000)));ctx.stroke();ctx.restore();
  }
  if (shield || dashUntil>playTime) {
    ctx.strokeStyle=shield?'#69d9ff':'#c1ff65';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=20;ctx.lineWidth=3;
    ctx.beginPath();ctx.arc((snake[0].x+.5)*tile,(snake[0].y+.5)*tile,23,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
  }
  snake.forEach((part,i)=>{const x=part.x*tile,y=part.y*tile;ctx.shadowColor='#baff61';ctx.shadowBlur=i===0?23:12;
    roundRect(x+2,y+2,tile-4,tile-4,7,i===0?'#dcff9c':`hsl(${85+i*1.8} 85% ${Math.max(32,67-i*1.1)}%)`);
    ctx.shadowBlur=0;if(i===0){const dx=direction.x,dy=direction.y;ctx.fillStyle='#263a21';for(const side of [-1,1]){ctx.beginPath();ctx.arc(x+tile/2+dx*6+(dy?side*5:0),y+tile/2+dy*6+(dx?side*5:0),2,0,Math.PI*2);ctx.fill();}}
  });ctx.shadowBlur=0;
  const factor=Math.min(dt/16.67,3);
  particles=particles.filter(p=>p.life>0);for(const p of particles){p.x+=p.vx*factor;p.y+=p.vy*factor;p.vx*=.98;p.vy*=.98;p.life-=.022*factor;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.shadowBlur=0;
  ripples=ripples.filter(r=>r.life>0);for(const r of ripples){r.r+=2.7*factor;r.life-=.025*factor;ctx.globalAlpha=Math.max(0,r.life);ctx.strokeStyle=r.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
  ctx.restore();
}
function frame(time) {
  const dt=Math.min(time-lastTime,100);lastTime=time;
  if(state==='playing'){
    playTime+=dt;
    if(bonus&&bonus.expires<=playTime)bonus=null;
    if(pickup&&pickup.expires<=playTime)pickup=null;
    if(combo>1&&playTime-lastMeal>=3200){combo=1;updateHUD();}
    updateAdventureHUD();
    accumulator+=dt;const tick=Math.max(32,(presets[mode]-Math.floor(eaten/5)*7)*(dashUntil>playTime?.55:1)*(slowUntil>playTime?1.6:1));while(accumulator>=tick&&state==='playing'){step();accumulator-=tick;}}
  draw(time,dt);requestAnimationFrame(frame);
}
const directions={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
document.addEventListener('keydown',e=>{
  if(e.target.closest('button,a,input,select,textarea')&&(e.key==='Enter'||e.key===' '))return;
  const key=e.key.toLowerCase();
  if(directions[key]){e.preventDefault();setDirection(...directions[key]);}
  if((key===' '||key==='enter')&&!e.repeat){e.preventDefault();startOrPause();}
  if(key==='shift'&&!e.repeat){e.preventDefault();activateDash();}
  if(key==='r'&&!e.repeat)resetGame();
});
$('dashBtn').onclick=()=>{activateDash();$('dashBtn').blur();};
$('startBtn').onclick=()=>{startOrPause();$('startBtn').blur();};
$('pauseBtn').onclick=()=>{startOrPause();$('pauseBtn').blur();};
$('restartBtn').onclick=()=>{resetGame();$('restartBtn').blur();};
$('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').textContent=sound?'♪ ON':'♪ OFF';$('soundBtn').setAttribute('aria-pressed',String(sound));$('soundBtn').setAttribute('aria-label',sound?'关闭音效':'开启音效');beep(660);};
document.querySelectorAll('[data-mode]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.mode===mode));button.onclick=()=>{
  mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  $('modeLabel').textContent=mode.toUpperCase()+' MODE';$('modeDescription').textContent={chill:'慢下来，享受每一道霓虹光芒。',classic:'恰到好处的速度，找回街机的心跳。',hyper:'心跳加速。留给反应的时间不多了。'}[mode];resetGame();button.blur();
};});
const touchDirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();setDirection(...touchDirs[b.dataset.dir]);}));
let touchStart;
canvas.addEventListener('pointerdown',e=>{touchStart={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<15)return;setDirection(...(Math.abs(dx)>Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)]));});
canvas.addEventListener('pointercancel',()=>touchStart=null);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing'){state='paused';updateOverlay();}});
resetGame();requestAnimationFrame(frame);
