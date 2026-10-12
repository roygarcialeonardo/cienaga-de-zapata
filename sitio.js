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
      (res.length ? `<div class="cont-grid">`+res.map(p=>{
        const href = p.id==="s-anuncia" ? "publicar.html"
          : p.pagina==="servicios" ? "detalle.html?id="+encodeURIComponent(p.id) : esc(p.pagina)+".html#"+esc(p.id);
        return `<a class="cont-card" href="${href}">
          <div class="cont-img">${p.categoria?`<span class="cont-badge">${esc(p.categoria)}</span>`:""}<img src="${esc(p.imagen)}" alt="${esc(p.alt||p.titulo)}" loading="lazy"><span class="cont-seccion">${esc(nombrePag(p.pagina))}</span></div>
          <div class="cont-body"><h3>${esc(p.titulo)}</h3>
          <p class="cont-extracto">${esc(extracto(p, 120))}</p>
          <span class="cont-ver">Ver →</span></div></a>`;
      }).join("")+`</div>` : "");
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
  /* Tarjeta especial: enlaza al formulario de auto-registro */
  if(p.id === "s-anuncia"){
    return `<article class="srv-card srv-anuncia" data-srv="${esc(p.id)}">${toolsHTML(p, admin)}
    <div class="srv-img"><img src="${esc(p.imagen)}" alt="${esc(p.alt||p.titulo)}" loading="lazy"></div>
    <div class="srv-body"><h3>${esc(p.titulo)}</h3>
    <p class="srv-extracto">${esc(extracto(p, 140))}</p>
    <div class="srv-cta"><a class="btn btn-sol" href="publicar.html">📢 Anunciar mi negocio</a></div></div></article>`;
  }
  const wapp = srvWhats(p, "srv-btnw", "💬");
  const resBtn = `<button type="button" class="srv-btnr" data-reserva="${esc(p.id)}" data-titulo="${esc(p.titulo)}" data-categoria="${esc(p.categoria||"")}" title="Solicitar reserva">📅 Reservar</button>`;
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
      /* Deep link antiguo: ahora el detalle vive en detalle.html */
      if(srvPosts.some(p=>String(p.id)===id)) location.replace("detalle.html?id="+encodeURIComponent(id));
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

/* ---------- Página de detalle (detalle.html?id=...) ----------
   El detalle de cada negocio vive aquí: migas, galería, descripción,
   tarjeta de reserva (solo servicios) y relacionados. */
let detalleTitulo = "";
let detalleHabAplica = false;

/* Icono por palabra clave para las amenidades */
function iconoAmen(s){
  const t = String(s||"").toLowerCase();
  if(/piscina/.test(t)) return "🌊";
  if(/wifi|wi-fi|internet/.test(t)) return "📶";
  if(/aire|clima/.test(t)) return "❄️";
  if(/barbacoa|parrilla/.test(t)) return "🍖";
  if(/jacuzzi/.test(t)) return "🛁";
  if(/aparc|parqueo|estacion/.test(t)) return "🅿️";
  if(/jard[ií]n|patio/.test(t)) return "🌴";
  if(/lavadora/.test(t)) return "🧺";
  if(/nevera|refriger/.test(t)) return "🧊";
  if(/cocina/.test(t)) return "🍳";
  if(/\btv\b|tele/.test(t)) return "📺";
  if(/agua caliente|ducha caliente/.test(t)) return "🚿";
  return "✅";
}

/* Fila de datos básicos estilo Holidu: 👥 4 Personas · 🛏️ 2 Dormitorios · … */
function basicosHTML(p){
  const b = p.basicos || {};
  const items = [];
  const num = v => { const n = parseFloat(String(v).replace(",",".")); return isNaN(n) ? String(v) : n; };
  if(b.personas) items.push("👥 " + esc(num(b.personas)) + " Persona" + (num(b.personas)==1?"":"s"));
  if(b.dormitorios) items.push("🛏️ " + esc(num(b.dormitorios)) + " Dormitorio" + (num(b.dormitorios)==1?"":"s"));
  if(b.banos) items.push("🛁 " + esc(num(b.banos)) + " Baño" + (num(b.banos)==1?"":"s"));
  if(b.m2) items.push("📐 " + esc(num(b.m2)) + " m²");
  if(b.tipo) items.push("🏠 " + esc(b.tipo));
  return items.length ? '<div class="dt-basicos">' + items.join('<span class="dt-sep">·</span>') + "</div>" : "";
}

/* Aspectos destacados: hasta 3 tarjetas */
function destacadosHTML(p){
  const dest = (p.destacados||[]).filter(d=>d && (d.t || d.d)).slice(0, 3);
  if(!dest.length) return "";
  return '<section class="dt-dest"><h2>Aspectos destacados</h2><div class="dt-dest-grid">'
    + dest.map(d=>'<div class="dt-dest-card"><span class="dt-dest-ico">✨</span><div><b>'
      + esc(d.t||"") + "</b><p>" + esc(d.d||"") + "</p></div></div>").join("")
    + "</div></section>";
}

/* Amenidades: cuadrícula "Acerca de la propiedad" + botón para ver todas */
function amenidadesHTML(p){
  const amens = (p.amenidades||[]).map(a=>String(a).trim()).filter(Boolean);
  if(!amens.length) return "";
  const items = amens.map((a,i)=>'<div class="dt-amen-item' + (i>=8 ? " dt-oculto" : "") + '"><span class="dt-amen-ico">'
    + iconoAmen(a) + "</span>" + esc(a) + "</div>").join("");
  const mas = amens.length > 8
    ? '<button type="button" class="btn btn-ghost dt-amen-mas" id="dtAmenMas">Mostrar los ' + amens.length + " servicios</button>"
    : "";
  return '<section class="dt-amen"><h2>Acerca de la propiedad</h2><div class="dt-amen-grid" id="dtAmenGrid">'
    + items + "</div>" + mas + "</section>";
}

/* Distribución de dormitorios */
function dormitoriosHTML(p){
  const dorms = (p.dormitorios||[]).filter(d=>d && (d.nombre || d.detalle));
  if(!dorms.length) return "";
  return '<section class="dt-dorms"><h2>Distribución de dormitorios</h2><div class="dt-dorms-grid">'
    + dorms.map(d=>'<div class="dt-dorm-card"><span class="dt-dorm-ico">🛏️</span><b>'
      + esc(d.nombre||"Dormitorio") + "</b><p>" + esc(d.detalle||"") + "</p></div>").join("")
    + "</div></section>";
}

async function renderDetalle(){
  const cont = document.getElementById("detalle");
  if(!cont || typeof DETALLE === "undefined") return;
  const id = new URLSearchParams(location.search).get("id");
  let posts;
  try{ posts = await getPosts(); }
  catch(e){
    cont.innerHTML = "<p class='dt-error'>No se pudo cargar el anuncio. Revisa tu conexión e intenta de nuevo.</p>";
    return;
  }
  const p = posts.find(x=>String(x.id)===String(id));
  if(!p){
    document.title = "Anuncio no encontrado | Ciénaga de Zapata";
    cont.innerHTML = '<div class="dt-nofound"><h2>😕 No encontramos este anuncio</h2>'
      + '<p>Es posible que haya sido eliminado o que el enlace esté incompleto.</p>'
      + '<p><a class="btn btn-sol" href="index.html">Volver al inicio</a> '
      + '<a class="btn btn-ghost" href="servicios.html">Ver servicios</a></p></div>';
    return;
  }
  detalleTitulo = p.titulo;
  document.title = p.titulo + " | Ciénaga de Zapata";
  const md = document.querySelector('meta[name="description"]');
  if(md) md.setAttribute("content", extracto(p, 150));
  const esServicio = p.pagina === "servicios";
  const seccionHref = esServicio ? "servicios.html" : esc(p.pagina) + ".html";
  const zona = datoDe(p, /^ubicaci[óo]n$/i);
  const paras = cuerpoArr(p).map(t=>`<p>${esc(t)}</p>`).join("");
  const datos = (p.datos||[]).map(d=>`<li><b>${esc(d[0])}:</b> ${esc(d[1])}</li>`).join("");
  const wapp = esServicio ? srvWhats(p, "btn-wapp dt-wapp", "💬 WhatsApp") : "";
  const habAplica = esServicio && p.categoria === "Hospedaje";
  detalleHabAplica = habAplica;
  /* Secciones estilo Holidu (solo se muestran si el post trae los datos) */
  const secBasicos = esServicio ? basicosHTML(p) : "";
  const secDestacados = esServicio ? destacadosHTML(p) : "";
  const textoTotal = cuerpoArr(p).join("\n").length;
  const descLarga = textoTotal > 450;
  const descHTML = '<div class="dt-desc' + (descLarga ? " dt-cortada" : "") + '" id="dtDesc">' + paras + "</div>"
    + (descLarga ? '<button type="button" class="dt-vermas" id="dtVerMas">Ver más ⌄</button>' : "");
  const secAmen = esServicio ? amenidadesHTML(p) : "";
  const secDorms = esServicio ? dormitoriosHTML(p) : "";
  const reservaCard = esServicio ?
  '<aside class="dt-reserva" aria-label="Solicitar reserva">'
  + '<h3>📅 Solicitar reserva</h3>'
  + '<p class="dt-reserva-sub">Completa tus datos y la solicitud llegará por WhatsApp.</p>'
  + '<form id="dtForm" novalidate>'
  + '<label>Nombre *<input type="text" id="dtNombre" autocomplete="name"></label>'
  + '<label>WhatsApp o email *<input type="text" id="dtContacto" autocomplete="tel"></label>'
  + '<div class="dt-dos" id="dtFechas"' + (habAplica?"":" hidden") + '>'
  + '<label>Llegada *<input type="date" id="dtLlegada"></label>'
  + '<label>Salida *<input type="date" id="dtSalida"></label>'
  + '</div>'
  + '<label id="dtDiaWrap"' + (habAplica?" hidden":"") + '>Día *<input type="date" id="dtDia"></label>'
  + viajerosHTML("dt")
  + (habAplica ? habHTML("dt", true) : "")
  + '<label>Mensaje (opcional)<textarea id="dtMensaje" rows="3" placeholder="Alguna petición especial…"></textarea></label>'
  + '<p class="error" id="dtError" hidden></p>'
  + '<button type="submit" class="btn btn-sol dt-enviar">📩 Enviar por WhatsApp</button>'
  + '</form>' + wapp + '</aside>' : "";
  /* Relacionados: misma categoría (servicios) o misma página (contenido), hasta 4 */
  const rel = posts.filter(x=>String(x.id)!==String(p.id) &&
    (esServicio ? (x.pagina==="servicios" && x.categoria===p.categoria) : (x.pagina===p.pagina))).slice(0, 4);
  cont.innerHTML =
  '<nav class="dt-migas" aria-label="Migas"><a href="index.html">Inicio</a> › <a href="'+seccionHref+'">'+esc(nombrePag(p.pagina))+'</a> › <span>'+esc(p.titulo)+'</span></nav>'
  + '<h1 class="dt-titulo">'+esc(p.titulo)+'</h1>'
  + '<p class="dt-meta">'
  + (p.categoria?'<span class="srv-badge srv-badge-static">'+esc(p.categoria)+'</span>':"")
  + (zona?'<span class="dt-zona">📍 '+esc(zona)+'</span>':"") + '</p>'
  + '<div class="dt-galeria" data-fotos="1">'
  + '<figure class="dt-foto"><img src="'+esc(p.imagen)+'" alt="'+esc(p.alt||p.titulo)+'"></figure>'
  + '<!-- futuro: más <figure class="dt-foto"> aquí para galería múltiple -->'
  + '</div>'
  + secBasicos + secDestacados
  + '<div class="dt-cols"><div class="dt-main">' + descHTML
  + (datos?'<ul class="dt-datos">'+datos+'</ul>':"")
  + secAmen + secDorms
  + '</div>' + (esServicio?'<div class="dt-side">'+reservaCard+'</div>':"") + '</div>'
  + (rel.length?'<section class="dt-rel"><h2>También te puede interesar</h2><div class="srv-grid">'
    + rel.map(x=>esServicio?tarjetaServicio(x,false):tarjetaContenido(x,false)).join("")
    + '</div></section>':"");
  if(esServicio){
    const f = document.getElementById("dtForm");
    if(f) f.addEventListener("submit", enviarReservaDetalle);
  }else{
    contPosts = rel; /* para que el modal de contenido funcione en los relacionados */
    if(window.CZAdmin) window.CZAdmin.bindTools(cont);
  }
  /* "Ver más" de la descripción */
  const vm = document.getElementById("dtVerMas");
  if(vm) vm.addEventListener("click", ()=>{
    const d = document.getElementById("dtDesc");
    const abierto = d.classList.toggle("dt-abierta");
    vm.textContent = abierto ? "Ver menos ⌃" : "Ver más ⌄";
  });
  /* "Mostrar los N servicios" de amenidades */
  const am = document.getElementById("dtAmenMas");
  if(am) am.addEventListener("click", ()=>{
    document.querySelectorAll("#dtAmenGrid .dt-oculto").forEach(x=>x.classList.remove("dt-oculto"));
    am.hidden = true;
  });
}

/* Validación y URL de WhatsApp compartidas por el modal y el formulario del detalle */
function validarReserva(v){
  if(!v.nombre) return {error:"Escribe tu nombre."};
  if(!v.contacto) return {error:"Escribe tu WhatsApp o email para contactarte."};
  if(v.hospedaje){
    if(!v.llegada || !v.salida) return {error:"Elige las fechas de llegada y salida."};
    if(v.llegada >= v.salida) return {error:"La fecha de salida debe ser posterior a la de llegada."};
  }else{
    if(!v.dia) return {error:"Elige el día."};
  }
  if(!(v.ad >= 1)) return {error:"Debe viajar al menos 1 adulto."};
  return {ok:true};
}
function reservaWAUrl(titulo, v){
  const wnum = String((window.CZ_CONFIG||{}).WHATSAPP_CONTACTO||"").replace(/\D/g,"");
  if(!wnum) return "";
  const nViaj = (v.ad||0) + (v.nn||0);
  const lineas = [
    "Hola, quiero solicitar una reserva:",
    "— Negocio: " + titulo,
    "— Nombre: " + v.nombre,
    "— Contacto: " + v.contacto
  ];
  if(v.hospedaje){
    lineas.push("— Llegada: " + fechaCorta(v.llegada));
    lineas.push("— Salida: " + fechaCorta(v.salida));
  }else{
    lineas.push("— Día: " + fechaCorta(v.dia));
  }
  lineas.push("— Viajeros: " + nViaj + " (Adultos: " + (v.ad||0) + ", Niños: " + (v.nn||0) + ", Bebés: " + (v.bb||0) + ", Mascotas: " + (v.mc||0) + ")");
  if(v.hab != null) lineas.push("— Habitaciones: " + v.hab);
  if(v.mensaje) lineas.push("— Mensaje: " + v.mensaje);
  return "https://wa.me/" + wnum + "?text=" + encodeURIComponent(lineas.join("\n"));
}
function enviarReservaDetalle(e){
  e.preventDefault();
  const err = document.getElementById("dtError");
  const vjEl = document.querySelector("#dtForm .vj");
  const vals = {
    nombre: document.getElementById("dtNombre").value.trim(),
    contacto: document.getElementById("dtContacto").value.trim(),
    llegada: document.getElementById("dtLlegada").value,
    salida: document.getElementById("dtSalida").value,
    dia: document.getElementById("dtDia").value,
    hospedaje: detalleHabAplica,
    ad: vjInt(vjEl,"ad"), nn: vjInt(vjEl,"nn"), bb: vjInt(vjEl,"bb"), mc: vjInt(vjEl,"mc"),
    hab: detalleHabAplica ? habNum("dt") : null,
    mensaje: document.getElementById("dtMensaje").value.trim()
  };
  const r = validarReserva(vals);
  if(r.error){ err.textContent = r.error; err.hidden = false; return; }
  err.hidden = true;
  const url = reservaWAUrl(detalleTitulo, vals);
  if(!url){ err.textContent = "No se pudo determinar el contacto. Intenta más tarde."; err.hidden = false; return; }
  window.open(url, "_blank", "noopener");
  toastReserva("¡Solicitud lista! Se abrirá WhatsApp para enviarla.");
  document.getElementById("dtForm").reset();
  vjReset(document.getElementById("dtForm"));
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
  if(card && !e.target.closest("[data-reserva],.srv-btnw,.tool-btn")){
    const id = card.getAttribute("data-srv");
    /* La tarjeta "Anuncia tu negocio" lleva al formulario de registro */
    location.href = (id === "s-anuncia") ? "publicar.html" : "detalle.html?id=" + encodeURIComponent(id);
  }
});
/* El modal de detalle antiguo de Servicios se eliminó: el detalle ahora vive en detalle.html */

/* Home: novedades (últimas N de todas las páginas) */
async function renderNovedades(){
  const cont = document.getElementById("novedades");
  if(!cont) return;
  try{
    const posts = await getPosts();
    const ult = posts.slice().sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))).slice(0,4);
    cont.innerHTML = ult.map(p=>{
      const href = p.pagina==="servicios" ? "detalle.html?id="+encodeURIComponent(p.id) : esc(p.pagina)+".html#"+esc(p.id);
      return `
      <article class="card rv vis">
        <div class="ph"><img src="${esc(p.imagen)}" alt="${esc(p.alt||p.titulo)}" loading="lazy"><span class="tag">${esc(nombrePag(p.pagina))}</span></div>
        <div class="body"><h3>${esc(p.titulo)}</h3>
        <p>${esc((cuerpoArr(p)[0]||"").slice(0,140))}…</p>
        <a class="ver-mas" href="${href}">Leer más →</a></div>
      </article>`;
    }).join("");
  }catch(e){ cont.innerHTML = ""; }
}

function nombrePag(p){
  return {"lugares":"Lugares","secretos":"Secretos","fauna-flora":"Fauna","actividades":"Actividades",
          "historia":"Historia","gastronomia":"Gastronomía","guia":"Guía","servicios":"Servicios"}[p]||p;
}

document.addEventListener("DOMContentLoaded", ()=>{ renderPagina(); renderNovedades(); renderDetalle(); chequearConn(); montarModalReserva(); montarModalDetalleCont(); initBuscadorHome(); });

/* ---------- Bloque de viajeros estilo Airbnb (compartido por el modal y el detalle) ----------
   Viajeros: Adultos / Niños / Bebés / Mascotas con steppers. Habitaciones solo en Hospedaje. */
function vjFila(nombre, sub, key, val, min){
  return '<div class="vj-fila"><div><b>'+nombre+'</b>'+(sub?'<span>'+sub+'</span>':"")+'</div>'
  + '<div class="vj-step"><button type="button" class="vj-btn" data-vj="menos" data-key="'+key+'" aria-label="Menos"'+(val<=min?" disabled":"")+'>−</button>'
  + '<span class="vj-num" data-num="'+key+'">'+val+'</span>'
  + '<button type="button" class="vj-btn" data-vj="mas" data-key="'+key+'" aria-label="Más">+</button></div></div>';
}
function viajerosHTML(pref){
  return '<div class="vj" data-ad="1" data-nn="0" data-bb="0" data-mc="0">'
  + '<button type="button" class="vj-cab" id="'+pref+'VjCab" aria-expanded="false">'
  + '<span class="vj-cab-t">Viajeros</span>'
  + '<span class="vj-cab-n" id="'+pref+'VjN">1 viajero</span>'
  + '<span class="vj-flecha">⌄</span></button>'
  + '<div class="vj-panel" id="'+pref+'VjPanel" hidden>'
  + vjFila("Adultos","A partir de 13 años","ad",1,0)
  + vjFila("Niños","De 2 a 12 años","nn",0,0)
  + vjFila("Bebés","Menos de 2 años","bb",0,0)
  + vjFila("Mascotas","","mc",0,0)
  + '</div></div>';
}
function habHTML(pref, visible){
  return '<div class="vj-hab" id="'+pref+'HabWrap"'+(visible?"":" hidden")+'>'
  + '<div class="vj-fila"><div><b>Habitaciones</b><span>¿Cuántas habitaciones necesitas?</span></div>'
  + '<div class="vj-step"><button type="button" class="vj-btn" data-hab="menos" aria-label="Menos habitaciones" disabled>−</button>'
  + '<span class="vj-num" id="'+pref+'HabN">1</span>'
  + '<button type="button" class="vj-btn" data-hab="mas" aria-label="Más habitaciones">+</button></div></div></div>';
}
function vjPintar(vj){
  const vals = {ad:parseInt(vj.getAttribute("data-ad"),10)||0, nn:parseInt(vj.getAttribute("data-nn"),10)||0,
                bb:parseInt(vj.getAttribute("data-bb"),10)||0, mc:parseInt(vj.getAttribute("data-mc"),10)||0};
  ["ad","nn","bb","mc"].forEach(k=>{
    const num = vj.querySelector('[data-num="'+k+'"]');
    if(num) num.textContent = vals[k];
    const menos = vj.querySelector('[data-vj="menos"][data-key="'+k+'"]');
    if(menos) menos.disabled = vals[k] <= 0;
  });
  const t = vals.ad + vals.nn;
  const cab = vj.querySelector(".vj-cab-n");
  if(cab) cab.textContent = t + (t===1 ? " viajero" : " viajeros");
}
function vjInt(vj, k){ return vj ? (parseInt(vj.getAttribute("data-"+k),10)||0) : 0; }
function habNum(pref){ const el = document.getElementById(pref+"HabN"); return el ? (parseInt(el.textContent,10)||1) : 1; }
function vjReset(scope){
  const vj = scope.querySelector(".vj");
  if(vj){
    vj.setAttribute("data-ad","1"); vj.setAttribute("data-nn","0");
    vj.setAttribute("data-bb","0"); vj.setAttribute("data-mc","0");
    const panel = vj.querySelector(".vj-panel"); if(panel) panel.hidden = true;
    const cab = vj.querySelector(".vj-cab"); if(cab) cab.setAttribute("aria-expanded","false");
    vjPintar(vj);
  }
  const hab = scope.querySelector(".vj-hab");
  if(hab){
    const num = hab.querySelector(".vj-num"); if(num) num.textContent = "1";
    const menos = hab.querySelector('[data-hab="menos"]'); if(menos) menos.disabled = true;
    const mas = hab.querySelector('[data-hab="mas"]'); if(mas) mas.disabled = false;
  }
}
/* Delegación global de los steppers: funciona en el modal y en el detalle */
document.addEventListener("click", e=>{
  if(!e.target.closest) return;
  const b = e.target.closest("[data-vj]");
  if(b){
    const vj = b.closest(".vj"); if(!vj) return;
    const key = b.getAttribute("data-key");
    let val = parseInt(vj.getAttribute("data-"+key),10)||0;
    val += (b.getAttribute("data-vj")==="mas") ? 1 : -1;
    if(val < 0) val = 0;
    if(val > 30) val = 30;
    vj.setAttribute("data-"+key, val);
    vjPintar(vj);
    return;
  }
  const hb = e.target.closest("[data-hab]");
  if(hb){
    const wrap = hb.closest(".vj-hab"); if(!wrap) return;
    const num = wrap.querySelector(".vj-num"); if(!num) return;
    let v = parseInt(num.textContent,10)||1;
    v += (hb.getAttribute("data-hab")==="mas") ? 1 : -1;
    v = Math.max(1, Math.min(10, v));
    num.textContent = v;
    const menos = wrap.querySelector('[data-hab="menos"]'); if(menos) menos.disabled = v<=1;
    const mas = wrap.querySelector('[data-hab="mas"]'); if(mas) mas.disabled = v>=10;
    return;
  }
  const cab = e.target.closest(".vj-cab");
  if(cab){
    const panel = cab.parentElement.querySelector(".vj-panel");
    if(panel){
      const abrir = panel.hidden;
      panel.hidden = !abrir;
      cab.setAttribute("aria-expanded", String(abrir));
    }
  }
});

/* ---------- Solicitud de reserva (fichas de Servicios) ----------
   Sin calendarios ni pagos: el formulario arma el mensaje y lo envía
   al WhatsApp de Leonardo, que confirma manualmente con el negocio. */
let reservaTitulo = "";
let reservaHab = false;
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
      '<div class="mr-dos" id="mrFechas">' +
        '<label>Llegada *<input type="date" id="mrLlegada" required></label>' +
        '<label>Salida *<input type="date" id="mrSalida" required></label>' +
      '</div>' +
      '<label id="mrDiaWrap" hidden>Día *<input type="date" id="mrDia"></label>' +
      viajerosHTML("mr") +
      habHTML("mr", false) +
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
function abrirModalReserva(titulo, categoria){
  reservaTitulo = titulo;
  reservaHab = (categoria === "Hospedaje");
  const hw = document.getElementById("mrHabWrap");
  if(hw) hw.hidden = !reservaHab;
  const mf = document.getElementById("mrFechas");
  if(mf) mf.hidden = !reservaHab;
  const md = document.getElementById("mrDiaWrap");
  if(md) md.hidden = reservaHab;
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
  const vjEl = document.querySelector("#mrForm .vj");
  const vals = {
    nombre: document.getElementById("mrNombre").value.trim(),
    contacto: document.getElementById("mrContacto").value.trim(),
    llegada: document.getElementById("mrLlegada").value,
    salida: document.getElementById("mrSalida").value,
    dia: document.getElementById("mrDia").value,
    hospedaje: reservaHab,
    ad: vjInt(vjEl,"ad"), nn: vjInt(vjEl,"nn"), bb: vjInt(vjEl,"bb"), mc: vjInt(vjEl,"mc"),
    hab: reservaHab ? habNum("mr") : null,
    mensaje: document.getElementById("mrMensaje").value.trim()
  };
  const r = validarReserva(vals);
  if(r.error){ err.textContent = r.error; err.hidden = false; return; }
  err.hidden = true;
  const url = reservaWAUrl(reservaTitulo, vals);
  if(!url){ err.textContent = "No se pudo determinar el contacto. Intenta más tarde."; err.hidden = false; return; }
  cerrarModalReserva();
  window.open(url, "_blank", "noopener");
  toastReserva("¡Solicitud lista! Se abrirá WhatsApp para enviarla.");
  document.getElementById("mrForm").reset();
  vjReset(document.getElementById("mrForm"));
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
  if(b) abrirModalReserva(b.getAttribute("data-titulo") || "", b.getAttribute("data-categoria") || "");
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

/* ---------- PWA: registro del Service Worker ---------- */
(function(){
  if(!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').catch(function(){ /* sin conexión o sin soporte: el sitio sigue funcionando */ });
  });
})();
