const DRAG_SPD = 0.4, GRAB_CLINCH = 0.36;
function grab(g) {
  const P = S.player; if (actionBusy(P)) return;
  const d = Math.max(1, dist(P.x, P.y, g.x, g.y)), ux = (g.x - P.x) / d, uy = (g.y - P.y) / d;
  g.doomed = true; g.moving = false; g.path = null; P.a = Math.atan2(uy, ux); P.vx = P.vy = 0;
  const run = Math.max(0, d - 26) / 300;
  P.grabIn = { g, t: 0, run, dur: run + GRAB_CLINCH, x0: P.x, y0: P.y, x1: g.x - ux * 26, y1: g.y - uy * 26 };
  play('cloth', 0.4);
}
function updateGrabIn(P, dt) {
  const G = P.grabIn, g = G.g; G.t += dt;
  const f = G.run > 0 ? Math.min(1, G.t / G.run) : 1, e = 1 - (1 - f) * (1 - f);
  P.x = G.x0 + (G.x1 - G.x0) * e; P.y = G.y0 + (G.y1 - G.y0) * e; P.vx = P.vy = 0; P.moving = f < 1; P.mode = 'run';
  if (f >= 1 && g.state !== 'CAPTIVE') {  // 손이 닿는 순간: 붙잡힌 상태가 된다 (이때부터 버둥거림·소리)
    if (g.state === 'DEAD') { P.grabIn = null; return; }
    g.capturedLook = witnessedAssailant(g); g.doomed = false; g.state = 'CAPTIVE'; g.captT = 0; g.squirm = 1; g.seen = false; g.icon = null; g.path = null; g.a = P.a;
    if (S.fuseGuard === g) S.fuseGuard = null;
    play('cloth', 0.55); play('thud', 0.3); contactFeedback(g,'grab');
  }
  if (G.t >= G.dur) {
    P.grabIn = null; P.moving = false; collide(P, P.z ? 10 : 13, solidFor(P.z || 0));
    if (g.state !== 'CAPTIVE') return;
    P.captive = g;
    hint('grab', '붙잡은 적은 약 9초 후 빠져나간다. 먼저 짧게 눌러 기절시킨 뒤 운반해 화단·수거함에 숨긴다');
  }
}
// 숨기: 바로 사라지지 않는다. 쓰레기통 = 다가가 테를 짚고 몸을 넘겨 안으로 가라앉음 · 화단 = 웅크려 파고듦 · 맨홀 = 가장자리에서 사다리로 내려감
function enterHide(b, quick) {
  if(b.type==='okt'){enterHideNow(b,quick);return;}
  beginHideFlow('enter',b);
}
function enterHideNow(b, quick, keepFrom, witnessed=false) {
  if(b?.type==='bush')return false;
  const P = S.player;
  b.spotted = witnessed||S.guards.some(g=>g.seen&&flOf(g)===flOf(P)&&(g.z||0)===(P.z||0)&&g.state!=='DEAD'&&g.state!=='CAPTIVE');
  P.hide = b; P.hideFrom = keepFrom && P.hideFrom ? P.hideFrom : { x: P.x, y: P.y }; P.x = b.x; P.y = b.y; S.hideExitLock = true; 
  play('cloth', 0.4); play('drop', 0.15);
  const where = hideIn(b);
  toast(b.spotted ? '숨는 모습을 들켰을지도 모른다…' : `${where}에 숨었다`, 2.2, b.spotted ? 'warn' : '');
}
// dir 가 있으면 그 방향에 가장 가까운 빈 칸으로 나온다 (조이스틱 방향 탈출)
function leaveHide(dir) {
  const b=S.player.hide;if(!b)return;
  beginHideFlow('exit',b,null,dir);
}
function travelTunnel(){const P=S.player,w=P.hide;if(w&&w.type==='well'&&!P.carrying&&!P.captive)beginAccessFlow('sewerDown',w);}
// 제압: 표적·조직원·주민 모두 짧게 기절. 처음 누른 버튼을 계속 누를 때만 처치.
// 주민은 늘 기절이 기본이고, 행동 버튼을 계속 누르고 있으면 숨을 끊는다(주민 살상 — 감점)
const koDefault = g => !!g && !g.dog && !!g.civ;
// 표적도 기절이 기본이다. 계속 누르고 있으면(KO_HOLD) 처치한다.
