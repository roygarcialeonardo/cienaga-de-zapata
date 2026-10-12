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
  const cat = p.categoria ? `<span class="fcat">${esc(p.categoria)}</span>` : "";
  let cta = "";
  if(p.pagina==="servicios"){
    const wnum = String((window.CZ_CONFIG||{}).WHATSAPP_CONTACTO||"").replace(/\D/g,"");
    let wapp = "";
    if(wnum){
      const txt = encodeURIComponent("Hola, vi el anuncio de «"+p.titulo+"» en la guía de la Ciénaga de Zapata y me interesa.");
      wapp = `<a class="btn-wapp" href="https://wa.me/${wnum}?text=${txt}" target="_blank" rel="noopener">💬 WhatsApp</a>`;
    }
    const resBtn = `<button type="button" class="btn-reserva" data-reserva="${esc(p.id)}" data-titulo="${esc(p.titulo)}">📅 Solicitar reserva</button>`;
    cta = `<div class="srv-cta">${wapp}${resBtn}</div>`;
  }
  return `<article class="ficha rv vis" id="${esc(p.id)}">${tools}
    <div class="fimg"><img src="${esc(p.imagen)}" alt="${esc(p.alt||p.titulo)}" loading="lazy"></div>
    <div class="fbody"><h2>${esc(p.titulo)}</h2>${cat}${paras}
    ${datos?`<ul class="datos">${datos}</ul>`:""}${cta}</div></article>`;
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
          "historia":"Historia","gastronomia":"Gastronomía","guia":"Guía","servicios":"Servicios"}[p]||p;
}

document.addEventListener("DOMContentLoaded", ()=>{ renderPagina(); renderNovedades(); chequearConn(); montarModalReserva(); });

/* ---------- Solicitud de reserva (fichas de Servicios) ----------
   Sin calendarios ni pagos: el formulario arma el mensaje y lo envía
   al WhatsApp de Leonardo, que confirma manualmente con el negocio. */
let reservaTitulo = "";
function montarModalReserva(){
  if(document.getElementById("modalReserva")) return;
  const v = document.createElement("div");
  v.id = "modalReserva";
  v.className = "modal-reserva";
  v.innerHTML =
  '<div class="mr-caja" role="dialog" aria-modal="true" aria-labelledby="mrTitle">' +
    '<button type="button" class="mr-x" id="mrCerrar" aria-label="Cerrar">✕</button>' +
    '<h3 id="mrTitle">Solicitar reserva</h3>' +
    '<p class="mr-sub" id="mrNegocio"></p>' +
    '<form id="mrForm" novalidate>' +
      '<label>Nombre *<input type="text" id="mrNombre" required autocomplete="name"></label>' +
      '<label>WhatsApp o email *<input type="text" id="mrContacto" required autocomplete="tel"></label>' +
      '<div class="mr-dos">' +
        '<label>Llegada *<input type="date" id="mrLlegada" required></label>' +
        '<label>Salida *<input type="date" id="mrSalida" required></label>' +
      '</div>' +
      '<label>Huéspedes *<input type="number" id="mrHuespedes" min="1" step="1" value="2" required></label>' +
      '<label>Mensaje (opcional)<textarea id="mrMensaje" rows="3" placeholder="Alguna petición especial…"></textarea></label>' +
      '<p class="error" id="mrError" hidden></p>' +
      '<button type="submit" class="btn btn-sol mr-enviar">📩 Enviar por WhatsApp</button>' +
    '</form>' +
  '</div>';
  document.body.appendChild(v);
  v.addEventListener("click", e=>{ if(e.target===v) cerrarModalReserva(); });
  document.getElementById("mrCerrar").addEventListener("click", cerrarModalReserva);
  document.getElementById("mrForm").addEventListener("submit", enviarReserva);
}
function abrirModalReserva(titulo){
  reservaTitulo = titulo;
  document.getElementById("mrNegocio").innerHTML = "🏠 " + esc(titulo);
  const err = document.getElementById("mrError");
  err.hidden = true; err.textContent = "";
  document.getElementById("modalReserva").classList.add("on");
  document.body.style.overflow = "hidden";
  setTimeout(()=>document.getElementById("mrNombre").focus(), 60);
}
function cerrarModalReserva(){
  const m = document.getElementById("modalReserva");
  if(m) m.classList.remove("on");
  document.body.style.overflow = "";
}
function fechaCorta(iso){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||"");
  return m ? (m[3]+"/"+m[2]+"/"+m[1]) : iso;
}
function enviarReserva(e){
  e.preventDefault();
  const err = document.getElementById("mrError");
  const nombre = document.getElementById("mrNombre").value.trim();
  const contacto = document.getElementById("mrContacto").value.trim();
  const llegada = document.getElementById("mrLlegada").value;
  const salida = document.getElementById("mrSalida").value;
  const hues = parseInt(document.getElementById("mrHuespedes").value, 10);
  const mensaje = document.getElementById("mrMensaje").value.trim();
  function falla(t){ err.textContent = t; err.hidden = false; return false; }
  if(!nombre) return falla("Escribe tu nombre.");
  if(!contacto) return falla("Escribe tu WhatsApp o email para contactarte.");
  if(!llegada || !salida) return falla("Elige las fechas de llegada y salida.");
  if(llegada >= salida) return falla("La fecha de salida debe ser posterior a la de llegada.");
  if(!(hues >= 1)) return falla("Indica al menos 1 huésped.");
  err.hidden = true;
  const wnum = String((window.CZ_CONFIG||{}).WHATSAPP_CONTACTO||"").replace(/\D/g,"");
  if(!wnum) return falla("No se pudo determinar el contacto. Intenta más tarde.");
  const lineas = [
    "Hola, quiero solicitar una reserva:",
    "— Negocio: " + reservaTitulo,
    "— Nombre: " + nombre,
    "— Contacto: " + contacto,
    "— Llegada: " + fechaCorta(llegada),
    "— Salida: " + fechaCorta(salida),
    "— Huéspedes: " + hues
  ];
  if(mensaje) lineas.push("— Mensaje: " + mensaje);
  const url = "https://wa.me/" + wnum + "?text=" + encodeURIComponent(lineas.join("\n"));
  cerrarModalReserva();
  window.open(url, "_blank", "noopener");
  toastReserva("¡Solicitud lista! Se abrirá WhatsApp para enviarla.");
  document.getElementById("mrForm").reset();
  document.getElementById("mrHuespedes").value = "2";
}
function toastReserva(msg){
  let t = document.getElementById("toastReserva");
  if(!t){
    t = document.createElement("div");
    t.id = "toastReserva";
    t.className = "toast-reserva";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(t._to);
  t._to = setTimeout(()=>t.classList.remove("on"), 4500);
}
/* Delegación global: funciona aunque las fichas se re-rendericen */
document.addEventListener("click", e=>{
  const b = e.target.closest ? e.target.closest("[data-reserva]") : null;
  if(b) abrirModalReserva(b.getAttribute("data-titulo") || "");
});
document.addEventListener("keydown", e=>{
  if(e.key === "Escape"){
    const m = document.getElementById("modalReserva");
    if(m && m.classList.contains("on")) cerrarModalReserva();
  }
});

/* ---------- Indicador de conexión con el CMS ---------- */
function pintarConn(ok){
  const d=document.getElementById("connDot"), t=document.getElementById("connText");
  if(!d||!t) return;
  d.className="conn-dot"+(ok?" conn-green":"");
  t.textContent=ok?"Conectado":"Sin conexión";
  const b=document.getElementById("connBadge");
  if(b) b.title=ok?"Conexión con el servidor establecida":"Sin conexión con el servidor";
}
async function chequearConn(){
  const url=(window.CZ_CONFIG||{}).CMS_URL||"";
  if(!url){ pintarConn(false); return; }
  try{
    const ctl=new AbortController();
    const to=setTimeout(()=>ctl.abort(),15000);
    const r=await fetch(url,{method:"POST",body:JSON.stringify({action:"getComments",pagina:"__ping__"}),signal:ctl.signal});
    clearTimeout(to);
    const j=await r.json();
    pintarConn(!!(j&&j.ok));
  }catch(e){ pintarConn(false); }
}
})();
