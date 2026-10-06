/* Ciénaga de Zapata · panel de administración
   Auth: Google (vía CMS) · Fallback: token de GitHub si el CMS no está configurado */
(function(){
"use strict";
const OWNER = "roygarcialeonardo", REPO = "cienaga-de-zapata";
const GH_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;
const LS_TOK = "cz_admin_token";
window.CZAdmin = {};
let gidToken = null, gidEmail = "";
const EN_PAGINA = (typeof PAGINA!=="undefined") ? PAGINA : null;

function cfg(){ return window.CZ_CONFIG||{}; }
function usaCMS(){ return !!(cfg().CMS_URL && cfg().GOOGLE_CLIENT_ID); }
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function tok(){ return localStorage.getItem(LS_TOK)||""; }

/* ---------- UI ---------- */
function montarUI(){
  if(document.getElementById("adminFloat")) return;
  const f=document.createElement("button");
  f.id="adminFloat"; f.className="admin-float"; f.title="Administración"; f.textContent="🔐";
  f.onclick=onFloat; document.body.appendChild(f);
  const bar=document.createElement("div");
  bar.id="adminBar"; bar.className="admin-bar";
  bar.innerHTML=`<b>🔐 <span id="adminWho">Modo administrador</span></b>
    <button class="btn btn-sol" id="btnAdd">＋ Añadir publicación</button>
    <button class="btn btn-ghost" id="btnExit">Salir</button>`;
  document.body.appendChild(bar);
  document.getElementById("btnAdd").onclick=()=>formPost(null);
  document.getElementById("btnExit").onclick=salir;
  const veil=document.createElement("div");
  veil.id="modalVeil"; veil.className="modal-veil";
  veil.innerHTML=`<div class="modal" id="modalBox"></div>`;
  veil.onclick=e=>{if(e.target===veil)cerrarModal();};
  document.body.appendChild(veil);
}
function abrirModal(html){document.getElementById("modalBox").innerHTML=html;
  document.getElementById("modalVeil").classList.add("on");}
function cerrarModal(){document.getElementById("modalVeil").classList.remove("on");}

function onFloat(){
  if(gidToken || tok()){ entrar(); return; }
  if(usaCMS()) loginGoogle(); else loginToken();
}

/* ----- Login con Google ----- */
function loginGoogle(){
  abrirModal(`<h3>🔐 Acceso administrador</h3>
    <p style="opacity:.85;font-size:.95rem;margin-bottom:1rem">Entra con tu cuenta de Google. Solo los correos autorizados pueden administrar.</p>
    <div id="gbtn"></div>
    <div class="row"><button class="btn btn-ghost" id="gCancel">Cancelar</button></div>
    <p id="gMsg" style="margin-top:.8rem;font-size:.9rem"></p>`);
  document.getElementById("gCancel").onclick=cerrarModal;
  const render=()=>{
    if(!window.google || !google.accounts){ setTimeout(render, 300); return; }
    google.accounts.id.initialize({client_id: cfg().GOOGLE_CLIENT_ID,
      callback: onGoogleCred, auto_select:false});
    google.accounts.id.renderButton(document.getElementById("gbtn"),
      {theme:"filled_blue", size:"large", width:280, text:"signin_with", locale:"es"});
  };
  render();
}
async function onGoogleCred(resp){
  gidToken = resp.credential;
  try{ gidEmail = JSON.parse(atob(gidToken.split(".")[1])).email || ""; }catch(e){}
  // verificar contra el CMS
  const msg=document.getElementById("gMsg"); msg.textContent="⏳ Verificando…";
  try{
    const j = await cmsApi("checkAuth", {});
    if(j && j._auth_ok){ cerrarModal(); entrar(); }
    else{ gidToken=null; msg.textContent="❌ Este correo no está autorizado."; }
  }catch(e){ gidToken=null; msg.textContent="❌ No se pudo verificar. Revisa tu conexión."; }
}
async function cmsApi(action, data){
  const r = await fetch(cfg().CMS_URL, {method:"POST",
    body: JSON.stringify(Object.assign({action, idToken: gidToken}, data||{}))});
  return r.json();
}

/* ----- Fallback: token GitHub ----- */
function loginToken(){
  abrirModal(`<h3>🔐 Acceso administrador</h3>
    <p style="opacity:.85;font-size:.92rem">Pega tu token de GitHub (permiso <b>public_repo</b>). Se guarda solo en este navegador.</p>
    <label>Token de GitHub</label>
    <input type="text" id="tokIn" placeholder="ghp_..." autocomplete="off">
    <div class="row"><button class="btn btn-sol" id="tokOk">Entrar</button>
    <button class="btn btn-ghost" id="tokNo">Cancelar</button></div>`);
  document.getElementById("tokNo").onclick=cerrarModal;
  document.getElementById("tokOk").onclick=async()=>{
    const t=document.getElementById("tokIn").value.trim(); if(!t)return;
    localStorage.setItem(LS_TOK,t);
    const ok=await fetch("https://api.github.com/user",
      {headers:{"Authorization":"Bearer "+t}}).then(r=>r.ok).catch(()=>false);
    if(ok){cerrarModal();entrar();} else{localStorage.removeItem(LS_TOK);alert("Token inválido.");}
  };
}

function entrar(){
  document.body.classList.add("admin");
  document.getElementById("adminBar").classList.add("on");
  if(gidEmail) document.getElementById("adminWho").textContent = "Admin: "+gidEmail;
  location.reload();
}
function salir(){
  gidToken=null; gidEmail="";
  localStorage.removeItem(LS_TOK);
  document.body.classList.remove("admin");
  document.getElementById("adminBar").classList.remove("on");
  location.reload();
}

/* ---------- GitHub directo (fallback) ---------- */
function ghH(){return {"Authorization":"Bearer "+tok(),"Accept":"application/vnd.github+json","Content-Type":"application/json"};}
async function ghLeer(p){
  const r=await fetch(`${GH_API}/${p}?ref=main`,{headers:ghH()});
  const j=await r.json();
  return {sha:j.sha, data:JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g,"")))))};
}
const b64=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o,null,1))));
async function ghGuardar(p,data,sha,msg){
  const r=await fetch(`${GH_API}/${p}`,{method:"PUT",headers:ghH(),
    body:JSON.stringify({message:msg,content:b64(data),sha,branch:"main"})});
  if(!r.ok) throw new Error("guardar");
}
async function ghImagen(file){
  const buf=await file.arrayBuffer(); const b=new Uint8Array(buf); let s="";
  for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));
  const n="img/"+Date.now()+"-"+file.name.toLowerCase().replace(/[^a-z0-9.]+/g,"-");
  const r=await fetch(`${GH_API}/${n}`,{method:"PUT",headers:ghH(),
    body:JSON.stringify({message:"Subir imagen "+n,content:btoa(s),branch:"main"})});
  if(!r.ok) throw new Error("imagen"); return n;
}

/* ---------- Vía CMS ---------- */
async function fileToB64(file){
  const buf=await file.arrayBuffer(); const b=new Uint8Array(buf); let s="";
  for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));
  return btoa(s);
}

/* ---------- Formulario ---------- */
const PAGS=[["lugares","Lugares"],["secretos","Secretos"],["fauna-flora","Fauna y flora"],
            ["actividades","Actividades"],["historia","Historia"],["gastronomia","Gastronomía"],["guia","Guía"]];
function formPost(p){
  const esNuevo=!p;
  p=p||{id:"",pagina:EN_PAGINA||"lugares",titulo:"",imagen:"",alt:"",cuerpo:[],datos:[]};
  // En páginas de detalle la página es la actual; en la home se puede elegir
  const selPag = EN_PAGINA
    ? `<p style="opacity:.8;font-size:.9rem">📄 Se publicará en: <b>${esc(nombrePag(EN_PAGINA))}</b></p>`
    : `<label>Página</label><select id="fPag">${PAGS.map(([v,t])=>`<option value="${v}"${p.pagina===v?" selected":""}>${t}</option>`).join("")}</select>`;
  const datosTxt=(p.datos||[]).map(d=>d[0]+": "+d[1]).join("\n");
  abrirModal(`<h3>${esNuevo?"＋ Nueva publicación":"✏️ Editar publicación"}</h3>${selPag}
    <label>Título</label><input type="text" id="fTit" value="${esc(p.titulo)}">
    <label>Imagen</label><input type="file" id="fImg" accept="image/*" style="color:#fff">
    ${p.imagen?`<img class="img-preview" id="imgPrev" src="${esc(p.imagen)}">`:`<img class="img-preview" id="imgPrev" style="display:none">`}
    <label>Texto (separa párrafos con una línea en blanco)</label>
    <textarea id="fCuerpo" rows="6">${esc((p.cuerpo||[]).join("\n\n"))}</textarea>
    <label>Datos (una línea por dato: <i>Clave: valor</i>)</label>
    <textarea id="fDatos" rows="4">${esc(datosTxt)}</textarea>
    <div class="row"><button class="btn btn-sol" id="fSave">💾 Publicar</button>
    <button class="btn btn-ghost" id="fCancel">Cancelar</button></div>
    <p id="fMsg" style="margin-top:.8rem;font-size:.9rem"></p>`);
  document.getElementById("fCancel").onclick=cerrarModal;
  let nuevoFile=null;
  document.getElementById("fImg").onchange=e=>{
    const f=e.target.files[0]; if(!f)return; nuevoFile=f;
    const pr=document.getElementById("imgPrev");
    pr.src=URL.createObjectURL(f); pr.style.display="block";
  };
  document.getElementById("fSave").onclick=async()=>{
    const msg=document.getElementById("fMsg");
    try{
      msg.textContent="⏳ Publicando…";
      const titulo=document.getElementById("fTit").value.trim();
      if(!titulo)throw new Error("ponle un título");
      const pagina=EN_PAGINA||document.getElementById("fPag").value;
      const cuerpo=document.getElementById("fCuerpo").value.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
      const datos=document.getElementById("fDatos").value.split("\n").map(s=>s.trim()).filter(Boolean)
        .map(l=>{const i=l.indexOf(":");return i>0?[l.slice(0,i).trim(),l.slice(i+1).trim()]:[l,""];});
      if(usaCMS()){
        let imgPath=p.imagen;
        if(nuevoFile){
          const up=await cmsApi("uploadImage",{nombre:nuevoFile.name, base64:await fileToB64(nuevoFile)});
          if(!up.ok)throw new Error("subir imagen"); imgPath=up.path;
        }
        const post={id:p.id||null, pagina, titulo, imagen:imgPath||"img/hero-humedal.webp",
          alt:titulo, cuerpo, datos};
        const j=await cmsApi("savePost",{post});
        if(!j.ok)throw new Error(j.error||"guardar");
      }else{
        let imgPath=p.imagen;
        if(nuevoFile) imgPath=await ghImagen(nuevoFile);
        const {sha,data}=await ghLeer("posts.json");
        const hoy=new Date().toISOString().slice(0,10);
        if(esNuevo)data.push({id:"p"+Date.now(),pagina,titulo,imagen:imgPath||"img/hero-humedal.webp",
          alt:titulo,cuerpo,datos,fecha:hoy,fijo:false});
        else{const i=data.findIndex(x=>x.id===p.id);
          data[i]={...data[i],pagina,titulo,imagen:imgPath,cuerpo,datos,fecha:hoy};}
        await ghGuardar("posts.json",data,sha,(esNuevo?"Nueva":"Editar")+" publicación: "+titulo);
      }
      msg.textContent="✅ ¡Publicado! La página se actualizará en ~1 minuto.";
      setTimeout(()=>location.reload(),2500);
    }catch(e){msg.textContent="❌ Error: "+e.message;}
  };
}
function nombrePag(p){return {"lugares":"Lugares","secretos":"Secretos","fauna-flora":"Fauna y flora",
  "actividades":"Actividades","historia":"Historia","gastronomia":"Gastronomía","guia":"Guía"}[p]||p;}

window.CZAdmin.bindTools=function(cont){
  cont.onclick=async e=>{
    const eb=e.target.closest("[data-edit]"), db=e.target.closest("[data-del]");
    if(eb){
      const post=(await leerTodos()).find(x=>x.id===eb.dataset.edit);
      formPost(post);
    }else if(db){
      if(!confirm("¿Eliminar esta publicación?"))return;
      if(usaCMS()){const j=await cmsApi("deletePost",{id:db.dataset.del});if(!j.ok){alert("Error");return;}}
      else{const {sha,data}=await ghLeer("posts.json");
        const i=data.findIndex(x=>x.id===db.dataset.del);
        await ghGuardar("posts.json",data.filter((_,k)=>k!==i),sha,"Eliminar publicación");}
      location.reload();
    }
  };
};
async function leerTodos(){
  if(usaCMS()){ /* el CMS no expone lista; leer del JSON público */
    return fetch("posts.json",{cache:"no-store"}).then(r=>r.json()); }
  return (await ghLeer("posts.json")).data;
}

document.addEventListener("DOMContentLoaded",()=>{
  montarUI();
  if(gidToken||tok()){document.body.classList.add("admin");
    document.getElementById("adminBar").classList.add("on");}
});
})();
