// This small script runs before the deferred game downloads, so the menu never
// presents dead buttons while a large bundle is still arriving.
(function(){
 var queued=null,ready=false,done=0,failed=false,box=document.createElement('div');box.id='bootStatus';box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.style.cssText='font:14px system-ui;color:#d2c9b5;margin-top:18px;line-height:1.6;max-width:360px';
 var panel=document.querySelector('.title-panel');if(panel)panel.appendChild(box);
 function text(value){box.textContent=value;}
 function fail(message){if(ready)return;failed=true;box.textContent='게임을 불러오지 못했습니다. ';var retry=document.createElement('a');retry.textContent='다시 연결';retry.style.color='inherit';retry.href=location.pathname+'?retry='+Date.now();box.appendChild(retry);var detail=document.createElement('small');detail.style.cssText='display:block;overflow-wrap:anywhere;opacity:.7';detail.textContent=String(message||'다운로드 연결 확인').slice(0,180);box.appendChild(detail);document.querySelectorAll('#btnQuick,#btnLedger').forEach(function(b){b.removeAttribute('aria-busy');});}
 function menu(id){['intro','help','ledger'].forEach(function(k){document.getElementById(k).hidden=k!==id;});}
 document.addEventListener('click',function(e){if(ready)return;var b=e.target.closest('button');if(!b)return;if(b.id==='btnHelp'){e.preventDefault();e.stopImmediatePropagation();menu('help');return;}if(b.id==='btnHelpBack'){e.preventDefault();e.stopImmediatePropagation();menu('intro');return;}if(b.id==='btnQuick'||b.id==='btnLedger'){e.preventDefault();e.stopImmediatePropagation();queued=b.id;menu('intro');if(!failed)text('게임 불러오는 중 · 준비되면 열립니다');}},true);
 window.__boot={loaded:function(){done++;if(!failed)text('게임 불러오는 중 · '+done+'/6');},fail:fail,ready:function(){ready=true;box.remove();document.querySelectorAll('#btnQuick,#btnLedger').forEach(function(b){b.removeAttribute('aria-busy');});if(queued){var id=queued;queued=null;document.getElementById(id).click();}},get state(){return{ready:ready,loaded:done,failed:failed,queued:queued};}};
 document.querySelectorAll('#btnQuick,#btnLedger').forEach(function(b){b.setAttribute('aria-busy','true');});text('게임 불러오는 중');
 window.addEventListener('error',function(e){if(!ready&&e.message)fail(e.message);});window.addEventListener('unhandledrejection',function(e){if(!ready)fail(e.reason&&e.reason.message||e.reason);});
 setTimeout(function(){if(!ready&&!failed)fail('30초 동안 준비되지 않았습니다. 다시 연결해 주세요.');},30000);
})();
