/* Ciénaga de Zapata · formulario de auto-registro de negocios (publicar.html)
   El dueño llena el formulario y la solicitud llega al WhatsApp de Leonardo,
   que la revisa y la publica desde el admin. */
(function(){
"use strict";

function $(id){ return document.getElementById(id); }
function val(id){ const el = $(id); return el ? el.value.trim() : ""; }

function wnum(){
  return String((window.CZ_CONFIG||{}).WHATSAPP_CONTACTO||"").replace(/\D/g,"");
}

/* ---------- Provincias y municipios (guía nacional) ---------- */
let CZ_PROVS = [];
async function cargarProvs(){
  try{
    const r = await fetch("provincias.json", {cache:"no-store"});
    CZ_PROVS = await r.json();
  }catch(e){ CZ_PROVS = []; }
  const sp = $("pubProvincia"), sm = $("pubMunicipio");
  CZ_PROVS.forEach(p=>{
    const o = document.createElement("option");
    o.value = p.slug; o.textContent = p.nombre;
    sp.appendChild(o);
  });
  sp.addEventListener("change", ()=>{
    const prov = CZ_PROVS.find(p=>p.slug===sp.value);
    sm.innerHTML = "";
    if(!prov){
      sm.disabled = true;
      sm.innerHTML = '<option value="">— Elige provincia primero —</option>';
      return;
    }
    sm.disabled = false;
    sm.innerHTML = '<option value="">— Elige —</option>';
    prov.municipios.forEach(m=>{
      const o = document.createElement("option");
      o.value = m.slug; o.textContent = m.nombre;
      sm.appendChild(o);
    });
  });
}
function provNombre(slug){
  const p = CZ_PROVS.find(p=>p.slug===slug);
  return p ? p.nombre : slug;
}
function munNombre(pslug, mslug){
  const p = CZ_PROVS.find(p=>p.slug===pslug);
  const m = p ? (p.municipios||[]).find(m=>m.slug===mslug) : null;
  return m ? m.nombre : mslug;
}

/* ---------- Secciones condicionales por categoría ---------- */
function toggleSecciones(){
  const cat = val("pubCategoria");
  const esHosp = (cat === "Hospedaje");
  $("secHospedaje").hidden = !esHosp;
  $("secNoHospedaje").hidden = !(cat && !esHosp);
}

/* ---------- Dormitorios dinámicos ---------- */
function addDorm(nombre, detalle){
  const box = $("pubDorms");
  const n = box.children.length + 1;
  const row = document.createElement("div");
  row.className = "pub-dorm-row";
  row.innerHTML =
    '<label>Nombre<input type="text" class="pub-dorm-nombre" placeholder="Dormitorio ' + n + '" value="' + escAttr(nombre||"") + '"></label>'
    + '<label>Detalle<input type="text" class="pub-dorm-detalle" placeholder="Ej: 2 camas dobles" value="' + escAttr(detalle||"") + '"></label>'
    + '<button type="button" class="pub-dorm-x" aria-label="Quitar">✕</button>';
  row.querySelector(".pub-dorm-x").addEventListener("click", ()=>row.remove());
  box.appendChild(row);
}
function escAttr(s){
  return String(s||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
}

/* ---------- Construcción del mensaje ---------- */
function armarMensaje(){
  const nombre = val("pubNombre"), cat = val("pubCategoria"), zona = val("pubZona"),
        resp = val("pubResponsable"), wsp = val("pubWhatsapp"),
        pslug = val("pubProvincia"), mslug = val("pubMunicipio");
  const L = [
    "📢 NUEVO NEGOCIO — Guía de Cuba",
    "— Nombre: " + nombre,
    "— Categoría: " + cat,
    "— Zona: " + zona,
    "— Provincia: " + provNombre(pslug) + " (" + pslug + ")",
    "— Municipio: " + munNombre(pslug, mslug) + " (" + mslug + ")",
    "— Responsable: " + resp,
    "— WhatsApp (verificación): " + wsp,
    ""
  ];
  if(cat === "Hospedaje"){
    const bas = [];
    if(val("pubPersonas")) bas.push("Personas: " + val("pubPersonas"));
    if(val("pubDormitorios")) bas.push("Dormitorios: " + val("pubDormitorios"));
    if(val("pubBanos")) bas.push("Baños: " + val("pubBanos"));
    if(val("pubM2")) bas.push("m²: " + val("pubM2"));
    if(val("pubTipo")) bas.push("Tipo: " + val("pubTipo"));
    if(bas.length){ L.push("📋 DATOS BÁSICOS"); L.push(bas.join(" · ")); L.push(""); }
    const dests = [];
    for(let i=0;i<3;i++){
      const t = val("pubDest"+i+"T"), d = val("pubDest"+i+"D");
      if(t || d) dests.push((dests.length+1) + ". " + t + (d ? ": " + d : ""));
    }
    if(dests.length){ L.push("✨ ASPECTOS DESTACADOS"); dests.forEach(x=>L.push(x)); L.push(""); }
    L.push("📝 DESCRIPCIÓN");
    L.push(val("pubDescripcion"));
    L.push("");
    const amens = Array.from(document.querySelectorAll("#pubAmenChecks input:checked")).map(c=>c.value);
    const otros = val("pubAmenOtros").split(",").map(s=>s.trim()).filter(Boolean);
    const todos = amens.concat(otros);
    if(todos.length){ L.push("✅ SERVICIOS"); L.push(todos.join(", ")); L.push(""); }
    const dorms = [];
    document.querySelectorAll("#pubDorms .pub-dorm-row").forEach(r=>{
      const n = r.querySelector(".pub-dorm-nombre").value.trim();
      const d = r.querySelector(".pub-dorm-detalle").value.trim();
      if(n || d) dorms.push("— " + (n||"Dormitorio") + (d ? ": " + d : ""));
    });
    if(dorms.length){ L.push("🛏️ DORMITORIOS"); dorms.forEach(x=>L.push(x)); L.push(""); }
  }else{
    L.push("📝 DESCRIPCIÓN");
    L.push(val("pubDescripcion2"));
    L.push("");
    if(val("pubHorario")){ L.push("🕐 HORARIO / DETALLES"); L.push(val("pubHorario")); L.push(""); }
  }
  L.push("📷 Enviaré las fotos del negocio por este chat.");
  return L.join("\n");
}

/* ---------- Validación y envío ---------- */
function validar(){
  if(!val("pubNombre")) return "Escribe el nombre del negocio.";
  if(!val("pubCategoria")) return "Elige la categoría del negocio.";
  if(!val("pubZona")) return "Escribe la zona o ubicación.";
  if(!val("pubProvincia")) return "Elige la provincia.";
  if(!val("pubMunicipio")) return "Elige el municipio.";
  if(!val("pubResponsable")) return "Escribe el nombre del responsable.";
  if(!val("pubWhatsapp")) return "Escribe un WhatsApp de contacto para verificarte.";
  if(val("pubCategoria") === "Hospedaje"){
    if(!val("pubDescripcion")) return "Escribe una descripción de tu alojamiento.";
  }else{
    if(!val("pubDescripcion2")) return "Escribe una descripción de tu servicio.";
  }
  return null;
}

document.addEventListener("DOMContentLoaded", ()=>{
  cargarProvs();
  $("pubCategoria").addEventListener("change", toggleSecciones);
  $("pubAddDorm").addEventListener("click", ()=>addDorm("",""));
  addDorm("", ""); /* una fila inicial */
  $("pubForm").addEventListener("submit", e=>{
    e.preventDefault();
    const err = $("pubError");
    const msg = validar();
    if(msg){ err.textContent = msg; err.hidden = false; err.scrollIntoView({behavior:"smooth", block:"center"}); return; }
    err.hidden = true;
    const num = wnum();
    if(!num){ err.textContent = "No se pudo determinar el contacto. Intenta más tarde."; err.hidden = false; return; }
    const url = "https://wa.me/" + num + "?text=" + encodeURIComponent(armarMensaje());
    window.open(url, "_blank", "noopener");
    $("pubForm").hidden = true;
    $("pubOk").hidden = false;
    $("pubOk").scrollIntoView({behavior:"smooth", block:"center"});
  });
});
})();
