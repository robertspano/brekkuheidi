/* Brekkuskógur – gagnvirkt lóðakort á gervihnattakorti (MapLibre GL)
   Lóðir = nákvæm landmæld hnit (Skipulagsstofnun/Loftmyndir, ISN93 -> WGS84). */
(() => {
const COLORS = { til_solu:'#7FFF00', fratekin:'#0fe3ff', seld:'#FF383C', sidari:'#B6B6B6' };
const COLORS_HI = { til_solu:'#C6FF87', fratekin:'#86EEFF', seld:'#FF8082', sidari:'#EDEDED' }; // hover highlight
const LABELS = { til_solu:'Til leigu', fratekin:'Frátekin', seld:'Ráðstafað', sidari:'Síðari áfangi' };
const ORDER  = ['til_solu','fratekin','seld','sidari'];
const HEIGHT = 12;
const LABEL_MIN_ZOOM = 12.5;   // street names only show once zoomed into the area

const $ = s => document.querySelector(s);
const fmt = n => (n==null?null:String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.'));

let DATA, map, selected=null, hovered=null, homeView=null, streetMarkers=[], _labelsReady=false;
const filter = new Set(ORDER);

fetch('plots.json').then(r=>r.json()).then(init).catch(e=>{
  $('#loader').innerHTML='<div class="word">Villa við að hlaða gögnum</div>'; console.error(e);
});

function plotsGeoJSON(){
  return { type:'FeatureCollection', features: DATA.plots.map(p=>({
    type:'Feature', id:p.id,
    properties:{ id:p.id, status:p.status, color:COLORS[p.status], colorHi:COLORS_HI[p.status], height:HEIGHT,
                 street:p.street, number:p.number },
    geometry:{ type:'Polygon', coordinates: p.rings || [ p.ring ] } })) };
}
function streetsGeoJSON(){
  const by={}; for(const p of DATA.plots){ if(p.street) (by[p.street]||=[]).push(p); }
  return { type:'FeatureCollection', features:Object.entries(by).map(([street,arr])=>{
    const cx=arr.reduce((s,p)=>s+p.clng,0)/arr.length, cy=arr.reduce((s,p)=>s+p.clat,0)/arr.length;
    return { type:'Feature',
      properties:{ name:street.toUpperCase(), count:arr.length, sort:-arr.length },
      geometry:{type:'Point',coordinates:[cx,cy]} };
  })};
}
/* Street names as HTML markers (DOM) — uses the page font, so they always
   render regardless of the external glyph server. */
function addStreetLabels(){
  for(const m of streetMarkers) m.remove();
  streetMarkers = [];
  for(const f of streetsGeoJSON().features){
    const el=document.createElement('div');
    el.className='street-label';
    el.textContent=f.properties.name;
    el.style.opacity='0';
    streetMarkers.push(new maplibregl.Marker({element:el, anchor:'center'})
      .setLngLat(f.geometry.coordinates).addTo(map));
  }
}
/* labels show only once revealed, not while focused on a single plot, and only
   when zoomed in enough that they belong with the plots (not on the wide view) */
function updateStreetLabels(){
  const show = _labelsReady && !_focused && map && map.getZoom() >= LABEL_MIN_ZOOM;
  for(const m of streetMarkers) m.getElement().style.opacity = show ? '1' : '0';
}
function bounds(){
  const b=new maplibregl.LngLatBounds();
  for(const p of DATA.plots) for(const c of p.ring) b.extend(c);
  return b;
}

function init(d){
  DATA=d;
  whenSized(document.getElementById('viewport'), buildMap);
}
function whenSized(el, cb){
  if(el.clientWidth>10 && el.clientHeight>10) return cb();
  const ro=new ResizeObserver(()=>{ if(el.clientWidth>10 && el.clientHeight>10){ ro.disconnect(); cb(); } });
  ro.observe(el);
  requestAnimationFrame(()=>{ if(el.clientWidth>10 && el.clientHeight>10){ ro.disconnect(); cb(); } });
}

function buildMap(){
  const c=bounds().getCenter();
  map = new maplibregl.Map({
    container:'viewport', attributionControl:false,
    style:{ version:8, glyphs:'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      // maxzoom = highest level Esri has imagery here; beyond this the map upscales
      // these tiles instead of requesting missing ones ("Map data not yet available")
      sources:{ sat:{ type:'raster', maxzoom:17,
        tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize:256, attribution:'Loftmyndir/Esri, Maxar' } },
      layers:[{id:'sat', type:'raster', source:'sat'}] },
    center:[c.lng,c.lat], zoom:14, pitch:55, bearing:0, maxPitch:80, maxZoom:17.8, antialias:true
  });
  map.addControl(new maplibregl.AttributionControl({compact:true}), 'bottom-right');
  map.dragRotate.enable(); map.touchZoomRotate.enableRotation();
  window._m = map;
  let _ready=false;
  const ready=()=>{ if(_ready) return; _ready=true; onMapLoad(); };
  map.on('load', ready);
  // tiles/glyphs can be slow/blocked; detect when adding layers is allowed by probing
  const poll=()=>{ if(_ready) return;
    try{ map.addSource('__probe',{type:'geojson',data:{type:'FeatureCollection',features:[]}}); map.removeSource('__probe'); ready(); }
    catch(e){ setTimeout(poll,250); } };
  setTimeout(poll, 600);
  new ResizeObserver(()=>map.resize()).observe(document.getElementById('viewport'));
  setTimeout(()=>$('#loader').classList.add('hide'), 9000); // safety only
}

function onMapLoad(){
  map.addSource('plots', {type:'geojson', data:plotsGeoJSON(), promoteId:'id'});
  // plots start HIDDEN (height 0, opacity 0) — revealed after the fly-in arrives
  map.addLayer({ id:'plots-fill', type:'fill-extrusion', source:'plots',
    paint:{ 'fill-extrusion-color':['case',['boolean',['feature-state','hover'],false],['get','colorHi'],['get','color']],
      'fill-extrusion-height':0, 'fill-extrusion-base':0, 'fill-extrusion-opacity':0 }});
  map.addLayer({ id:'plots-line', type:'line', source:'plots',
    paint:{'line-color':['get','color'], 'line-width':1.1, 'line-opacity':0}});
  addStreetLabels();                 // DOM markers, hidden until the reveal

  wireMap(); bindUI(); updateLegendCounts();
  introSequence();
  // safety: ensure street names surface after the intro, whatever path the reveal took
  setTimeout(()=>{ _labelsReady=true; updateStreetLabels(); }, 6800);
}

/* set plot visuals at a given height/opacity (used for the reveal animation + hover) */
function applyPlotPaint(h, op){
  if(!map.getLayer('plots-fill')) return;
  map.setPaintProperty('plots-fill','fill-extrusion-height',
    ['case',['boolean',['feature-state','hover'],false], h+18, h]);
  map.setPaintProperty('plots-fill','fill-extrusion-opacity', op);
  if(map.getLayer('plots-line')) map.setPaintProperty('plots-line','line-opacity', Math.min(0.9, op*1.5));
}
function revealPlots(){
  const DUR=1300, t0=performance.now();
  const step=(now)=>{
    const t=Math.min(1,(now-t0)/DUR), e=1-Math.pow(1-t,3); // easeOut — plots grow up
    applyPlotPaint(HEIGHT*e, 0.6*e);
    if(t<1) requestAnimationFrame(step);
    else { _userActive=0; _introDone=true; _labelsReady=true; updateStreetLabels(); }   // orbit may begin after the reveal
  };
  requestAnimationFrame(step);
}

function computeHome(){
  const cam=map.cameraForBounds(bounds(),{padding:{top:55,bottom:85,left:70,right:70},pitch:56});
  if(cam) homeView={center:cam.center, zoom:cam.zoom+0.45, pitch:58, bearing:-17};
  return homeView;
}
function fitHome(animate){
  const h=computeHome(); if(!h) return;
  animate?map.flyTo({...h,duration:1600,curve:1.3,easing:easeInOut}):map.jumpTo(h);
}
function easeInOut(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
function setInteractive(on){
  ['scrollZoom','boxZoom','dragRotate','dragPan','keyboard','doubleClickZoom','touchZoomRotate']
    .forEach(k=>{ if(map[k]) on?map[k].enable():map[k].disable(); });
}
function onceIdle(cb, fallback){
  let done=false; const f=()=>{ if(done) return; done=true; cb(); };
  map.once('idle', f); setTimeout(f, fallback||3000);
}
function introSequence(){
  startOrbitLoop();
  applyPlotPaint(0,0);                 // segmentation hidden
  const h=computeHome();
  if(!h){ $('#loader').classList.add('hide'); revealPlots(); return; }
  // start zoomed all the way out (whole of Iceland), flat
  const start={ center:h.center, zoom:4.6, pitch:0, bearing:0 };
  setInteractive(false);
  map.jumpTo(start);
  // hide loader as soon as the wide view has imagery, then start the zoom right away
  onceIdle(()=>{
    $('#loader').classList.add('hide');
    map.flyTo({ ...h, duration:4000, curve:1.55, essential:true, easing:easeInOut });
    let revealed=false;
    const doReveal=()=>{ if(revealed) return; revealed=true; setInteractive(true); revealPlots(); };
    map.once('moveend', doReveal);
    setTimeout(doReveal, 5500);                    // fallback
  }, 1200);                                        // short — don't wait long before starting
}

/* ---- continuous gentle orbit (until the user interacts) ---- */
/* Always-running idle orbit: rotates gently whenever the intro is done and the
   user hasn't interacted for a few seconds. Self-healing — never permanently stops. */
const ORBIT_SPEED=3.2;       // degrees per second
const ORBIT_RESUME=4000;     // ms of no interaction before (re)starting
let _introDone=false, _userActive=0, _olast=0, _orbitOn=false, _focused=false, _lastLabelShow=null;
function markActive(){ _userActive=performance.now(); }
function orbitLoop(now){
  const dt=_olast?Math.min((now-_olast)/1000,0.08):0; _olast=now;
  if(_introDone && !_focused && (performance.now()-_userActive)>ORBIT_RESUME){
    map.setBearing(map.getBearing()+ORBIT_SPEED*dt);
  }
  // robust: keep street labels in sync with the current zoom every frame, so they
  // can never stay visible when zoomed out even if a 'zoom' event is missed
  if(_labelsReady){
    const should = !_focused && map.getZoom() >= LABEL_MIN_ZOOM;
    if(should !== _lastLabelShow){ _lastLabelShow = should; updateStreetLabels(); }
  }
  requestAnimationFrame(orbitLoop);
}
function startOrbitLoop(){ if(_orbitOn) return; _orbitOn=true; _olast=0; requestAnimationFrame(orbitLoop); }

function wireMap(){
  map.on('mousemove','plots-fill',e=>{
    map.getCanvas().style.cursor='pointer'; const id=e.features[0].id;
    if(hovered!==id){ if(hovered!=null) map.setFeatureState({source:'plots',id:hovered},{hover:false});
      hovered=id; map.setFeatureState({source:'plots',id:hovered},{hover:true}); }
  });
  map.on('mouseleave','plots-fill',()=>{ map.getCanvas().style.cursor='';
    if(hovered!=null) map.setFeatureState({source:'plots',id:hovered},{hover:false}); hovered=null; });
  map.on('click','plots-fill',e=>{ const p=DATA.plots.find(x=>x.id===e.features[0].id);
    if(document.body.classList.contains('edit')){ editPlot(p,e.originalEvent); return; } focusPlot(p); });
  map.on('click',e=>{ if(!map.queryRenderedFeatures(e.point,{layers:['plots-fill']}).length) closeInfo(); });
  map.on('rotate',updateCompass); map.on('pitch',updateCompass);
  map.on('zoom',updateStreetLabels);   // hide street names when zoomed out, show when zoomed in
  // any manual interaction pauses the auto-orbit (resumes after a few seconds idle)
  ['mousemove','mousedown','wheel','touchstart','dblclick'].forEach(ev=>
    map.getCanvas().addEventListener(ev, markActive, {passive:true}));
  map.on('dragstart', markActive); map.on('zoomstart', markActive);
}
function updateCompass(){ const nd=document.getElementById('needle'); if(nd) nd.setAttribute('transform',`rotate(${-map.getBearing()} 50 50)`); }

function bindUI(){
  $('#zin').onclick =()=>{markActive();map.zoomIn();};
  $('#zout').onclick=()=>{markActive();map.zoomOut();};
  $('#rccw').onclick=()=>{markActive();map.easeTo({bearing:map.getBearing()-25});};
  $('#rcw').onclick =()=>{markActive();map.easeTo({bearing:map.getBearing()+25});};
  $('#home').onclick=()=>{ markActive(); const h=computeHome(); if(h){ map.flyTo({...h,duration:1800,curve:1.3,essential:true,easing:easeInOut}); } };
  document.querySelectorAll('.legend-row').forEach(row=>{ row.onclick=()=>{
    if(_focused) closeInfo();                 // leave single-plot focus when filtering
    const s=row.dataset.status; filter.has(s)?filter.delete(s):filter.add(s);
    if(filter.size===0) ORDER.forEach(x=>filter.add(x));
    row.classList.toggle('off',!filter.has(s));
    applyFilter(); }; });
  const openMenu=()=>{ $('#menu').classList.add('open'); $('#scrim').classList.add('open'); };
  const closeMenu=()=>{ $('#menu').classList.remove('open'); $('#scrim').classList.remove('open'); };
  $('#menuOpen').onclick=openMenu; $('#menuClose').onclick=closeMenu; $('#scrim').onclick=closeMenu;
  $('#infoClose').onclick=closeInfo; $('#dlData').onclick=downloadData;
  setupSheetDrag();
  window.addEventListener('keydown',e=>{ if(/input|textarea/i.test(e.target.tagName)) return;
    if(e.key==='Escape'){ closeInfo(); closeMenu(); }
    if(e.key==='e'||e.key==='E') document.body.classList.toggle('edit'); });
}

function plotTitle(p){
  if(p.street && p.number!=null) return `${p.street} ${p.number}`;
  if(p.street) return p.street;
  return `Lóð ${p.id}`;
}
function applyFilter(){
  const f=['in',['get','status'],['literal',[...filter]]];
  map.setFilter('plots-fill',f); map.setFilter('plots-line',f);
}
/* click a plot → hide all others, zoom in, open info, full focus on it */
function focusPlot(p){
  markActive(); _focused=true;
  // close-up: show ONLY the outline of the clicked plot (no 3D gray box)
  map.setFilter('plots-line',['==',['get','id'],p.id]);
  map.setLayoutProperty('plots-fill','visibility','none');
  map.setPaintProperty('plots-line','line-color','#ffffff');
  map.setPaintProperty('plots-line','line-width',2.6);
  map.setPaintProperty('plots-line','line-opacity',1);
  updateStreetLabels();
  openInfo(p);                       // open the sheet first so we can measure its real height
  const isMobile=window.innerWidth<=768;
  let bottomPad=160;
  if(isMobile){
    const el=document.getElementById('info');
    // frame the plot in the area ABOVE the bottom sheet (use the sheet's actual height)
    const sheetH = el ? el.getBoundingClientRect().height : Math.round(window.innerHeight*0.55);
    bottomPad = Math.round(sheetH + 30);
  }
  const b=new maplibregl.LngLatBounds();
  for(const c of p.ring) b.extend(c);
  map.fitBounds(b,{ pitch:isMobile?50:62, bearing:map.getBearing(), maxZoom:17.4, duration:1500, essential:true,
    padding:{ top:isMobile?70:90, bottom:bottomPad, left:isMobile?32:160, right:isMobile?32:440 } });
}
function unfocus(){
  if(!_focused) return; _focused=false;
  map.setLayoutProperty('plots-fill','visibility','visible');   // restore 3D boxes
  map.setPaintProperty('plots-line','line-color',['get','color']);
  map.setPaintProperty('plots-line','line-width',1.1);
  map.setPaintProperty('plots-line','line-opacity',0.85);
  applyFilter();                                       // bring all plots back (per legend filter)
  updateStreetLabels();
  markActive();
  const h=computeHome(); if(h) map.flyTo({...h, duration:1600, curve:1.3, essential:true, easing:easeInOut});
}
function plotDesc(p){
  const t=plotTitle(p);
  switch(p.status){
    case 'til_solu': return `${t} er laus lóð í frístundabyggðinni Brekkuskógi — leigulóð til 25 ára. Í fallegu umhverfi við Brúará í Biskupstungum; hafðu samband fyrir nánari upplýsingar um leiguverð og skilmála.`;
    case 'fratekin': return `${t} er frátekin. Hafðu samband fyrir nánari upplýsingar.`;
    case 'seld':     return `${t} er þegar ráðstafað.`;
    default:         return `Hafðu samband fyrir nánari upplýsingar um þessa lóð.`;
  }
}
const dash = v => (v==null || v==='') ? '—' : v;
function openInfo(p){
  if(selected!=null) map.setFeatureState({source:'plots',id:selected},{selected:false});
  selected=p.id;
  $('#infoHeadTitle').textContent=plotTitle(p);
  // only show real, sourced data — anything unknown becomes a dash (—)
  const verd = p.verd!=null ? fmt(p.verd)+' kr.' : 'Hafðu samband';
  const ferm = p.area_m2!=null ? fmt(p.area_m2)+' m²' : '—';
  const haTxt = p.area_m2!=null ? ' · '+(p.area_m2/10000).toFixed(2).replace('.',',')+' ha' : '';
  $('#infoBody').innerHTML=`
    <h2 class="info-title">${plotTitle(p)}</h2>
    <p class="info-desc">${plotDesc(p)}</p>
    <div class="spec"><span class="k">Staða</span><span class="v"><span class="status-dot" style="background:${COLORS[p.status]}"></span>${LABELS[p.status]}</span></div>
    <div class="spec"><span class="k">Stærð</span><span class="v">${ferm}${haTxt}</span></div>
    <div class="spec"><span class="k">Leiguverð</span><span class="v">${verd}</span></div>
    <div class="spec"><span class="k">Fasteignanúmer</span><span class="v">${dash(p.fasteignanr)}</span></div>`;
  $('#infoFoot').innerHTML=`<a class="info-cta" href="index.html#hafa-samband">Hafa samband</a>`;
  // carry the plot's address to the contact form so the visitor doesn't retype it
  const cta=$('#infoFoot').querySelector('.info-cta');
  if(cta) cta.addEventListener('click',()=>{ try{ sessionStorage.setItem('bh_lod', plotTitle(p)); }catch(e){} });
  const _sheet=$('#info'); _sheet.style.transition=''; _sheet.style.height='';   // reset any drag-resize from a previous plot
  _sheet.classList.add('open');
}
function closeInfo(){
  $('#info').style.transition='';            // ensure the slide-down (transform) animates after a drag
  $('#info').classList.remove('open');
  if(selected!=null) map.setFeatureState({source:'plots',id:selected},{selected:false});
  selected=null;
  unfocus();
}

/* Draggable bottom sheet (mobile): drag the handle to resize between a peek
   and full height, or flick it down to dismiss. Desktop is unaffected. */
function setupSheetDrag(){
  const sheet=$('#info'), head=sheet&&sheet.querySelector('.info-head');
  if(!sheet||!head) return;
  const VH=()=>window.innerHeight;
  const isMobile=()=>window.innerWidth<=768;
  let armed=false,dragging=false,startY=0,startH=0,lastY=0,lastT=0,vel=0;
  head.style.touchAction='none';
  head.addEventListener('pointerdown',e=>{
    if(!isMobile()||!sheet.classList.contains('open')) return;
    if(e.target.closest('.info-close')) return;          // let the ✕ button work normally
    armed=true; dragging=false;
    startY=e.clientY; startH=sheet.getBoundingClientRect().height;
    lastY=e.clientY; lastT=e.timeStamp; vel=0;
  });
  head.addEventListener('pointermove',e=>{
    if(!armed) return;
    const dy=e.clientY-startY;
    if(!dragging){
      if(Math.abs(dy)<6) return;                         // movement threshold — taps still register
      dragging=true; sheet.style.transition='none';
      try{head.setPointerCapture(e.pointerId);}catch(_){}
    }
    const h=Math.max(0,Math.min(Math.round(VH()*0.52),startH-dy));   // drag down → shorter; up → taller (max 52vh)
    sheet.style.height=h+'px';
    vel=(e.clientY-lastY)/Math.max(1,e.timeStamp-lastT);
    lastY=e.clientY; lastT=e.timeStamp;
    e.preventDefault();
  });
  const end=e=>{
    if(!armed) return; armed=false;
    if(!dragging) return;                                // it was a tap, not a drag
    dragging=false;
    try{head.releasePointerCapture(e.pointerId);}catch(_){}
    const V=VH(), h=sheet.getBoundingClientRect().height;
    if(h<V*0.24||vel>0.5){                               // dragged low or flicked down → dismiss
      sheet.style.transition=''; closeInfo(); return;
    }
    const PEEK=Math.round(V*0.36), FULL=Math.round(V*0.52);
    sheet.style.transition='height .26s cubic-bezier(.4,0,.1,1)';
    sheet.style.height=(h<(PEEK+FULL)/2?PEEK:FULL)+'px'; // snap to peek or full
  };
  head.addEventListener('pointerup',end);
  head.addEventListener('pointercancel',end);
}

function updateLegendCounts(){
  const c={til_solu:0,fratekin:0,seld:0,sidari:0};
  for(const p of DATA.plots) c[p.status]++;
  document.querySelectorAll('.legend-row').forEach(r=>{ r.querySelector('.ct').textContent=c[r.dataset.status]; });
}
function editPlot(p,ev){
  if(ev && ev.shiftKey){ const val=prompt('Gata og númer lóðar:', `${p.street} ${p.number}`);
    if(val){ const m=val.trim().match(/^(.+?)\s+(\d+)$/); if(m){ p.street=m[1]; p.number=+m[2]; addStreetLabels(); updateStreetLabels(); } }
  } else { p.status=ORDER[(ORDER.indexOf(p.status)+1)%ORDER.length];
    map.getSource('plots').setData(plotsGeoJSON()); updateLegendCounts(); }
}
function downloadData(){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(DATA)],{type:'application/json'}));
  a.download='plots.json'; a.click();
}
})();
