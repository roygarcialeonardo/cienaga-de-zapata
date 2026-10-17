/* Ciénaga de Zapata · Guía nacional de Cuba
   Renderiza: mapa nacional, páginas de provincia y de municipio.
   Datos: provincias.json, lugares.json, posts.json (negocios), mapas.js (SVG). */
(function(){
"use strict";
const CZ = window.CZ || {};
const esc = CZ.esc || (s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"));

const CAT_EMOJI = {Naturaleza:"🌿", Playa:"🏖️", Ciudad:"🏛️", Historia:"📜", Cultura:"🎭", Aventura:"🧭"};
const CAT_NEG = {"Hospedaje":"🏠", "Gastronomía":"🍽️", "Transporte":"🚐", "Guías":"🧭", "Anuncios":"📢"};

/* Paleta tropical: una por provincia (estilo mapa ilustrado) */
const PROV_COLOR = {
  "artemisa":"#ffd166", "camaguey":"#f3722c", "ciego-de-avila":"#00f5d4",
  "cienfuegos":"#9b5de5", "granma":"#f94144", "guantanamo":"#43aa8b",
  "holguin":"#577590", "isla-de-la-juventud":"#b565d8", "la-habana":"#ef476f",
  "las-tunas":"#90be6d", "matanzas":"#118ab2", "mayabeque":"#06d6a0",
  "pinar-del-rio":"#3ddc97", "sancti-spiritus":"#fee440",
  "santiago-de-cuba":"#ff9f1c", "villa-clara":"#f15bb5"
};
const MUN_PALETA = ["#3ddc97","#ffd166","#118ab2","#ef476f","#9b5de5","#06d6a0","#ff9f1c","#f15bb5"];

/* Decoraciones marinas alrededor del mapa (estilo ilustrado) */
const DECO_MAR = ["🦩","⛵","🐬","🐠","🌊","🐢"];
function decoHTML(){
  const pos = [
    "top:2%;left:3%", "top:6%;right:5%", "bottom:8%;left:6%",
    "bottom:4%;right:8%", "top:44%;left:-1%", "top:40%;right:0%"
  ];
  return `<div class="mapa-deco" aria-hidden="true">` + DECO_MAR.map((e,i)=>
    `<span class="mapa-deco-e" style="${pos[i]}">${e}</span>`).join("") + `</div>`;
}

let _provs = null, _lugares = null, _posts = null;
async function getProvs(){
  if(_provs) return _provs;
  const r = await fetch("provincias.json", {cache:"no-store"});
  _provs = await r.json();
  return _provs;
}
async function getLugares(){
  if(_lugares) return _lugares;
  try{
    const r = await fetch("lugares.json", {cache:"no-store"});
    _lugares = r.ok ? await r.json() : [];
  }catch(e){ _lugares = []; }
  return _lugares;
}
async function getPosts(){
  if(_posts) return _posts;
  if(CZ.getPosts){ _posts = await CZ.getPosts(); }
  else { const r = await fetch("posts.json", {cache:"no-store"}); _posts = await r.json(); }
  return _posts;
}
function qs(k){ return new URLSearchParams(location.search).get(k) || ""; }
function provPorSlug(slug, provs){ return provs.find(p=>p.slug===slug); }
function munDe(prov, slug){ return (prov.municipios||[]).find(m=>m.slug===slug); }

/* ---------- Geometría: centroide aproximado de un path ---------- */
function centroide(d){
  const nums = (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  let minx=1e9, maxx=-1e9, miny=1e9, maxy=-1e9;
  for(let i=0;i+1<nums.length;i+=2){
    const x=nums[i], y=nums[i+1];
    if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y;
  }
  if(minx>maxx) return null;
  return {x:(minx+maxx)/2, y:(miny+maxy)/2};
}
/* Desplazamientos para no apilar pines del mismo municipio */
const OFFSETS = [[0,0],[26,-8],[-26,-6],[14,20],[-14,20],[30,12],[-30,12],[0,-26]];

/* ---------- Mapa SVG colorido ---------- */
function svgMapa(paths, vb, opts){
  opts = opts || {};
  const colores = opts.colores || {};
  const paleta = opts.paleta || null;
  let i = 0;
  const ps = Object.entries(paths).map(([slug, info])=>{
    const fill = colores[slug] || (paleta ? paleta[i++ % paleta.length] : "rgba(61,220,151,.14)");
    return `<path d="${info.d}" data-slug="${esc(slug)}" class="mapa-path mapa-color" style="fill:${fill}" fill-opacity="0.82"><title>${esc(info.n)}</title></path>`;
  }).join("");
  return `<svg viewBox="${vb}" class="${opts.cls||"mapa-svg"}" role="img">${ps}${opts.extra||""}</svg>`;
}
function bindMapa(cont, onClick){
  cont.querySelectorAll(".mapa-path").forEach(p=>{
    p.addEventListener("click", ()=>onClick(p.getAttribute("data-slug"), p));
  });
}

/* ---------- Pines de lugares famosos ---------- */
function pinesSVG(lugares, paths, maxPorMun){
  /* agrupa por municipio y toma hasta maxPorMun por grupo */
  const porMun = {};
  lugares.forEach(l=>{
    (porMun[l.municipio] = porMun[l.municipio] || []).push(l);
  });
  let out = "";
  Object.entries(porMun).forEach(([mslug, lista])=>{
    const info = paths[mslug];
    if(!info) return;
    const c = centroide(info.d);
    if(!c) return;
    lista.slice(0, maxPorMun||3).forEach((l, idx)=>{
      const o = OFFSETS[idx % OFFSETS.length];
      const em = CAT_EMOJI[l.categoria] || "📍";
      out += `<text x="${(c.x+o[0]).toFixed(1)}" y="${(c.y+o[1]).toFixed(1)}" class="mapa-pin" `+
        `data-nombre="${esc(l.nombre)}" data-mun="${esc(l.municipio)}" text-anchor="middle" dominant-baseline="central">${em}</text>`;
    });
  });
  return out;
}
function bindPines(cont){
  const etiqueta = cont.parentElement ? cont.parentElement.querySelector(".mapa-etiqueta") : null;
  cont.querySelectorAll(".mapa-pin").forEach(pin=>{
    pin.addEventListener("click", ev=>{
      ev.stopPropagation();
      const nom = pin.getAttribute("data-nombre");
      let et = cont.querySelector(".mapa-etiqueta");
      if(!et){
        et = document.createElement("div");
        et.className = "mapa-etiqueta";
        cont.appendChild(et);
      }
      et.textContent = "📍 " + nom;
      et.classList.add("on");
      clearTimeout(et._t);
      et._t = setTimeout(()=>et.classList.remove("on"), 2200);
    });
  });
}

/* ---------- Tarjeta de lugar famoso ---------- */
function tarjetaLugar(l, provNombre, munNombre){
  const em = CAT_EMOJI[l.categoria] || "📍";
  return `<article class="lugar-card cat-${esc((l.categoria||"").toLowerCase())}">
    <div class="lugar-top"><span class="lugar-emoji">${em}</span>
    <span class="lugar-cat">${esc(l.categoria||"Lugar")}</span></div>
    <h3>${esc(l.nombre)}</h3>
    <p class="lugar-ub">📍 ${esc(munNombre||"")}${munNombre&&provNombre?", ":""}${esc(provNombre||"")}</p>
    <p class="lugar-desc">${esc(l.descripcion||"")}</p>
  </article>`;
}

/* ---------- CTA auto-registro ---------- */
function ctaAnuncia(){
  return `<div class="cta-anuncia">
    <p><b>📢 ¿Tienes un negocio aquí?</b><br>Casas de renta, restaurantes, taxis y guías: anúnciate gratis en la guía.</p>
    <a class="btn btn-sol" href="publicar.html">Anunciar mi negocio</a>
  </div>`;
}

/* ================= PROVINCIAS.HTML ================= */
async function renderProvincias(){
  const mapCont = document.getElementById("mapaCuba");
  const grid = document.getElementById("provGrid");
  if(!mapCont && !grid) return;
  const [provs, lugares, posts] = await Promise.all([getProvs(), getLugares(), getPosts()]);
  const negocios = posts.filter(p=>p.pagina==="servicios" && p.id!=="s-anuncia");
  if(mapCont && window.CZ_CUBA){
    const paths = {};
    Object.entries(window.CZ_CUBA).forEach(([slug, info])=>{ paths[slug] = info; });
    const vb = Object.values(window.CZ_CUBA)[0].vb;
    /* pines: hasta 3 lugares por provincia, en el centroide de su municipio */
    const munsPaths = {};
    Object.entries(window.CZ_PROVMAP||{}).forEach(([ps, mp])=>Object.assign(munsPaths, mp));
    const porProv = {};
    lugares.forEach(l=>{ (porProv[l.provincia]=porProv[l.provincia]||[]).push(l); });
    const destacados = [];
    Object.values(porProv).forEach(lista=>destacados.push(...lista.slice(0,3)));
    const extra = pinesSVG(destacados, munsPaths, 3);
    mapCont.innerHTML = decoHTML() + svgMapa(paths, vb, {colores:PROV_COLOR, cls:"mapa-svg mapa-cuba", extra});
    bindMapa(mapCont, slug=>{ location.href = "provincia.html?slug=" + encodeURIComponent(slug); });
    bindPines(mapCont);
  }
  if(grid){
    grid.innerHTML = provs.map(p=>{
      const nl = lugares.filter(l=>l.provincia===p.slug).length;
      const nn = negocios.filter(n=>n.provincia===p.slug).length;
      const col = PROV_COLOR[p.slug] || "#3ddc97";
      return `<a class="prov-card" href="provincia.html?slug=${esc(p.slug)}" style="--prov-c:${col}">
        <span class="prov-card-n">${esc(p.nombre)}</span>
        <span class="prov-card-d">${p.municipios.length} municipios · ${nl} lugares${nn?` · ${nn} negocios`:""}</span>
        <span class="prov-card-ir">Explorar →</span>
      </a>`;
    }).join("");
  }
}

/* ================= PROVINCIA.HTML ================= */
async function renderProvincia(){
  const cont = document.getElementById("provincia");
  if(!cont) return;
  const slug = qs("slug");
  const [provs, lugares, posts] = await Promise.all([getProvs(), getLugares(), getPosts()]);
  const prov = provPorSlug(slug, provs);
  if(!prov){
    cont.innerHTML = `<div class="dt-nofound"><h2>Provincia no encontrada</h2>
      <p>Revisa el mapa nacional y elige una provincia.</p>
      <a class="btn btn-sol" href="provincias.html">🇨🇺 Ver mapa de Cuba</a></div>`;
    return;
  }
  document.title = prov.nombre + " | Guía de Cuba";
  const lug = lugares.filter(l=>l.provincia===prov.slug);
  const negs = posts.filter(p=>p.pagina==="servicios" && p.provincia===prov.slug);
  const porCat = cat => negs.filter(n=>n.categoria===cat && n.id!=="s-anuncia");
  const munSlug2Nom = {}; prov.municipios.forEach(m=>munSlug2Nom[m.slug]=m.nombre);

  const secLugares = lug.length ?
    `<section class="cuba-sec"><h2>⭐ Lugares más visitados</h2>
     <div class="lugar-grid">${lug.slice(0,8).map(l=>tarjetaLugar(l, prov.nombre, munSlug2Nom[l.municipio])).join("")}</div></section>` : "";

  const cats = ["Hospedaje","Gastronomía","Transporte","Guías"];
  const secNegs = cats.map(cat=>{
    const lista = porCat(cat).slice(0,4);
    const cards = lista.length && CZ.tarjetaServicio
      ? lista.map(p=>CZ.tarjetaServicio(p,false)).join("")
      : "";
    return `<section class="cuba-sec"><h2>${CAT_NEG[cat]||"•"} ${esc(cat)}</h2>
      ${cards?`<div class="srv-grid">${cards}</div>`:ctaAnuncia()}
    </section>`;
  }).join("");

  let mapaHTML = "";
  if(window.CZ_PROVMAP && window.CZ_PROVMAP[prov.slug]){
    const paths = window.CZ_PROVMAP[prov.slug];
    const vb = Object.values(paths)[0].vb;
    const extra = pinesSVG(lug, paths, 4);
    mapaHTML = `<section class="cuba-sec"><h2>🗺️ Municipios</h2>
      <p class="sec-sub">Toca un municipio para ver sus lugares y servicios. Los ${"dibujitos"} marcan lugares famosos.</p>
      <div id="mapaProv" class="cuba-mapa mapa-prov">${decoHTML()}${svgMapa(paths, vb, {paleta:MUN_PALETA, extra})}</div>
      <div class="mun-grid">${prov.municipios.map(m=>
        `<a class="mun-chip" href="municipio.html?prov=${esc(prov.slug)}&slug=${esc(m.slug)}">${esc(m.nombre)}</a>`
      ).join("")}</div></section>`;
  }

  const col = PROV_COLOR[prov.slug] || "#3ddc97";
  cont.innerHTML =
    `<nav class="dt-migas"><a href="index.html">Inicio</a> › <a href="provincias.html">Cuba</a> › <span>${esc(prov.nombre)}</span></nav>
     <span class="kicker">🇨🇺 Provincia</span>
     <h1 class="dt-titulo" style="--prov-c:${col}">${esc(prov.nombre)}</h1>
     <p class="dt-meta"><span class="dt-zona">${prov.municipios.length} municipios</span>
     <span>·</span><span>${lug.length} lugares famosos</span>
     <span>·</span><span>${negs.filter(n=>n.id!=="s-anuncia").length} negocios</span></p>
     ${secLugares}${secNegs}${mapaHTML}`;

  const mp = document.getElementById("mapaProv");
  if(mp){
    bindMapa(mp, s=>{ location.href = "municipio.html?prov="+encodeURIComponent(prov.slug)+"&slug="+encodeURIComponent(s); });
    bindPines(mp);
  }
}

/* ================= MUNICIPIO.HTML ================= */
function tabsHTML(active){
  const tabs = [["lugares","⭐ Lugares"],["casas","🏠 Casas"],["restaurantes","🍽️ Restaurantes"],["taxis","🚐 Taxis"]];
  return `<div class="cuba-tabs" role="tablist">${tabs.map(([k,label])=>
    `<button type="button" role="tab" class="cuba-tab${k===active?" on":""}" data-tab="${k}">${label}</button>`
  ).join("")}</div>`;
}
async function renderMunicipio(){
  const cont = document.getElementById("municipio");
  if(!cont) return;
  const pslug = qs("prov"), mslug = qs("slug");
  const [provs, lugares, posts] = await Promise.all([getProvs(), getLugares(), getPosts()]);
  const prov = provPorSlug(pslug, provs);
  const mun = prov ? munDe(prov, mslug) : null;
  if(!prov || !mun){
    cont.innerHTML = `<div class="dt-nofound"><h2>Municipio no encontrado</h2>
      <a class="btn btn-sol" href="provincias.html">🇨🇺 Ver mapa de Cuba</a></div>`;
    return;
  }
  document.title = mun.nombre + ", " + prov.nombre + " | Guía de Cuba";
  const lug = lugares.filter(l=>l.provincia===prov.slug && l.municipio===mun.slug);
  const negs = posts.filter(p=>p.pagina==="servicios" && p.provincia===prov.slug && p.municipio===mun.slug && p.id!=="s-anuncia");
  const casas = negs.filter(n=>n.categoria==="Hospedaje");
  const rests = negs.filter(n=>n.categoria==="Gastronomía");
  const taxis = negs.filter(n=>n.categoria==="Transporte");

  const carrusel = (titulo, items, tipo) => {
    if(!items.length) return "";
    const cards = tipo==="lugar"
      ? items.map(l=>tarjetaLugar(l, prov.nombre, mun.nombre)).join("")
      : (CZ.tarjetaServicio ? items.map(p=>CZ.tarjetaServicio(p,false)).join("") : "");
    return `<section class="cuba-sec"><h2>${titulo}</h2><div class="carrusel">${cards}</div></section>`;
  };

  const panel = k => {
    if(k==="lugares") return lug.length ? `<div class="lugar-grid">${lug.map(l=>tarjetaLugar(l, prov.nombre, mun.nombre)).join("")}</div>` : ctaAnuncia();
    const lista = k==="casas"?casas : k==="restaurantes"?rests : taxis;
    if(!lista.length) return ctaAnuncia();
    return `<div class="srv-grid">${CZ.tarjetaServicio ? lista.map(p=>CZ.tarjetaServicio(p,false)).join("") : ""}</div>`;
  };

  /* Mini-mapa ilustrado del municipio */
  let miniMapa = "";
  const provPaths = (window.CZ_PROVMAP||{})[prov.slug];
  if(provPaths && provPaths[mun.slug]){
    const mp = {}; mp[mun.slug] = provPaths[mun.slug];
    const vb = provPaths[mun.slug].vb;
    const extra = pinesSVG(lug, mp, 6);
    miniMapa = `<section class="cuba-sec"><h2>🗺️ Mapa de ${esc(mun.nombre)}</h2>
      <div id="mapaMun" class="cuba-mapa mapa-mun">${decoHTML()}${svgMapa(mp, vb, {colores:{[mun.slug]:PROV_COLOR[prov.slug]||"#3ddc97"}, extra})}</div>
    </section>`;
  }

  cont.innerHTML =
    `<nav class="dt-migas"><a href="index.html">Inicio</a> › <a href="provincias.html">Cuba</a> ›
     <a href="provincia.html?slug=${esc(prov.slug)}">${esc(prov.nombre)}</a> › <span>${esc(mun.nombre)}</span></nav>
     <span class="kicker">📍 Municipio</span>
     <h1 class="dt-titulo">${esc(mun.nombre)}</h1>
     <p class="dt-meta"><span class="dt-zona">${esc(prov.nombre)}, Cuba</span></p>
     ${miniMapa}
     ${carrusel("⭐ Lo mejor de "+esc(mun.nombre), lug.slice(0,6), "lugar")}
     ${carrusel("🏠 Casas destacadas", casas.slice(0,6))}
     ${carrusel("🍽️ Dónde comer", rests.slice(0,6))}
     ${carrusel("🚐 Taxis", taxis.slice(0,6))}
     <section class="cuba-sec"><h2>Explora por categoría</h2>
       ${tabsHTML("lugares")}
       <div id="cubaTabBody" class="cuba-tabbody">${panel("lugares")}</div>
     </section>`;

  const mm = document.getElementById("mapaMun");
  if(mm) bindPines(mm);

  cont.querySelectorAll(".cuba-tab").forEach(b=>b.addEventListener("click", ()=>{
    cont.querySelectorAll(".cuba-tab").forEach(x=>x.classList.toggle("on", x===b));
    document.getElementById("cubaTabBody").innerHTML = panel(b.getAttribute("data-tab"));
  }));
}

/* ================= HOME: sección mapa ================= */
async function renderHomeMapa(){
  const cont = document.getElementById("homeMapaCuba");
  if(!cont || !window.CZ_CUBA) return;
  const [lugares] = await Promise.all([getLugares()]);
  const paths = {};
  Object.entries(window.CZ_CUBA).forEach(([slug, info])=>{ paths[slug] = info; });
  const vb = Object.values(window.CZ_CUBA)[0].vb;
  const munsPaths = {};
  Object.entries(window.CZ_PROVMAP||{}).forEach(([ps, mp])=>Object.assign(munsPaths, mp));
  const porProv = {};
  lugares.forEach(l=>{ (porProv[l.provincia]=porProv[l.provincia]||[]).push(l); });
  const destacados = [];
  Object.values(porProv).forEach(lista=>destacados.push(...lista.slice(0,3)));
  const extra = pinesSVG(destacados, munsPaths, 3);
  cont.innerHTML = decoHTML() + svgMapa(paths, vb, {colores:PROV_COLOR, cls:"mapa-svg mapa-cuba", extra});
  bindMapa(cont, slug=>{ location.href = "provincia.html?slug=" + encodeURIComponent(slug); });
  bindPines(cont);
}

document.addEventListener("DOMContentLoaded", ()=>{
  renderProvincias(); renderProvincia(); renderMunicipio(); renderHomeMapa();
});
})();
