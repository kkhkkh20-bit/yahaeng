import {passageMode} from './passages.js';
// Static models belong to a floor. LOS controls actor discovery and prompts,
// not whether a bin, planter or piece of furniture exists in the world.
export function createVisibility(G){
 let inside=-1,fl=0,count=0,last=-Infinity,stamp='';const scale=4,w=G.MW*scale,h=G.MH*scale,data=new Uint8Array(w*h);
 function at(x,y){const ix=Math.floor(x/48*scale),iy=Math.floor(y/48*scale);return ix>=0&&iy>=0&&ix<w&&iy<h&&data[iy*w+ix]>0;}
 function update(){const S=G.S,P=S.player,R=G.traversalRoom(P.trav);fl=P.fl||0;inside=R?.b??(P.z?-1:G.bldAt(Math.floor(P.x/48),Math.floor(P.y/48)));const key=[Math.floor(P.x/3),Math.floor(P.y/3),fl,inside,P.under,P.vent,...S.doors.map(d=>+d.locked)].join(':');if(stamp===key&&S.t>=last&&S.t-last<.12)return;stamp=key;last=S.t;data.fill(0);count=0;
  if(!P.z&&!P.under&&!P.vent){const restore=G.layer;G.setLayer(fl);try{for(const bi of G.STAGE.cutawayBuildings||[0]){const b=G.BLD[bi];if(bi===inside||!b||b.h<=fl)continue;for(let iy=b.y0*scale;iy<(b.y1+1)*scale;iy++)for(let ix=b.x0*scale;ix<(b.x1+1)*scale;ix++){const x=(ix+.5)/scale*48,y=(iy+.5)/scale*48;if(Math.hypot(x-P.x,y-P.y)<=430&&G.los(P.x,P.y,x,y)){data[iy*w+ix]=255;count++;}}}}finally{G.setLayer(restore);}}
 }
 function fixture(o){const P=G.S.player;return(o.fl||0)===fl&&(o.z||0)===(P.z||0)&&!passageMode(P);}
 function visible(o,isFixture=false){if(!fixture(o))return false;if(isFixture)return true;const b=G.bldAt(Math.floor(o.x/48),Math.floor(o.y/48));return b<0||b===inside||at(o.x,o.y);}
 function cue(o){return fixture(o)&&G.fixtureVisible(o,430);}
 return{update,visible,fixture,cue,at,get outside(){return inside<0},get cells(){return count},get inside(){return inside},dispose(){}};
}
