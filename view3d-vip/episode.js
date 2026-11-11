// The contract uses the native briefing/pause/retry flow, with a short opening card.
export function prepareEpisode(){
 if(!window.__EPISODE_ONE__)return;
 document.body.classList.add('episode-one');
 const css=document.createElement('style');css.textContent=`
 .episode-one #brief{background:linear-gradient(90deg,rgba(13,23,25,.97),rgba(13,23,25,.84) 48%,rgba(13,23,25,.28));color:#e5dfcf;padding:clamp(22px,6vw,80px);align-items:center}
 .episode-one #brief .br-wrap{display:block;width:min(510px,100%);max-width:none;margin:0}
 .episode-one #brief .br-info{display:block}.episode-one #brief .br-mapcol,.episode-one #brief .br-details,.episode-one #brief #btnBrBack{display:none}
 .episode-one #brief .fx-sub{color:#b3ad9b;letter-spacing:.16em}
 .episode-one #brief .br-name{font:500 clamp(36px,6vw,64px) 'IBM Plex Sans KR',sans-serif;color:#eee8da;letter-spacing:-.06em;margin:22px 0}
 .episode-one #brief .episode-intro{font:400 15px/1.9 'IBM Plex Sans KR',sans-serif;color:#bfc4b9;max-width:34em;margin:0 0 26px}
 .episode-one #brief .br-todo{margin:0 0 30px}.episode-one #brief .br-todo li{border-color:#53605a;padding:15px 0}
 .episode-one #brief .br-todo li span{color:#a2ada6}.episode-one #brief .br-acts{background:none;padding:0;position:static}
 .episode-one #brief .br-acts .cta{background:#ded4ba;color:#182522;min-width:140px;border:0}
 .episode-one #brief .br-acts .ghost{color:#d4cebc;border-color:#657069}
 @media(max-width:700px){.episode-one #brief{background:linear-gradient(0deg,rgba(13,23,25,.98),rgba(13,23,25,.91) 65%,rgba(13,23,25,.5));align-items:flex-end;padding:28px 24px max(32px,env(safe-area-inset-bottom))}.episode-one #brief .br-wrap{padding:0}.episode-one #brief .br-name{font-size:40px}.episode-one #brief .br-todo li{padding:12px 0}.episode-one #brief .episode-intro{font-size:14px;margin-bottom:20px}}
 `;document.head.append(css);
 const intro=document.createElement('p');intro.className='episode-intro';intro.textContent='폐점한 클럽. 회계책 송대건은 위층에서 마지막 정산을 하고 있다. 원본 장부도 그곳에 있다.';
 document.querySelector('#brief .br-head').after(intro);
 document.getElementById('btnMenu').textContent='의뢰 소개';document.getElementById('btnMenu2').textContent='의뢰 소개';
}
