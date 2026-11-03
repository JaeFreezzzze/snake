'use strict';
// Expedition rules are separate from rendering, input and permanent progression.
const sectors = [
  {name:'唤醒花园', goal:4, color:'#77f2ac'},
  {name:'流光管线', goal:5, color:'#4de3db'},
  {name:'黄金回廊', goal:6, color:'#ffd56a'},
  {name:'风暴前沿', goal:7, color:'#a59aff'},
  {name:'核心裂隙', goal:8, color:'#ff8cbb'},
  {name:'终焉脉冲', goal:0, color:'#ff627e'}
];
const routes = [
  {id:'shelter',name:'补给航道',icon:'◈',desc:'获得护盾；标准速度、标准晶核。',speed:1,reward:0},
  {id:'treasure',name:'寻宝航道',icon:'★',desc:'黄金基础分 +50；速度 +10%；完成本阶段额外 3 晶核。',speed:.9,reward:3},
  {id:'elite',name:'风暴航道',icon:'ϟ',desc:'速度 +18%，脉冲预警缩短至 1.8 秒；完成本阶段额外 6 晶核。',speed:.82,reward:6}
];
let sector = 0, sectorMeals = 0, sectorTime = 0, completedSectors = 0;
let route = routes[0], routeCores = 0, choosingRoute = false, transitioning = false;
let pulse = null, pulseClock = 0, nextPulse = 7000;
const finaleDuration = 25000;
function resetExpedition() {
  sector=0;sectorMeals=0;sectorTime=0;completedSectors=0;route=routes[0];routeCores=0;
  choosingRoute=false;transitioning=false;pulse=null;pulseClock=0;nextPulse=7000;
}
function routeWarning() { return route.id==='elite'?1800:2600; }
function openRoutes() {
  choosingRoute=true;state='route';accumulator=0;
  $('rogueLabel').textContent=`SECTOR ${sector+1} / 6`;
  $('rogueTitle').textContent='选择下一条航道';
  $('rogueDescription').textContent=`即将进入「${sectors[sector].name}」。风险与奖励提前公开；路线效果仅在下一阶段生效。按 1 / 2 / 3 选择。`;
  $('closeRogue').hidden=true;$('rogueCards').replaceChildren();
  routes.forEach((r,i)=>{
    const button=document.createElement('button');button.className='relic-card';
    const title=document.createElement('strong');title.textContent=`${i+1} · ${r.icon} ${r.name}`;
    const desc=document.createElement('span');desc.textContent=r.desc;
    const detail=document.createElement('small');detail.textContent=r.reward?`完成奖励 +${r.reward} 晶核`:'稳健推进 · 立即获得护盾';
    button.append(title,desc,detail);button.onclick=()=>chooseRoute(i);$('rogueCards').append(button);
  });
  if(!$('rogueDialog').open)$('rogueDialog').showModal();
  updateAdventureHUD();
}
function chooseRoute(i) {
  if(state!=='route'||!routes[i])return;
  route=routes[i];choosingRoute=false;transitioning=false;
  if(route.id==='shelter')shield=true;
  $('rogueDialog').close();state='playing';accumulator=0;
  notify(`第 ${sector+1} 阶段 · ${sectors[sector].name}`);updateOverlay();updateAdventureHUD();
}
function completeSector() {
  if(state!=='playing')return;
  completedSectors++;routeCores+=route.reward;
  award(100+sector*30);
  if(sector===sectors.length-1){finish(true);return;}
  sector++;sectorMeals=0;sectorTime=0;pulse=null;pulseClock=0;nextPulse=7000;
  transitioning=true;queue=[];
  // Each stage offers one draft, followed by an explicit risk/reward route.
  openDraft();
  if(state!=='draft')openRoutes();
}
function advanceExpedition(dt) {
  if(state!=='playing')return;
  sectorTime+=dt;pulseClock+=dt;
  if(sector===5&&sectorTime>=finaleDuration){completeSector();return;}
  if(pulse && pulseClock>=pulse.ends){pulse=null;}
  if(sector>=1&&!pulse&&pulseClock>=nextPulse){
    // Only one row or column is ever dangerous; choose away from the head
    // and every collectible, with a clear warning before it activates.
    const axis=Math.random()<.5?'x':'y';
    const options=[];
    for(let n=2;n<cells-2;n++){
      if(Math.abs(n-snake[0][axis])<=3)continue;
      if([food,bonus,pickup].some(p=>p&&p[axis]===n))continue;
      options.push(n);
    }
    if(options.length){
      const warning=routeWarning(), duration=sector===5?1200:900;
      pulse={axis,index:options[Math.floor(Math.random()*options.length)],starts:pulseClock+warning,ends:pulseClock+warning+duration};
      nextPulse=pulse.ends+(sector===5?1600:3500);
      beep(220,.1);
    }else nextPulse=pulseClock+1000;
  }
}
function pulseHits(head) {
  return !!pulse && pulseClock>=pulse.starts && pulseClock<pulse.ends && head[pulse.axis]===pulse.index;
}
function drawExpedition() {
  if(!pulse)return;
  const active=pulseClock>=pulse.starts;
  const x=pulse.axis==='x'?pulse.index*tile:0;
  const y=pulse.axis==='y'?pulse.index*tile:0;
  const w=pulse.axis==='x'?tile:size,h=pulse.axis==='y'?tile:size;
  ctx.save();ctx.fillStyle=active?'#ff527d66':'#ffc86b22';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=active?'#ff527d':'#ffc86b';ctx.lineWidth=2;ctx.setLineDash(active?[]:[8,8]);ctx.strokeRect(x+1,y+1,w-2,h-2);
  ctx.font='bold 12px monospace';ctx.fillStyle=active?'#fff':'#ffd56a';ctx.textAlign='center';
  const label=active?'危险 / PULSE':`预警 ${Math.max(0,(pulse.starts-pulseClock)/1000).toFixed(1)}s`;
  ctx.fillText(label,pulse.axis==='x'?x+tile/2:360,pulse.axis==='x'?22:y+20);ctx.restore();
}
function updateExpeditionHUD() {
  const data=sectors[sector];
  if(state==='playing')$('arenaStatus').textContent=`${sector+1}/6 · `+(sector===5?`生存 ${Math.max(0,Math.ceil((finaleDuration-sectorTime)/1000))}s`:`能量 ${sectorMeals}/${data.goal}`);
  $('sectorName').textContent=`${String(sector+1).padStart(2,'0')} / 06 · ${data.name}`;
  $('sectorRoute').textContent=`${route.name} · 已完成 ${completedSectors} 阶段`;
  $('sectorGoal').textContent=sector===5?`最终生存 ${Math.min(25,Math.floor(sectorTime/1000))} / 25 秒`:`吞噬能量 ${sectorMeals} / ${data.goal}`;
  $('sectorProgress').style.width=(sector===5?Math.min(1,sectorTime/finaleDuration):sectorMeals/data.goal)*100+'%';
  $('pulseStatus').textContent=pulse?(pulseClock<pulse.starts?'⚠ 黄线预警：离开标记行列':'⚠ 红线生效：触碰将受伤'):sector===0?'第一阶段无脉冲，规划你的构筑。':'单行 / 单列脉冲 · 提前预警 · 不追踪玩家';
}
