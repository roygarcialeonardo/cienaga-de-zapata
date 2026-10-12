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

function cuerpoArr(p){ return Array.isArray(p.cuerpo) ? p.cuerpo : (p.cuerpo ? [p.cuerpo] : []); }
function datoDe(p, re){
  const d = (p.datos||[]).find(x=>re.test(String(x[0]||"").trim()));
  return d ? String(d[1]) : "";
}
function extracto(p, n){
  const primer = cuerpoArr(p)[0] || "";
  return primer.length > n ? primer.slice(0, n)+"…" : primer;
}
function toolsHTML(p, admin){
  return admin
    ? `<div class="admin-tools"><button class="tool-btn" data-edit="${p.id}">✏️ Editar</button><button class="tool-btn del" data-del="${p.id}">🗑️</button></div>` : "";
}

/* Página de detalle: PAGINA definida antes del script */
async function renderPagina(){
  const cont = document.getElementById("fichas");
  if(!cont || typeof PAGINA === "undefined") return;
  if(PAGINA==="servicios"){ renderServicios(); return; }
  renderContenido();
}

/* ---------- Páginas de contenido: cuadrícula de tarjetas + modal de detalle ---------- */
let contPosts = [];

function tarjetaContenido(p, admin){
  return `<article class="cont-card" data-cont="${esc(p.id)}">${toolsHTML(p, admin)}
    <div class="cont-img">${p.categoria?`<span class="cont-badge">${esc(p.categoria)}</span>`:""}<img src="${esc(p.imagen)}" alt="${esc(p.alt||p.titulo)}" loading="lazy"></div>
    <div class="cont-body"><h3>${esc(p.titulo)}</h3>
    <p class="cont-extracto">${esc(extracto(p, 140))}</p>
    <span class="cont-ver">Ver más →</span></div></article>`;
}

function renderContenido(){
  const cont = document.getElementById("fichas");
  if(!cont) return;
  getPosts().then(posts=>{
    contPosts = posts.filter(p=>p.pagina===PAGINA);
    const toc = document.querySelector(".toc");
    if(toc) toc.style.display = "none";
    const admin = document.body.classList.contains("admin");
    cont.className = "cont-grid";
    cont.innerHTML = contPosts.length
      ? contPosts.map(p=>tarjetaContenido(p, admin)).join("")
      : `<p style="opacity:.7;padding:2rem .5rem">Aún no hay publicaciones en esta sección.</p>`;
    if(window.CZAdmin) window.CZAdmin.bindTools(cont);
    if(location.hash){
      const id = location.hash.slice(1);
      if(contPosts.some(p=>String(p.id)===id)) setTimeout(()=>abrirDetalleCont(id), 300);
    }
  }).catch(e=>{
    cont.innerHTML = "<p style='opacity:.7'>No se pudo cargar el contenido. Revisa tu conexión e intenta de nuevo.</p>";
  });
}

/* Modal de detalle para páginas de contenido */
function montarModalDetalleCont(){
  if(document.getElementById("modalDetalleCont")) return;
  const v = document.createElement("div");
  v.id = "modalDetalleCont";
  v.className = "cont-detalle";
  v.innerHTML =
  '<div class="cd-caja" role="dialog" aria-modal="true">' +
    '<button type="button" class="cd-x" id="cdCerrar" aria-label="Cerrar">✕</button>' +
    '<div id="cdCont"></div>' +
  '</div>';
  document.body.appendChild(v);
  v.addEventListener("click", e=>{ if(e.target===v) cerrarDetalleCont(); });
  document.getElementById("cdCerrar").addEventListener("click", cerrarDetalleCont);
}
function abrirDetalleCont(id){
  const p = contPosts.find(x=>String(x.id)===String(id));
  if(!p) return;
  const paras = cuerpoArr(p).map(t=>`<p>${esc(t)}</p>`).join("");
  const datos = (p.datos||[]).map(d=>`<li><b>${esc(d[0])}:</b> ${esc(d[1])}</li>`).join("");
  document.getElementById("cdCont").innerHTML =
    `<div class="cd-foto"><img src="${esc(p.imagen)}" alt="${esc(p.alt||p.titulo)}"></div>
     <div class="cd-cuerpo"><h3>${esc(p.titulo)}</h3>
     ${p.categoria?`<span class="cont-badge srv-badge-static">${esc(p.categoria)}</span>`:""}
     ${paras}${datos?`<ul class="cd-datos">${datos}</ul>`:""}</div>`;
  document.getElementById("modalDetalleCont").classList.add("on");
  document.body.style.overflow = "hidden";
}
function cerrarDetalleCont(){
  const m = document.getElementById("modalDetalleCont");
  if(m) m.classList.remove("on");
  const r = document.getElementById("modalReserva");
  const s = document.getElementById("modalDetalleSrv");
  if((!r || !r.classList.contains("on")) && (!s || !s.classList.contains("on")))
    document.body.style.overflow = "";
}
document.addEventListener("click", e=>{
  if(!e.target.closest) return;
  const card = e.target.closest(".cont-card[data-cont]");
  if(card && !e.target.closest(".tool-btn")) abrirDetalleCont(card.getAttribute("data-cont"));
});
document.addEventListener("keydown", e=>{
  if(e.key !== "Escape") return;
  const m = document.getElementById("modalDetalleCont");
  if(m && m.classList.contains("on")) cerrarDetalleCont();
});

/* ---------- Buscador de la home ---------- */
let homeTimer = null;
function initBuscadorHome(){
  const input = document.getElementById("homeBuscar");
  const box = document.getElementById("homeResultados");
  if(!input || !box) return;
  const btn = document.getElementById("homeBuscarBtn");
  const lanzar = ()=>buscarHome(input.value.trim(), box);
  input.addEventListener("input", ()=>{ clearTimeout(homeTimer); homeTimer = setTimeout(lanzar, 350); });
  input.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); clearTimeout(homeTimer); lanzar(); } });
  if(btn) btn.addEventListener("click", ()=>{ clearTimeout(homeTimer); lanzar(); });
  document.querySelectorAll(".home-hints button").forEach(b=>b.addEventListener("click", ()=>{
    input.value = b.textContent.trim(); lanzar();
    document.getElementById("inicio").scrollIntoView({behavior:"smooth"});
  }));
}
function buscarHome(q, box){
  if(q.length < 2){ box.innerHTML = ""; return; }
  const ql = q.toLowerCase();
  getPosts().then(posts=>{
    const res = posts.filter(p=>{
      const hay = (p.titulo+" "+cuerpoArr(p).join(" ")+" "+(p.datos||[]).map(d=>String(d[0])+" "+String(d[1])).join(" ")).toLowerCase();
      return hay.includes(ql);
    }).slice(0, 12);
    box.innerHTML =
      `<p class="home-count">${res.length ? res.length+(res.length===1?" resultado":" resultados")+" para «"+esc(q)+"»" : "Sin resultados para «"+esc(q)+"». Prueba con otra palabra."}</p>` +
      (res.length ? `<div class="cont-grid">`+res.map(p=>
        `<a class="cont-card" href="${esc(p.pagina)}.html#${esc(p.id)}">
          <div class="cont-img">${p.categoria?`<span class="cont-badge">${esc(p.categoria)}</span>`:""}<img src="${esc(p.imagen)}" alt="${esc(p.alt||p.titulo)}" loading="lazy"><span class="cont-seccion">${esc(nombrePag(p.pagina))}</span></div>
          <div class="cont-body"><h3>${esc(p.titulo)}</h3>
          <p class="cont-extracto">${esc(extracto(p, 120))}</p>
          <span class="cont-ver">Ver →</span></div></a>`
      ).join("")+`</div>` : "");
    const y = box.getBoundingClientRect().top + scrollY - 120;
    scrollTo({top:y, behavior:"smooth"});
  }).catch(e=>{
    box.innerHTML = "<p style='opacity:.7'>No se pudo buscar. Revisa tu conexión.</p>";
  });
}

/* ---------- Servicios: cuadrícula tipo Airbnb ----------
   Tarjetas compactas con búsqueda, píldoras de categoría y modal de detalle.
   Reutiliza el modal de reserva existente (data-reserva / data-titulo). */
let srvPosts = [];
let srvCat = "Todos";
let srvBuscarBound = false;

function srvWhats(p, clase, etiqueta){
  const wnum = String((window.CZ_CONFIG||{}).WHATSAPP_CONTACTO||"").replace(/\D/g,"");
  if(!wnum) return "";
  const txt = encodeURIComponent("Hola, vi el anuncio de «"+p.titulo+"» en la guía de la Ciénaga de Zapata y me interesa.");
  return `<a class="${clase}" href="https://wa.me/${wnum}?text=${txt}" target="_blank" rel="noopener" title="Contactar por WhatsApp">${etiqueta}</a>`;
}

function tarjetaServicio(p, admin){
  const wapp = srvWhats(p, "srv-btnw", "💬");
  const resBtn = `<button type="button" class="srv-btnr" data-reserva="${esc(p.id)}" data-titulo="${esc(p.titulo)}" title="Solicitar reserva">📅 Reservar</button>`;
  const zona = datoDe(p, /^ubicaci[óo]n$/i);
  const anfit = datoDe(p, /^anfitri[óo]n$/i);
  return `<article class="srv-card" data-srv="${esc(p.id)}">${toolsHTML(p, admin)}
    <div class="srv-img">${p.categoria?`<span class="srv-badge">${esc(p.categoria)}</span>`:""}<img src="${esc(p.imagen)}" alt="${esc(p.alt||p.titulo)}" loading="lazy"></div>
    <div class="srv-body"><h3>${esc(p.titulo)}</h3>
    ${zona?`<p class="srv-zona">📍 ${esc(zona)}</p>`:""}
    ${anfit?`<p class="srv-anfit">Anfitrión: ${esc(anfit)}</p>`:""}
    <p class="srv-extracto">${esc(extracto(p, 120))}</p>
    <div class="srv-cta">${wapp}${resBtn}</div></div></article>`;
}

function renderServicios(){
  const cont = document.getElementById("fichas");
  if(!cont) return;
  getPosts().then(posts=>{
    srvPosts = posts.filter(p=>p.pagina==="servicios");
    const toc = document.querySelector(".toc");
    if(toc) toc.style.display = "none";
    const cats = ["Todos"];
    srvPosts.forEach(p=>{ if(p.categoria && !cats.includes(p.categoria)) cats.push(p.categoria); });
    const pills = document.getElementById("srvPills");
    if(pills) pills.innerHTML = cats.map(c=>`<button type="button" class="srv-pill${c===srvCat?" on":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
    const busc = document.getElementById("srvBuscar");
    if(busc && !srvBuscarBound){ busc.addEventListener("input", aplicarFiltro); srvBuscarBound = true; }
    aplicarFiltro();
    if(location.hash){
      const id = location.hash.slice(1);
      if(srvPosts.some(p=>String(p.id)===id)) setTimeout(()=>abrirDetalleServicio(id), 300);
    }
  }).catch(e=>{
    cont.innerHTML = "<p style='opacity:.7'>No se pudo cargar el contenido. Revisa tu conexión e intenta de nuevo.</p>";
  });
}

function aplicarFiltro(){
  const cont = document.getElementById("fichas");
  if(!cont) return;
  const q = ((document.getElementById("srvBuscar")||{}).value||"").toLowerCase().trim();
  const admin = document.body.classList.contains("admin");
  const lista = srvPosts.filter(p=>{
    if(srvCat!=="Todos" && p.categoria!==srvCat) return false;
    if(!q) return true;
    const hay = (p.titulo+" "+cuerpoArr(p).join(" ")+" "+(p.datos||[]).map(d=>String(d[0])+" "+String(d[1])).join(" ")).toLowerCase();
    return hay.includes(q);
  });
  cont.className = "srv-grid";
  cont.innerHTML = lista.length
    ? lista.map(p=>tarjetaServicio(p, admin)).join("")
    : `<p style="opacity:.75;padding:2rem .5rem">No se encontraron negocios con ese criterio. Prueba con otra búsqueda o categoría.</p>`;
  const n = document.getElementById("srvCount");
  if(n) n.textContent = lista.length + (lista.length===1 ? " negocio" : " negocios");
  if(window.CZAdmin) window.CZAdmin.bindTools(cont);
}

/* Modal de detalle de Servicios (z-index 85: por debajo del modal de reserva, que usa 90) */
function montarModalDetalle(){
  if(document.getElementById("modalDetalleSrv")) return;
  const v = document.createElement("div");
  v.id = "modalDetalleSrv";
  v.className = "srv-detalle";
  v.innerHTML =
  '<div class="sd-caja" role="dialog" aria-modal="true">' +
    '<button type="button" class="sd-x" id="sdCerrar" aria-label="Cerrar">✕</button>' +
    '<div id="sdCont"></div>' +
  '</div>';
  document.body.appendChild(v);
  v.addEventListener("click", e=>{ if(e.target===v) cerrarDetalleServicio(); });
  document.getElementById("sdCerrar").addEventListener("click", cerrarDetalleServicio);
}
function abrirDetalleServicio(id){
  const p = srvPosts.find(x=>String(x.id)===String(id));
  if(!p) return;
  const paras = cuerpoArr(p).map(t=>`<p>${esc(t)}</p>`).join("");
  const datos = (p.datos||[]).map(d=>`<li><b>${esc(d[0])}:</b> ${esc(d[1])}</li>`).join("");
  const wapp = srvWhats(p, "btn-wapp", "💬 WhatsApp");
  const resBtn = `<button type="button" class="btn-reserva" data-reserva="${esc(p.id)}" data-titulo="${esc(p.titulo)}">📅 Solicitar reserva</button>`;
  document.getElementById("sdCont").innerHTML =
    `<div class="sd-foto"><img src="${esc(p.imagen)}" alt="${esc(p.alt||p.titulo)}"></div>
     <div class="sd-cuerpo"><h3>${esc(p.titulo)}</h3>
     ${p.categoria?`<span class="srv-badge srv-badge-static">${esc(p.categoria)}</span>`:""}
     ${paras}${datos?`<ul class="sd-datos">${datos}</ul>`:""}
     <div class="srv-cta">${wapp}${resBtn}</div></div>`;
  document.getElementById("modalDetalleSrv").classList.add("on");
  document.body.style.overflow = "hidden";
}
function cerrarDetalleServicio(){
  const m = document.getElementById("modalDetalleSrv");
  if(m) m.classList.remove("on");
  const r = document.getElementById("modalReserva");
  if(!r || !r.classList.contains("on")) document.body.style.overflow = "";
}

/* Clics: píldoras de categoría y apertura del detalle (fuera de botones) */
document.addEventListener("click", e=>{
  if(!e.target.closest) return;
  const pill = e.target.closest(".srv-pill");
  if(pill){
    srvCat = pill.getAttribute("data-cat") || "Todos";
    document.querySelectorAll(".srv-pill").forEach(b=>b.classList.toggle("on", b===pill));
    aplicarFiltro();
    return;
  }
  const card = e.target.closest(".srv-card");
  if(card && !e.target.closest("[data-reserva],.srv-btnw,.tool-btn"))
    abrirDetalleServicio(card.getAttribute("data-srv"));
});
document.addEventListener("keydown", e=>{
  if(e.key !== "Escape") return;
  const r = document.getElementById("modalReserva");
  if(r && r.classList.contains("on")) return; /* el otro handler la cierra */
  cerrarDetalleServicio();
});

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
        <p>${esc((cuerpoArr(p)[0]||"").slice(0,140))}…</p>
        <a class="ver-mas" href="${esc(p.pagina)}.html#${esc(p.id)}">Leer más →</a></div>
      </article>`).join("");
  }catch(e){ cont.innerHTML = ""; }
}

function nombrePag(p){
  return {"lugares":"Lugares","secretos":"Secretos","fauna-flora":"Fauna","actividades":"Actividades",
          "historia":"Historia","gastronomia":"Gastronomía","guia":"Guía","servicios":"Servicios"}[p]||p;
}

document.addEventListener("DOMContentLoaded", ()=>{ renderPagina(); renderNovedades(); chequearConn(); montarModalReserva(); montarModalDetalle(); montarModalDetalleCont(); initBuscadorHome(); });

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
