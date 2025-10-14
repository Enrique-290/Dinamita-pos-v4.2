
// Simple store
const STORAGE_KEY='dinamita_pos_v3'; const SCHEMA_VERSION=6;
const DB={load(){let raw=localStorage.getItem(STORAGE_KEY);if(raw){try{let d=JSON.parse(raw);if(!d.schemaVersion||d.schemaVersion<SCHEMA_VERSION)d=this.migrate(d);return d;}catch(e){}}let d=this.seed();this.save(d);return d;},
save(d){localStorage.setItem(STORAGE_KEY,JSON.stringify(d));},
seed(){const today=new Date().toISOString().slice(0,10);return{schemaVersion:SCHEMA_VERSION,settings:{iva:16,mensaje:'Gracias por tu compra en Dinamita Gym 💥',logo:DEFAULT_LOGO},products:[
{sku:'WHEY-CH-900',nombre:'Proteína Whey Chocolate 900g',categoria:'Suplementos',precio:499,costo:300,stock:12,img:'',descr:''},
{sku:'SHAKER-700',nombre:'Shaker Dinamita 700ml',categoria:'Accesorios',precio:149,costo:80,stock:25,img:'',descr:''},
{sku:'CAFE-LATTE',nombre:'Latte 355ml',categoria:'Cafetería',precio:45,costo:20,stock:50,img:'',descr:''}
],customers:[{id:'C1',nombre:'Público General',tel:'',email:'',certificadoMedico:false,entrenaSolo:false}],memberships:[],sales:[]};},
migrate(d){d=d||{};d.schemaVersion=SCHEMA_VERSION;d.settings=d.settings||{iva:16,mensaje:'Gracias por tu compra en Dinamita Gym 💥',logo:DEFAULT_LOGO};d.products=(d.products||[]).map(p=>({stock:0,costo:0,descr:'',img:'',categoria:'General',...p}));d.customers=(d.customers||[]).map(c=>({certificadoMedico:false,entrenaSolo:false,...c}));d.memberships=d.memberships||[];d.sales=(d.sales||[]).map(s=>({...s,subtotalCosto:s.subtotalCosto??(s.items||[]).reduce((a,i)=>a+(i.costo||0)*(i.qty||0),0)}));return d;}}
let state=DB.load();
function esc(x){return (x||'').replace(/[&<>"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));}
function money(n){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n||0)}
function padRight(t,n){return (t+' '.repeat(n)).slice(0,n);} function padLeft(t,n){return (' '.repeat(n)+t).slice(-n);} function repeat(ch,n){return new Array(n+1).join(ch);} function truncate(s,n){return s.length>n?s.slice(0,n-1)+'…':s;} function center(t){const w=32;const p=Math.max(0,Math.floor((w-t.length)/2));return ' '.repeat(p)+t;}

const UI={init(){document.querySelectorAll('.menu button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.menu button').forEach(x=>x.classList.remove('active'));b.classList.add('active');UI.show(b.dataset.view);document.getElementById('viewTitle').textContent=b.textContent;});document.getElementById('backupBtn').onclick=Backup.export;document.getElementById('restoreBtn').onclick=()=>document.getElementById('restoreInput').click();document.getElementById('restoreInput').addEventListener('change',Backup.importFile);Ventas.fillClientes();Membresias.fillClientes();Dashboard.render();Inventario.renderTabla();Clientes.renderTabla();Membresias.renderTabla();Cafeteria.render();Historial.renderTabla();Config.renderLogo();UI.show('dashboard');},
show(id){document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));document.getElementById('view-'+id).classList.remove('hidden');}};

const Backup={export(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='dinamita-pos-respaldo.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);},
importFile(ev){const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{let d=JSON.parse(e.target.result);if(!d.schemaVersion||d.schemaVersion<SCHEMA_VERSION)d=DB.migrate(d);state=d;DB.save(state);UI.init();alert('Respaldo importado.');}catch(_){alert('Archivo inválido.');}};r.readAsText(f);ev.target.value='';}}

const Dashboard={render(){const today=new Date().toISOString().slice(0,10);const ventasHoy=state.sales.filter(s=>s.fecha.slice(0,10)===today);const totalHoy=ventasHoy.reduce((a,s)=>a+s.total,0);const utilidad=ventasHoy.reduce((a,s)=>a+((s.total-s.iva)-(s.subtotalCosto||0)),0);document.getElementById('kpiVentasHoy').textContent=money(totalHoy);document.getElementById('kpiTickets').textContent=String(ventasHoy.length);document.getElementById('kpiStock').textContent=String(state.products.reduce((a,p)=>a+(p.stock||0),0));document.getElementById('kpiGananciaHoy').textContent=money(utilidad);}}

const Ventas={carrito:[],buscarProducto(term){term=(term||'').toLowerCase();const res=state.products.filter(p=>p.nombre.toLowerCase().includes(term)||(p.sku||'').toLowerCase().includes(term));const wrap=document.getElementById('ventaResultados');wrap.innerHTML='';res.forEach(p=>{const div=document.createElement('div');div.className='list-item';div.innerHTML=`<div style="flex:1"><div><strong>${esc(p.nombre)}</strong> <small>(${esc(p.sku)})</small></div><div class="sub">Precio: ${money(p.precio)} • Stock: ${p.stock}</div></div><div><input type="number" min="1" step="1" value="1" style="width:70px"> <button class="btn small">➕</button></div>`;div.querySelector('button').onclick=()=>{const qty=parseInt(div.querySelector('input').value||'1',10);Ventas.addCarrito(p.sku,qty)};wrap.appendChild(div);});},
addCarrito(sku,qty){const p=state.products.find(x=>x.sku===sku);if(!p)return;const e=Ventas.carrito.find(x=>x.sku===sku);if(e)e.qty+=qty;else Ventas.carrito.push({sku,nombre:p.nombre,precio:p.precio,qty});Ventas.renderCarrito();},
renderCarrito(){const c=document.getElementById('carrito');c.innerHTML='';Ventas.carrito.forEach(i=>{const div=document.createElement('div');div.className='list-item';div.innerHTML=`<div style="flex:1"><div><strong>${esc(i.nombre)}</strong></div><div class="sub">Precio: ${money(i.precio)} x ${i.qty}</div></div><div><button class="btn small" onclick="Ventas.delItem('${i.sku}')">✕</button></div>`;c.appendChild(div)});Ventas.updateTotals();Ventas.fillClientes();},
updateTotals(){const sub=Ventas.carrito.reduce((a,i)=>a+i.precio*i.qty,0);const ivaPct=state.settings.iva||0;const iva=sub*(ivaPct/100);const total=sub+iva;document.getElementById('ventaSubtotal').textContent=money(sub);document.getElementById('ventaIVA').textContent=money(iva);document.getElementById('ventaTotal').textContent=money(total);return{subtotal:sub,iva,total}},
delItem(sku){Ventas.carrito=Ventas.carrito.filter(i=>i.sku!==sku);Ventas.renderCarrito();},
fillClientes(){const sel=document.getElementById('ventaCliente');sel.innerHTML='';state.customers.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.nombre;sel.appendChild(o);});},
confirmar(){if(Ventas.carrito.length===0){alert('Agrega productos.');return;}for(const it of Ventas.carrito){const p=state.products.find(x=>x.sku===it.sku);if(!p||p.stock<it.qty){alert('Stock insuficiente de '+it.nombre);return;}}Ventas.carrito.forEach(it=>{const p=state.products.find(x=>x.sku===it.sku);p.stock-=it.qty;});const cliente=document.getElementById('ventaCliente').value;const notas=document.getElementById('ventaNotas').value||'';const totals=Ventas.updateTotals();const folio='T'+Date.now().toString().slice(-8);const items=Ventas.carrito.map(it=>{const prod=state.products.find(x=>x.sku===it.sku);return {sku:it.sku,nombre:it.nombre,precio:it.precio,costo:prod?.costo||0,qty:it.qty};});const venta={folio,fecha:new Date().toISOString(),items,subtotal:totals.subtotal,iva:totals.iva,total:totals.total,cliente,notas};venta.subtotalCosto=items.reduce((a,i)=>a+i.costo*i.qty,0);venta.ganancia=(venta.total-venta.iva)-venta.subtotalCosto;state.sales.unshift(venta);DB.save(state);Ventas.carrito=[];Ventas.renderCarrito();Dashboard.render();Inventario.renderTabla();Historial.renderTabla();Tickets.render(venta);UI.show('ticket');}
};

const Inventario={imgData:'',limpiar(){['prodSku','prodNombre','prodCategoria','prodPrecio','prodCosto','prodStock','prodDescr'].forEach(id=>document.getElementById(id).value='');document.getElementById('prodImg').value='';this.imgData='';},
loadImage(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{this.imgData=e.target.result;};r.readAsDataURL(f);},
guardar(){const sku=document.getElementById('prodSku').value.trim();const nombre=document.getElementById('prodNombre').value.trim();if(!sku||!nombre){alert('SKU y Nombre obligatorios.');return;}const p={sku,nombre,categoria:document.getElementById('prodCategoria').value.trim()||'General',precio:parseFloat(document.getElementById('prodPrecio').value||'0'),costo:parseFloat(document.getElementById('prodCosto').value||'0'),stock:parseInt(document.getElementById('prodStock').value||'0',10),img:this.imgData||'',descr:document.getElementById('prodDescr').value.trim()};let ex=state.products.find(x=>x.sku===sku);if(ex)Object.assign(ex,p);else state.products.unshift(p);DB.save(state);this.renderTabla();alert('Producto guardado.');},
renderTabla(){const q=(document.getElementById('invSearch').value||'').toLowerCase();const cat=(document.getElementById('invCat').value||'').toLowerCase();const rows=state.products.filter(p=>{const okQ=p.nombre.toLowerCase().includes(q)||(p.sku||'').toLowerCase().includes(q);const okC=!cat||(p.categoria||'').toLowerCase()===cat;return okQ&&okC;}).map(p=>{const badge=p.stock>5?'<span class="badge ok">✅ OK</span>':p.stock>0?'<span class="badge warn">⚠️ Bajo</span>':'<span class="badge bad">⛔ Agotado</span>';return `<tr><td>${esc(p.sku)}</td><td>${esc(p.nombre)}</td><td>${esc(p.categoria||'')}</td><td>${money(p.precio)}</td><td>${money(p.costo||0)}</td><td>${p.stock} ${badge}</td><td><button class="btn small" onclick="Inventario.edit('${p.sku}')">✏️</button> <button class="btn small" style="background:#ef4444;border-color:#ef4444" onclick="Inventario.del('${p.sku}')">🗑️</button></td></tr>`;}).join('');document.getElementById('invTabla').innerHTML=`<table><thead><tr><th>SKU</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Costo</th><th>Stock</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="7">Sin productos</td></tr>'}</tbody></table>`;},
edit(sku){const p=state.products.find(x=>x.sku===sku);if(!p)return;document.getElementById('prodSku').value=p.sku;document.getElementById('prodNombre').value=p.nombre;document.getElementById('prodCategoria').value=p.categoria||'';document.getElementById('prodPrecio').value=p.precio;document.getElementById('prodCosto').value=p.costo||0;document.getElementById('prodStock').value=p.stock;document.getElementById('prodDescr').value=p.descr||'';window.scrollTo({top:0,behavior:'smooth'});},
del(sku){if(!confirm('¿Eliminar producto?'))return;state.products=state.products.filter(x=>x.sku!==sku);DB.save(state);this.renderTabla();},
exportCSV(){const rows=[['SKU','Nombre','Categoría','Precio','Costo','Stock']].concat(state.products.map(p=>[p.sku,p.nombre,p.categoria||'',p.precio,p.costo||0,p.stock]));downloadCSV('inventario.csv',rows);}}

const Clientes={limpiar(){['cliId','cliNombre','cliTel','cliEmail'].forEach(id=>document.getElementById(id).value='');document.getElementById('cliCertMed').checked=false;document.getElementById('cliEntrenaSolo').checked=false;},
guardar(){const idEdit=(document.getElementById('cliId').value||'').trim();const nombre=document.getElementById('cliNombre').value.trim();if(!nombre){alert('Nombre obligatorio.');return;}const tel=document.getElementById('cliTel').value.trim();const email=document.getElementById('cliEmail').value.trim();const certificadoMedico=document.getElementById('cliCertMed').checked;const entrenaSolo=document.getElementById('cliEntrenaSolo').checked;let c;if(idEdit){c=state.customers.find(x=>x.id===idEdit);if(!c){alert('Cliente no encontrado');return;}Object.assign(c,{nombre,tel,email,certificadoMedico,entrenaSolo});}else{const id='C'+Date.now().toString(36);c={id,nombre,tel,email,certificadoMedico,entrenaSolo};state.customers.unshift(c);}DB.save(state);this.renderTabla();Ventas.fillClientes();Membresias.fillClientes();this.limpiar();alert('Cliente guardado.');},
edit(id){const c=state.customers.find(x=>x.id===id);if(!c)return;document.getElementById('cliId').value=c.id;document.getElementById('cliNombre').value=c.nombre||'';document.getElementById('cliTel').value=c.tel||'';document.getElementById('cliEmail').value=c.email||'';document.getElementById('cliCertMed').checked=!!c.certificadoMedico;document.getElementById('cliEntrenaSolo').checked=!!c.entrenaSolo;window.scrollTo({top:0,behavior:'smooth'});},
del(id){const c=state.customers.find(x=>x.id===id);if(!c)return;if(!confirm(`¿Eliminar "${c.nombre}"?`))return;state.customers=state.customers.filter(x=>x.id!==id);DB.save(state);this.renderTabla();Ventas.fillClientes();Membresias.fillClientes();},
renderTabla(){const q=(document.getElementById('cliSearch').value||'').toLowerCase();const rows=state.customers.filter(c=>(c.nombre||'').toLowerCase().includes(q)||(c.tel||'').toLowerCase().includes(q)||(c.email||'').toLowerCase().includes(q)).map(c=>{const cm=c.certificadoMedico?'<span class="badge ok">✅ Sí</span>':'<span class="badge bad">❌ No</span>';const es=c.entrenaSolo?'<span class="badge warn">🏋️‍♂️ Solo</span>':'<span class="badge ok">👥 Acomp.</span>';return `<tr><td>${esc(c.nombre)}</td><td>${esc(c.tel||'')}</td><td>${esc(c.email||'')}</td><td>${cm}</td><td>${es}</td><td><button class="btn small" onclick="Clientes.edit('${c.id}')">✏️</button> <button class="btn small" style="background:#ef4444;border-color:#ef4444" onclick="Clientes.del('${c.id}')">🗑️</button></td></tr>`;}).join('');document.getElementById('cliTabla').innerHTML=`<table><thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Cert. médico</th><th>Entrena</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="6">Sin clientes</td></tr>'}</tbody></table>`;},
exportCSV(){const rows=[['ID','Nombre','Telefono','Email','CertificadoMedico','EntrenaSolo']].concat(state.customers.map(c=>[c.id,c.nombre||'',c.tel||'',c.email||'',c.certificadoMedico?'SI':'NO',c.entrenaSolo?'SOLO':'ACOMPAÑADO']));downloadCSV('clientes.csv',rows);}}

const Membresias={fillClientes(){document.getElementById('memClienteSearch').value='';document.getElementById('memClienteId').value='';document.getElementById('memClienteResults').innerHTML='';document.getElementById('memClienteResults').classList.add('hidden');const t=new Date().toISOString().slice(0,10);document.getElementById('memInicio').value=t;document.getElementById('memFin').value=this.calcFin('Mensualidad',t);},
searchCliente(term){const box=document.getElementById('memClienteResults');term=(term||'').trim().toLowerCase();if(!term){box.classList.add('hidden');box.innerHTML='';return;}const res=state.customers.filter(c=>((c.nombre||'')+' '+(c.tel||'')+' '+(c.email||'')).toLowerCase().includes(term)).slice(0,30);box.innerHTML=res.length?res.map(c=>`<div class="item" onclick="Membresias.pickCliente('${c.id}')"><div><strong>👤 ${esc(c.nombre||'')}</strong></div><div class="muted">📞 ${esc(c.tel||'')} · ✉️ ${esc(c.email||'')}</div></div>`).join(''):`<div class="item"><span class="muted">Sin coincidencias</span></div>`;box.classList.remove('hidden');},
pickCliente(id){const c=state.customers.find(x=>x.id===id);if(!c)return;document.getElementById('memClienteId').value=c.id;document.getElementById('memClienteSearch').value=c.nombre||'';document.getElementById('memClienteResults').classList.add('hidden');},
changeTipo(){const tipo=document.getElementById('memTipo').value;const ini=document.getElementById('memInicio').value||new Date().toISOString().slice(0,10);document.getElementById('memFin').value=this.calcFin(tipo,ini);},
calcFin(tipo,ini){switch(tipo){case'Visita':return ini;case'Semana':return addDays(ini,7);case'Mensualidad':return addDays(ini,30);case'6 Meses':return addDays(ini,182);case'12 Meses':return addDays(ini,365);case'VIP':return addDays(ini,365*5);case'Promo 2x$500':return addDays(ini,30);default:return ini;}},
guardar(){const cliente=document.getElementById('memClienteId').value;if(!cliente){alert('Selecciona un cliente del buscador.');return;}const tipo=document.getElementById('memTipo').value;const inicio=document.getElementById('memInicio').value;const fin=document.getElementById('memFin').value;const notas=document.getElementById('memNotas').value||'';const id='M'+Date.now().toString(36);state.memberships.unshift({id,cliente,tipo,inicio,fin,notas});DB.save(state);this.renderTabla();alert('Membresía registrada.');},
status(m){const t=new Date().toISOString().slice(0,10);if(m.fin<t)return'vencida';const days=Math.ceil((new Date(m.fin)-new Date(t))/(1000*60*60*24));if(days<=5)return'próxima';return'activa';},
renderTabla(){const q=(document.getElementById('memSearch').value||'').toLowerCase();const st=(document.getElementById('memStatus').value||'').toLowerCase();const rows=state.memberships.filter(m=>{const c=state.customers.find(x=>x.id===m.cliente);const name=c?c.nombre:'';const okQ=name.toLowerCase().includes(q);const status=this.status(m);const okS=!st||st===status;return okQ&&okS;}).map(m=>{const c=state.customers.find(x=>x.id===m.cliente);const name=c?c.nombre:m.cliente;const status=this.status(m);const badge=status==='activa'?'<span class="badge ok">✅ Activa</span>':status==='próxima'?'<span class="badge warn">⏳ Próx. a vencer</span>':'<span class="badge bad">❌ Vencida</span>';return `<tr><td>${esc(name)}</td><td>${esc(m.tipo)}</td><td>${esc(m.inicio)}</td><td>${esc(m.fin)}</td><td>${badge}</td><td>${esc(m.notas||'')}</td></tr>`;}).join('');document.getElementById('memTabla').innerHTML=`<table><thead><tr><th>Cliente</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Notas</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Sin registros</td></tr>'}</tbody></table>`;}}
document.addEventListener('click',e=>{const box=document.getElementById('memClienteResults');const wrap=document.querySelector('.searchbox');if(box&&wrap&&!wrap.contains(e.target))box.classList.add('hidden');});
function addDays(start,n){const d=new Date(start);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}

const Cafeteria={render(){const cont=document.getElementById('cafGrid');cont.innerHTML='';const arr=state.products.filter(p=>(p.categoria||'').toLowerCase().includes('cafeter'));if(arr.length===0){cont.innerHTML='<div>No hay productos de cafetería.</div>';return;}const placeholder='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"600\" height=\"400\"><rect width=\"100%\" height=\"100%\" fill=\"%23f4f4f4\"/><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%23999\" font-size=\"28\" font-family=\"Arial\">☕ Sin imagen</text></svg>';arr.forEach(p=>{const card=document.createElement('div');card.className='card-prod';const img=p.img||placeholder;card.innerHTML=`<img src=\"${img}\" onerror=\"this.src='${placeholder}'\"><div class='pbody'><div class='pname'>☕ ${esc(p.nombre)}</div><div class='pprice'>${money(p.precio)}</div><div class='pbtns'><button class='btn small' onclick=\"Ventas.addCarrito('${p.sku}',1)\">➕ Agregar</button><button class='btn small outline' onclick=\"UI.show('ventas')\">➡️ Ir a cobrar</button></div></div>`;cont.appendChild(card);});}}

const Historial={openFiltros(){const m=document.getElementById('modalFiltros');m.classList.remove('hidden');m.setAttribute('aria-hidden','false');const escFn=e=>{if(e.key==='Escape'){Historial.closeFiltros();document.removeEventListener('keydown',escFn);}};document.addEventListener('keydown',escFn);m.addEventListener('click',e=>{if(e.target.id==='modalFiltros')Historial.closeFiltros();},{once:true});},
closeFiltros(){const m=document.getElementById('modalFiltros');m.classList.add('hidden');m.setAttribute('aria-hidden','true');},
applyFiltros(){this.renderTabla();this.closeFiltros();},
clearFiltros(){['histFechaIni','histFechaFin','histFolio','histCliente','histProducto'].forEach(id=>document.getElementById(id).value='');document.getElementById('histPago').value='';this.renderTabla();},
renderTabla(){const ini=document.getElementById('histFechaIni')?.value||'';const fin=document.getElementById('histFechaFin')?.value||'';const folio=(document.getElementById('histFolio')?.value||'').toLowerCase();const clienteQ=(document.getElementById('histCliente')?.value||'').toLowerCase();const prodQ=(document.getElementById('histProducto')?.value||'').toLowerCase();const rows=state.sales.filter(s=>{const f=s.fecha.slice(0,10);if(ini&&f<ini)return false;if(fin&&f>fin)return false;if(folio&&!s.folio.toLowerCase().includes(folio))return false;const cliente=(state.customers.find(c=>c.id===s.cliente)?.nombre||'').toLowerCase();if(clienteQ&&!cliente.includes(clienteQ))return false;if(prodQ&&!s.items.map(i=>i.nombre).join(' ').toLowerCase().includes(prodQ))return false;return true;}).map(s=>{const cli=state.customers.find(c=>c.id===s.cliente)?.nombre||'';const itemsStr=s.items.map(i=>`${i.nombre} x${i.qty}`).join(', ');return `<tr><td>${esc(s.folio)}</td><td>${s.fecha.slice(0,16).replace('T',' ')}</td><td>${esc(cli)}</td><td>${esc(itemsStr)}</td><td>${money(s.total)}</td><td><button class='btn small' onclick=\"Tickets.renderByFolio('${s.folio}')\">🖨️ Reimprimir</button></td></tr>`;}).join('');document.getElementById('histTabla').innerHTML=`<table><thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Items</th><th>Total</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="6">Sin ventas</td></tr>'}</tbody></table>`;},
exportCSV(){const rows=[['Folio','Fecha','Cliente','Items','Total','IVA','Costo','Ganancia']].concat(state.sales.map(s=>[s.folio,s.fecha,(state.customers.find(c=>c.id===s.cliente)?.nombre||''),s.items.map(i=>`${i.nombre} x${i.qty}`).join('; '),s.total,s.iva,(s.subtotalCosto||0),((s.total-s.iva)-(s.subtotalCosto||0))]));downloadCSV('historial_ventas.csv',rows);}}

const Config={guardar(){const iva=parseFloat(document.getElementById('cfgIVA').value||'16');const msj=document.getElementById('cfgMensaje').value||'Gracias por tu compra en Dinamita Gym 💥';state.settings.iva=isNaN(iva)?16:iva;state.settings.mensaje=msj;DB.save(state);alert('Configuración guardada.');},
reset(){state.settings.iva=16;state.settings.mensaje='Gracias por tu compra en Dinamita Gym 💥';state.settings.logo=DEFAULT_LOGO;DB.save(state);this.renderLogo();alert('Restablecido.');},
loadLogo(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{state.settings.logo=e.target.result;DB.save(state);this.renderLogo();};r.readAsDataURL(f);},
renderLogo(){document.getElementById('brandLogo').src=state.settings.logo||DEFAULT_LOGO;document.getElementById('ticketLogo').src=state.settings.logo||DEFAULT_LOGO;document.getElementById('cfgIVA').value=state.settings.iva||16;document.getElementById('cfgMensaje').value=state.settings.mensaje||'';}}

const Tickets={render(v){const lines=[];lines.push(center('🧾 DINAMITA GYM'));lines.push('Folio: '+v.folio);lines.push('Fecha: '+v.fecha.replace('T',' ').slice(0,16));const cname=(state.customers.find(c=>c.id===v.cliente)?.nombre)||'';lines.push('Cliente: '+cname);lines.push(repeat('-',32));for(const i of v.items){const name=truncate(i.nombre,18);const right=`x${i.qty} ${money(i.precio)}`;lines.push(padRight(name,22)+padLeft(right,10));}lines.push(repeat('-',32));lines.push(padRight('SUBTOTAL',20)+padLeft(money(v.subtotal),12));lines.push(padRight('IVA',20)+padLeft(money(v.iva),12));lines.push(padRight('TOTAL',20)+padLeft(money(v.total),12));lines.push(repeat('-',32));const nota=(v.notas&&v.notas.trim())?v.notas.trim():(state.settings.mensaje||'');if(nota)lines.push(nota);document.getElementById('ticketBody').textContent=lines.join('\n');},
renderByFolio(f){const v=state.sales.find(s=>s.folio===f);if(!v){alert('Venta no encontrada');return;}this.render(v);UI.show('ticket');},
print(){window.print();}}

function downloadCSV(filename,rows){const csv=rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}
window.addEventListener('DOMContentLoaded',UI.init);


// === v4.4 fully integrated ===

// CSV util
function downloadCSV(name, rows){
  const csv = rows.map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=name; a.click();
}

// Ticket print fix
window.TicketFix = { printVisible(){ const prev=document.getElementById('ticketPreview'); if(prev){ prev.style.display='block'; setTimeout(()=>{ window.print(); setTimeout(()=>prev.style.display='', 80); }, 40);} else { window.print(); } } };

// Cancel sale (Historial)
window.Historial = window.Historial||{};
Historial.cancelarVenta = function(folio){
  const v=(state.sales||[]).find(s=>s.folio===folio);
  if(!v){ alert('Venta no encontrada'); return; }
  if(v.status==='Cancelada'){ alert('Esta venta ya está cancelada'); return; }
  const motivo=prompt('Motivo de cancelación:');
  if(motivo===null) return;
  (v.items||[]).forEach(it=>{
    if(!it._isService && it.sku){
      const p=(state.products||[]).find(x=>x.sku===it.sku);
      if(p){ p.stock=(p.stock||0)+(it.qty||1); }
      (state.inventoryMovements=state.inventoryMovements||[]).push({tipo:'cancel_venta',fechaISO:new Date().toISOString(),sku:it.sku,qty:it.qty||1,referencia:v.folio,notas:motivo});
    }
    if(it._isService && it.mem && it.mem.id){
      const m=(state.memberships||[]).find(mm=>mm.id===it.mem.id);
      if(m){ m.estado='Cancelada'; m.cancelReason=motivo; m.canceledAt=new Date().toISOString(); }
    }
  });
  v.status='Cancelada'; v.canceledAt=new Date().toISOString(); v.cancelReason=motivo;
  DB.save(state);
  if(Historial.renderTabla) Historial.renderTabla(); 
  alert('Venta cancelada y stock repuesto.');
};

// Default client: Público General en nueva venta
window.Ventas = window.Ventas||{};
Ventas.setPublicoGeneral = function(){
  const sel=document.getElementById('ventaCliente');
  if(sel){
    const i=[...sel.options].findIndex(o=>/público/i.test((o.textContent||'').toLowerCase()));
    if(i>=0) sel.selectedIndex=i;
  }
};
document.addEventListener('DOMContentLoaded',()=> setTimeout(()=>Ventas.setPublicoGeneral(),150));
if(!Ventas.resetForm){ Ventas.resetForm=function(){ if(this.clearCart) this.clearCart(); Ventas.setPublicoGeneral(); }; }

// Miniaturas en listado de productos (Ventas)
if(!window.RenderHelpers){ window.RenderHelpers={}; }
RenderHelpers.productRow = function(p){
  const img = p.img ? `<img class="prod-thumb" loading="lazy" src="${p.img}">` : `<div class="prod-thumb" style="display:grid;place-items:center;color:#777;font-weight:700">?</div>`;
  return `<div class="row">
    <div style="display:flex;gap:8px;align-items:center">${img}<div><div class="name">${esc(p.nombre||'')}</div><div class="sub">Precio: ${money(p.precio||0)} • Stock: ${p.stock||0}</div></div></div>
    <div></div><div></div><div></div>
    <div><button class="btn small" onclick="Ventas.add('${p.sku}')">＋</button></div>
  </div>`;
};
(function(){
  const r=window.Ventas && Ventas.renderProductos;
  if(r){
    Ventas.renderProductos=function(){
      const list = Ventas.filteredProducts ? Ventas.filteredProducts() : (state.products||[]);
      const cont = document.getElementById('ventaLista');
      if(cont){ cont.innerHTML = list.map(RenderHelpers.productRow).join(''); }
      else { r.apply(Ventas, arguments); }
    };
  }
})();

// Compras (Registrar + Historial)
window.Compras = {
  _detalle: [],
  init(){
    const d=document.getElementById('cpFecha'); if(d) d.value=new Date().toISOString().slice(0,10);
    const inp=document.getElementById('cpBuscar'); if(inp){ inp.onkeydown=(e)=>{ if(e.key==='Enter'){ Compras.buscarYAgregar(inp.value.trim()); inp.value=''; } }; }
    this.renderTabla(); this.renderHistorial();
  },
  buscarYAgregar(q){
    if(!q) return;
    q=q.toLowerCase();
    const p=(state.products||[]).find(x=> (x.sku||'').toLowerCase()===q or (x.codigo||'').toLowerCase()===q or (x.nombre||'').toLowerCase().includes(q) );
    if(!p){ alert('Producto no encontrado'); return; }
    const i=this._detalle.findIndex(x=>x.sku===p.sku);
    if(i>=0) this._detalle[i].qty += 1;
    else this._detalle.push({sku:p.sku,nombre:p.nombre,qty:1,costoUnit:p.costo||0,actualizarCosto:true});
    this.renderTabla();
  },
  qty(sku,d){ const it=this._detalle.find(x=>x.sku===sku); if(!it) return; it.qty=Math.max(1,(it.qty||1)+d); this.renderTabla(); },
  cambiarCosto(sku,v){ const it=this._detalle.find(x=>x.sku===sku); if(it){ it.costoUnit=parseFloat(v)||0; this.renderTabla(); } },
  toggleCosto(sku){ const it=this._detalle.find(x=>x.sku===sku); if(it){ it.actualizarCosto=!it.actualizarCosto; this.renderTabla(); } },
  eliminar(sku){ this._detalle=this._detalle.filter(x=>x.sku!==sku); this.renderTabla(); },
  renderTabla(){
    const cont=document.getElementById('cpTabla'); if(!cont) return;
    const header='<div class="row" style="font-weight:700"><div>Producto</div><div>Cantidad</div><div>Costo unit</div><div>Subtotal</div><div>Actualizar costo</div><div>—</div></div>';
    const rows=this._detalle.map(it=>{
      const sub=(it.qty||0)*(it.costoUnit||0);
      return `<div class="row">
        <div>${esc(it.nombre)} <small>(${it.sku})</small></div>
        <div style="display:flex;gap:6px;align-items:center"><button class="btn small" onclick="Compras.qty('${it.sku}',-1)">–</button><b>${it.qty||1}</b><button class="btn small" onclick="Compras.qty('${it.sku}',1)">＋</button></div>
        <div><input type="number" step="0.01" value="${it.costoUnit||0}" onchange="Compras.cambiarCosto('${it.sku}', this.value)"></div>
        <div>${money(sub)}</div>
        <div><label><input type="checkbox" ${it.actualizarCosto?'checked':''} onchange="Compras.toggleCosto('${it.sku}')"> actualizar</label></div>
        <div><button class="btn small danger" onclick="Compras.eliminar('${it.sku}')">🗑️</button></div>
      </div>`;
    }).join('');
    cont.innerHTML = header + rows;
    const tEl=document.getElementById('cpTotal'); if(tEl){ tEl.textContent=money(this._detalle.reduce((t,it)=>t+(it.qty||0)*(it.costoUnit||0),0)); }
  },
  guardar(){
    if(!this._detalle.length){ alert('Agrega productos'); return; }
    const compra={
      id:'P'+Date.now().toString(36),
      fechaISO:(document.getElementById('cpFecha')?.value)||new Date().toISOString().slice(0,10),
      proveedorNombre:(document.getElementById('cpProv')?.value||'').trim()||null,
      folio:(document.getElementById('cpFolio')?.value||'').trim()||null,
      items: JSON.parse(JSON.stringify(this._detalle)),
      total: this._detalle.reduce((t,it)=>t+(it.qty||0)*(it.costoUnit||0),0),
      status:'Activa'
    };
    compra.items.forEach(it=>{
      const p=(state.products||[]).find(x=>x.sku===it.sku);
      if(p){
        const stockPrev=p.stock||0, costoPrev=p.costo||0;
        p.stock=stockPrev+(it.qty||0);
        if(it.actualizarCosto){
          const den=stockPrev+(it.qty||0);
          p.costo = den>0 ? ((stockPrev*costoPrev + (it.qty||0)*(it.costoUnit||0))/den) : (it.costoUnit||costoPrev);
        }
      }
      (state.inventoryMovements=state.inventoryMovements||[]).push({tipo:'compra',fechaISO:compra.fechaISO,sku:it.sku,qty:it.qty||0,costoUnit:it.costoUnit||0,referencia:compra.id});
    });
    (state.purchases=state.purchases||[]).unshift(compra);
    DB.save(state); this._detalle=[]; this.renderTabla(); this.renderHistorial();
    alert('Compra guardada');
  },
  renderHistorial(){
    const cont=document.getElementById('cpHistorial'); if(!cont) return;
    const list=(state.purchases||[]);
    cont.innerHTML = list.map(c=>`<div class="row" style="grid-template-columns:140px 1fr 1fr 120px 120px;">
      <div>${(c.fechaISO||'').slice(0,10)}</div>
      <div>${esc(c.folio||'-')}</div>
      <div>${esc(c.proveedorNombre||'-')}</div>
      <div>${c.items.length} items</div>
      <div>${money(c.total||0)}</div>
    </div>`).join('') || '<em>Sin compras registradas</em>';
  },
  exportarCSV(){
    const rows=[['Fecha','Folio','Proveedor','SKU','Producto','Cantidad','CostoUnit','Subtotal','Total']];
    (state.purchases||[]).forEach(c=> c.items.forEach(it=> rows.push([(c.fechaISO||'').slice(0,10), c.folio||'', c.proveedorNombre||'', it.sku, it.nombre, it.qty||0, it.costoUnit||0, (it.qty||0)*(it.costoUnit||0), c.total||0])));
    downloadCSV('compras.csv', rows);
  }
};
document.addEventListener('DOMContentLoaded',()=>{ if(document.getElementById('compras')) Compras.init(); });

