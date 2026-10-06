/* Ciénaga de Zapata · comentarios de viajeros (sin necesidad de cuenta) */
(function(){
"use strict";
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function cms(){ return (window.CZ_CONFIG||{}).CMS_URL || ""; }

async function api(action, data){
  const r = await fetch(cms(), {method:"POST", body:JSON.stringify(Object.assign({action}, data||{}))});
  return r.json();
}

async function cargar(){
  const box = document.getElementById("comments");
  if(!box) return;
  if(!cms()){
    box.innerHTML = "<p style='opacity:.7'>💬 Los comentarios estarán disponibles próximamente.</p>";
    return;
  }
  const pagina = (typeof PAGINA!=="undefined") ? PAGINA : "home";
  box.innerHTML = `
    <div id="clist"><p style="opacity:.7">Cargando comentarios…</p></div>
    <form id="cform" style="margin-top:1.5rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:1.3rem">
      <b>✍️ Deja tu experiencia</b>
      <input type="text" id="cnom" maxlength="60" placeholder="Tu nombre (opcional)" style="width:100%;margin:.8rem 0 .6rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:10px;color:#fff;padding:.7rem;font-family:inherit">
      <textarea id="cmsg" maxlength="600" required placeholder="Cuéntanos cómo te fue en la Ciénaga… (máx. 600 caracteres)" style="width:100%;min-height:90px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:10px;color:#fff;padding:.7rem;font-family:inherit;resize:vertical"></textarea>
      <input type="text" id="chp" style="display:none" tabindex="-1" autocomplete="off">
      <div style="margin-top:.8rem"><button class="btn btn-sol" type="submit" id="cbtn">Publicar comentario</button>
      <span id="cstat" style="margin-left:.8rem;font-size:.9rem"></span></div>
    </form>`;
  const esAdmin = ()=> !!(window.CZAdmin && window.CZAdmin.dentro && window.CZAdmin.dentro());
  const pintar = items=>{
    document.getElementById("clist").innerHTML = items.length ? items.map(c=>`
      <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:1rem 1.2rem;margin-bottom:.8rem">
        <b style="color:var(--amarillo)">${esc(c.nombre)}</b>
        <span style="opacity:.55;font-size:.8rem"> · ${esc(c.fecha)}</span>
        ${esAdmin()?`<button data-fila="${c.fila}" class="cdel" title="Borrar comentario" style="float:right;background:none;border:none;cursor:pointer;font-size:1.1rem">🗑️</button>`:""}
        <p style="margin-top:.4rem">${esc(c.mensaje)}</p>
      </div>`).join("")
      : "<p style='opacity:.7'>Aún no hay comentarios. ¡Sé el primero! 👇</p>";
    if(esAdmin()) document.querySelectorAll(".cdel").forEach(b=>b.onclick=async()=>{
      if(!confirm("¿Borrar este comentario?")) return;
      try{
        const j = await fetch(cms(),{method:"POST",body:JSON.stringify({action:"deleteComment",fila:b.dataset.fila,session:localStorage.getItem("cz_admin_session")||""})}).then(r=>r.json());
        if(j.ok){ const j2 = await api("getComments",{pagina}); pintar(j2.ok?j2.items:[]); }
      }catch(e){}
    });
  };
  try{ const j = await api("getComments",{pagina}); pintar(j.ok?j.items:[]); }
  catch(e){ pintar([]); }
  document.getElementById("cform").onsubmit = async ev=>{
    ev.preventDefault();
    const st = document.getElementById("cstat"), btn = document.getElementById("cbtn");
    if(document.getElementById("chp").value) return; // honeypot
    const last = +localStorage.getItem("cz_clast")||0;
    if(Date.now()-last < 30000){ st.textContent = "⏳ Espera unos segundos antes de publicar otro."; return; }
    const nombre = document.getElementById("cnom").value.trim();
    const mensaje = document.getElementById("cmsg").value.trim();
    if(mensaje.length < 3){ st.textContent = "✍️ Escribe un mensaje un poco más largo."; return; }
    btn.disabled = true; st.textContent = "⏳ Publicando…";
    try{
      const j = await api("addComment",{pagina, nombre, mensaje});
      if(j.ok){
        localStorage.setItem("cz_clast", Date.now());
        document.getElementById("cmsg").value = "";
        st.textContent = "✅ ¡Gracias por compartir!";
        const j2 = await api("getComments",{pagina}); pintar(j2.ok?j2.items:[]);
      }else st.textContent = "❌ No se pudo publicar. Intenta de nuevo.";
    }catch(e){ st.textContent = "❌ Error de conexión."; }
    btn.disabled = false;
    setTimeout(()=>st.textContent="", 4000);
  };
}
document.addEventListener("DOMContentLoaded", cargar);
})();
