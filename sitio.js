/* Ciénaga de Zapata · motor del sitio: renderiza publicaciones desde posts.json */
(function(){
"use strict";
const POSTS_URL = "posts.json";

function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

async function getPosts(){
  const r = await fetch(POSTS_URL, {cache:"no-store"});
  if(!r.ok) throw new Error("posts");
  return r.json();
}

function fichaHTML(p, admin){
  const paras = p.cuerpo.map(t=>`<p>${esc(t)}</p>`).join("");
  const datos = (p.datos||[]).map(d=>`<li><b>${esc(d[0])}:</b> ${esc(d[1])}</li>`).join("");
  const tools = admin
    ? `<div class="admin-tools"><button class="tool-btn" data-edit="${p.id}">✏️ Editar</button><button class="tool-btn del" data-del="${p.id}">🗑️</button></div>` : "";
  return `<article class="ficha rv vis" id="${esc(p.id)}">${tools}
    <div class="fimg"><img src="${esc(p.imagen)}" alt="${esc(p.alt||p.titulo)}" loading="lazy"></div>
    <div class="fbody"><h2>${esc(p.titulo)}</h2>${paras}
    ${datos?`<ul class="datos">${datos}</ul>`:""}</div></article>`;
}

/* Página de detalle: PAGINA definida antes del script */
async function renderPagina(){
  const cont = document.getElementById("fichas");
  if(!cont || typeof PAGINA === "undefined") return;
  try{
    const posts = await getPosts();
    const lista = posts.filter(p=>p.pagina===PAGINA);
    const admin = document.body.classList.contains("admin");
    cont.innerHTML = lista.map(p=>fichaHTML(p, admin)).join("");
    const toc = document.getElementById("tocList");
    if(toc) toc.innerHTML = lista.map(p=>`<li><a href="#${esc(p.id)}">${esc(p.titulo)}</a></li>`).join("");
    // deep link con hash
    if(location.hash){
      const el = document.querySelector(location.hash);
      if(el) setTimeout(()=>el.scrollIntoView({behavior:"smooth"}), 300);
    }
    if(window.CZAdmin) window.CZAdmin.bindTools(cont);
  }catch(e){
    cont.innerHTML = "<p style='opacity:.7'>No se pudo cargar el contenido. Revisa tu conexión e intenta de nuevo.</p>";
  }
}

/* Home: novedades (últimas N de todas las páginas) */
async function renderNovedades(){
  const cont = document.getElementById("novedades");
  if(!cont) return;
  try{
    const posts = await getPosts();
    const ult = posts.slice().sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))).slice(0,4);
    cont.innerHTML = ult.map(p=>`
      <article class="card rv vis">
        <div class="ph"><img src="${esc(p.imagen)}" alt="${esc(p.alt||p.titulo)}" loading="lazy"><span class="tag">${esc(nombrePag(p.pagina))}</span></div>
        <div class="body"><h3>${esc(p.titulo)}</h3>
        <p>${esc((p.cuerpo[0]||"").slice(0,140))}…</p>
        <a class="ver-mas" href="${esc(p.pagina)}.html#${esc(p.id)}">Leer más →</a></div>
      </article>`).join("");
  }catch(e){ cont.innerHTML = ""; }
}

function nombrePag(p){
  return {"lugares":"Lugares","secretos":"Secretos","fauna-flora":"Fauna","actividades":"Actividades",
          "historia":"Historia","gastronomia":"Gastronomía","guia":"Guía"}[p]||p;
}

document.addEventListener("DOMContentLoaded", ()=>{ renderPagina(); renderNovedades(); });
})();
