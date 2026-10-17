/* Ciénaga de Zapata · Guía nacional de Cuba
   Renderiza: mapa nacional, páginas de provincia y de municipio.
   Datos: provincias.json, lugares.json, posts.json (negocios), mapas.js (SVG). */
(function(){
"use strict";
const CZ = window.CZ || {};
const esc = CZ.esc || (s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"));

const CAT_EMOJI = {Naturaleza:"🌿", Playa:"🏖️", Ciudad:"🏛️", Historia:"📜", Cultura:"🎭", Aventura:"🧭"};
const CAT_NEG = {"Hospedaje":"🏠", "Gastronomía":"🍽️", "Transporte":"🚐", "Guías":"🧭", "Anuncios":"📢"};

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
function qs(k){
  return new URLSearchParams(location.search).get(k) || "";
}
function provPorSlug(slug, provs){ return provs.find(p=>p.slug===slug); }
function munDe(prov, slug){ return (prov.municipios||[]).find(m=>m.slug===slug); }

/* ---------- Mapa SVG ---------- */
function svgMapa(paths, vb, onClick, cls){
  const ps = Object.entries(paths).map(([slug, info])=>
    `<path d="${info.d}" data-slug="${esc(slug)}" class="mapa-path"><title>${esc(info.n)}</title></path>`
  ).join("");
  return `<svg viewBox="${vb}" class="${cls||"mapa-svg"}" role="img">${ps}</svg>`;
}
function bindMapa(cont, onClick){
  cont.querySelectorAll(".mapa-path").forEach(p=>{
    p.addEventListener("click", ()=>onClick(p.getAttribute("data-slug"), p));
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
    const vbs = Object.values(window.CZ_CUBA).map(i=>i.vb);
    mapCont.innerHTML = svgMapa(paths, vbs[0], null, "mapa-svg mapa-cuba");
    bindMapa(mapCont, slug=>{ location.href = "provincia.html?slug=" + encodeURIComponent(slug); });
  }
  if(grid){
    grid.innerHTML = provs.map(p=>{
      const nl = lugares.filter(l=>l.provincia===p.slug).length;
      const nn = negocios.filter(n=>n.provincia===p.slug).length;
      return `<a class="prov-card" href="provincia.html?slug=${esc(p.slug)}">
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
    mapaHTML = `<section class="cuba-sec"><h2>🗺️ Municipios</h2>
      <p class="sec-sub">Toca un municipio para ver sus lugares y servicios.</p>
      <div id="mapaProv" class="cuba-mapa mapa-prov">${svgMapa(paths, vb)}</div>
      <div class="mun-grid">${prov.municipios.map(m=>
        `<a class="mun-chip" href="municipio.html?prov=${esc(prov.slug)}&slug=${esc(m.slug)}">${esc(m.nombre)}</a>`
      ).join("")}</div></section>`;
  }

  cont.innerHTML =
    `<nav class="dt-migas"><a href="index.html">Inicio</a> › <a href="provincias.html">Cuba</a> › <span>${esc(prov.nombre)}</span></nav>
     <span class="kicker">🇨🇺 Provincia</span>
     <h1 class="dt-titulo">${esc(prov.nombre)}</h1>
     <p class="dt-meta"><span class="dt-zona">${prov.municipios.length} municipios</span>
     <span>·</span><span>${lug.length} lugares famosos</span>
     <span>·</span><span>${negs.filter(n=>n.id!=="s-anuncia").length} negocios</span></p>
     ${secLugares}${secNegs}${mapaHTML}`;

  const mp = document.getElementById("mapaProv");
  if(mp) bindMapa(mp, s=>{ location.href = "municipio.html?prov="+encodeURIComponent(prov.slug)+"&slug="+encodeURIComponent(s); });
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

  cont.innerHTML =
    `<nav class="dt-migas"><a href="index.html">Inicio</a> › <a href="provincias.html">Cuba</a> ›
     <a href="provincia.html?slug=${esc(prov.slug)}">${esc(prov.nombre)}</a> › <span>${esc(mun.nombre)}</span></nav>
     <span class="kicker">📍 Municipio</span>
     <h1 class="dt-titulo">${esc(mun.nombre)}</h1>
     <p class="dt-meta"><span class="dt-zona">${esc(prov.nombre)}, Cuba</span></p>
     ${carrusel("⭐ Lo mejor de "+esc(mun.nombre), lug.slice(0,6), "lugar")}
     ${carrusel("🏠 Casas destacadas", casas.slice(0,6))}
     ${carrusel("🍽️ Dónde comer", rests.slice(0,6))}
     ${carrusel("🚐 Taxis", taxis.slice(0,6))}
     <section class="cuba-sec"><h2>Explora por categoría</h2>
       ${tabsHTML("lugares")}
       <div id="cubaTabBody" class="cuba-tabbody">${panel("lugares")}</div>
     </section>`;

  cont.querySelectorAll(".cuba-tab").forEach(b=>b.addEventListener("click", ()=>{
    cont.querySelectorAll(".cuba-tab").forEach(x=>x.classList.toggle("on", x===b));
    document.getElementById("cubaTabBody").innerHTML = panel(b.getAttribute("data-tab"));
  }));
}

/* ================= HOME: sección mapa ================= */
async function renderHomeMapa(){
  const cont = document.getElementById("homeMapaCuba");
  if(!cont || !window.CZ_CUBA) return;
  const paths = {};
  Object.entries(window.CZ_CUBA).forEach(([slug, info])=>{ paths[slug] = info; });
  const vb = Object.values(window.CZ_CUBA)[0].vb;
  cont.innerHTML = svgMapa(paths, vb, null, "mapa-svg mapa-cuba");
  bindMapa(cont, slug=>{ location.href = "provincia.html?slug=" + encodeURIComponent(slug); });
}

document.addEventListener("DOMContentLoaded", ()=>{
  renderProvincias(); renderProvincia(); renderMunicipio(); renderHomeMapa();
});
})();
