/* Ciénaga de Zapata · panel de administración (GitHub API) */
(function(){
"use strict";
const OWNER = "roygarcialeonardo", REPO = "cienaga-de-zapata";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;
const LS = "cz_admin_token";
window.CZAdmin = {};

function token(){ return localStorage.getItem(LS) || ""; }
function headers(){
  return {"Authorization":"Bearer "+token(),"Accept":"application/vnd.github+json","Content-Type":"application/json"};
}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

/* ---------- UI base ---------- */
function montarUI(){
  if(document.getElementById("adminFloat")) return;
  const f = document.createElement("button");
  f.id = "adminFloat"; f.className = "admin-float"; f.title = "Administración"; f.textContent = "🔐";
  f.onclick = onFloat; document.body.appendChild(f);

  const bar = document.createElement("div");
  bar.id = "adminBar"; bar.className = "admin-bar";
  bar.innerHTML = `<b>🔐 Modo administrador</b>
    <button class="btn btn-sol" id="btnAdd">＋ Añadir publicación</button>
    <button class="btn btn-ghost" id="btnExit">Salir</button>`;
  document.body.appendChild(bar);
  document.getElementById("btnAdd").onclick = ()=>formPost(null);
  document.getElementById("btnExit").onclick = salir;

  const veil = document.createElement("div");
  veil.id = "modalVeil"; veil.className = "modal-veil";
  veil.innerHTML = `<div class="modal" id="modalBox"></div>`;
  veil.onclick = e=>{ if(e.target===veil) cerrarModal(); };
  document.body.appendChild(veil);
}
function abrirModal(html){ document.getElementById("modalBox").innerHTML = html;
  document.getElementById("modalVeil").classList.add("on"); }
function cerrarModal(){ document.getElementById("modalVeil").classList.remove("on"); }

function onFloat(){
  if(token()){ entrar(); return; }
  abrirModal(`<h3>🔐 Acceso administrador</h3>
    <p style="opacity:.8;font-size:.92rem">Para editar la página necesitas un token de GitHub (solo la primera vez):<br>
    1. Entra a <b>github.com/settings/tokens/new</b><br>
    2. Marca el permiso <b>public_repo</b> y genera el token<br>
    3. Pégalo aquí (se guarda solo en este navegador).</p>
    <label>Token de GitHub</label>
    <input type="text" id="tokIn" placeholder="ghp_..." autocomplete="off">
    <div class="row"><button class="btn btn-sol" id="tokOk">Entrar</button>
    <button class="btn btn-ghost" id="tokNo">Cancelar</button></div>`);
  document.getElementById("tokNo").onclick = cerrarModal;
  document.getElementById("tokOk").onclick = async ()=>{
    const t = document.getElementById("tokIn").value.trim();
    if(!t) return;
    localStorage.setItem(LS, t);
    const ok = await fetch("https://api.github.com/user",{headers:headers()}).then(r=>r.ok).catch(()=>false);
    if(ok){ cerrarModal(); entrar(); }
    else{ localStorage.removeItem(LS); alert("Token inválido. Revisa que tenga el permiso public_repo."); }
  };
}
function entrar(){
  document.body.classList.add("admin");
  document.getElementById("adminBar").classList.add("on");
  // re-render para mostrar herramientas
  document.dispatchEvent(new Event("cz-rerender"));
}
function salir(){
  document.body.classList.remove("admin");
  document.getElementById("adminBar").classList.remove("on");
  document.dispatchEvent(new Event("cz-rerender"));
}

/* ---------- GitHub API ---------- */
async function leerJSON(path){
  const r = await fetch(`${API}/${path}?ref=main`, {headers:headers()});
  if(!r.ok) throw new Error("leer");
  const j = await r.json();
  return {sha: j.sha, data: JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g,"")))))};
}
function b64(obj){
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 1))));
}
async function guardarJSON(path, data, sha, msg){
  const r = await fetch(`${API}/${path}`, {method:"PUT", headers:headers(),
    body: JSON.stringify({message: msg, content: b64(data), sha, branch:"main"})});
  if(!r.ok) throw new Error("guardar");
}
async function subirImagen(file){
  const buf = await file.arrayBuffer();
  let bin = ""; const bytes = new Uint8Array(buf);
  for(let i=0;i<bytes.length;i+=0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i,i+0x8000));
  const nombre = "img/" + Date.now() + "-" + file.name.toLowerCase().replace(/[^a-z0-9.]+/g,"-");
  const r = await fetch(`${API}/${nombre}`, {method:"PUT", headers:headers(),
    body: JSON.stringify({message:"Subir imagen "+nombre, content:btoa(bin), branch:"main"})});
  if(!r.ok) throw new Error("imagen");
  return nombre;
}

/* ---------- Formulario de publicación ---------- */
const PAGS = [["lugares","Lugares"],["secretos","Secretos"],["fauna-flora","Fauna y flora"],
              ["actividades","Actividades"],["historia","Historia"],["gastronomia","Gastronomía"],["guia","Guía"]];
function formPost(p){
  const esNuevo = !p; p = p || {id:"", pagina:(typeof PAGINA!=="undefined"?PAGINA:"lugares"),
    titulo:"", imagen:"", alt:"", cuerpo:[], datos:[], fecha:""};
  const opts = PAGS.map(([v,t])=>`<option value="${v}"${p.pagina===v?" selected":""}>${t}</option>`).join("");
  const datosTxt = (p.datos||[]).map(d=>d[0]+": "+d[1]).join("\n");
  abrirModal(`<h3>${esNuevo?"＋ Nueva publicación":"✏️ Editar publicación"}</h3>
    <label>Página</label><select id="fPag">${opts}</select>
    <label>Título</label><input type="text" id="fTit" value="${esc(p.titulo)}">
    <label>Imagen</label><input type="file" id="fImg" accept="image/*" style="color:#fff">
    ${p.imagen?`<img class="img-preview" id="imgPrev" src="${esc(p.imagen)}">`:`<img class="img-preview" id="imgPrev" style="display:none">`}
    <label>Texto (un párrafo por línea en blanco)</label>
    <textarea id="fCuerpo" rows="6">${esc((p.cuerpo||[]).join("\n\n"))}</textarea>
    <label>Datos (una línea por dato: <i>Clave: valor</i>)</label>
    <textarea id="fDatos" rows="4">${esc(datosTxt)}</textarea>
    <div class="row"><button class="btn btn-sol" id="fSave">💾 Publicar</button>
    <button class="btn btn-ghost" id="fCancel">Cancelar</button></div>
    <p id="fMsg" style="margin-top:.8rem;font-size:.9rem"></p>`);
  document.getElementById("fCancel").onclick = cerrarModal;
  let nuevaImg = null;
  document.getElementById("fImg").onchange = e=>{
    const f = e.target.files[0]; if(!f) return;
    nuevaImg = f;
    const pr = document.getElementById("imgPrev");
    pr.src = URL.createObjectURL(f); pr.style.display = "block";
  };
  document.getElementById("fSave").onclick = async ()=>{
    const msg = document.getElementById("fMsg");
    try{
      msg.textContent = "⏳ Publicando…";
      let imgPath = p.imagen;
      if(nuevaImg) imgPath = await subirImagen(nuevaImg);
      const titulo = document.getElementById("fTit").value.trim();
      if(!titulo) throw new Error("título");
      const cuerpo = document.getElementById("fCuerpo").value.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
      const datos = document.getElementById("fDatos").value.split("\n").map(s=>s.trim()).filter(Boolean)
        .map(l=>{const i=l.indexOf(":"); return i>0?[l.slice(0,i).trim(), l.slice(i+1).trim()]:[l,""];});
      const {sha, data} = await leerJSON("posts.json");
      const hoy = new Date().toISOString().slice(0,10);
      if(esNuevo){
        data.push({id:"p"+Date.now(), pagina:document.getElementById("fPag").value,
          titulo, imagen:imgPath||"img/hero-humedal.webp", alt:titulo,
          cuerpo, datos, fecha:hoy, fijo:false});
      }else{
        const i = data.findIndex(x=>x.id===p.id);
        data[i] = {...data[i], pagina:document.getElementById("fPag").value, titulo,
          imagen:imgPath, cuerpo, datos, fecha:hoy};
      }
      await guardarJSON("posts.json", data, sha,
        (esNuevo?"Nueva publicación: ":"Editar publicación: ")+titulo);
      msg.textContent = "✅ ¡Publicado! La página se actualizará en ~1 minuto.";
      setTimeout(()=>location.reload(), 2500);
    }catch(e){ msg.textContent = "❌ Error: "+e.message; }
  };
}

/* ---------- Editar / borrar ---------- */
window.CZAdmin.bindTools = function(cont){
  cont.onclick = async e=>{
    const eb = e.target.closest("[data-edit]"), db = e.target.closest("[data-del]");
    if(eb){
      const {data} = await leerJSON("posts.json");
      formPost(data.find(x=>x.id===eb.dataset.edit));
    }else if(db){
      if(!confirm("¿Eliminar esta publicación?")) return;
      const {sha, data} = await leerJSON("posts.json");
      const i = data.findIndex(x=>x.id===db.dataset.del);
      const tit = data[i]?data[i].titulo:"";
      data.splice(i,1);
      await guardarJSON("posts.json", data, sha, "Eliminar publicación: "+tit);
      location.reload();
    }
  };
};

document.addEventListener("DOMContentLoaded", ()=>{
  montarUI();
  if(token()){ document.body.classList.add("admin"); document.getElementById("adminBar").classList.add("on"); }
  document.addEventListener("cz-rerender", ()=>{
    // re-renderiza el contenido actual
    if(typeof PAGINA!=="undefined"){ const c=document.getElementById("fichas"); if(c){c.innerHTML="";} }
    location.reload();
  });
});
})();
