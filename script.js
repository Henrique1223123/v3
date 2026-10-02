(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const demoUser = { name: "Mariana Oliveira", email: "mariana@email.com", password: "escola123" };
  const student = { name: "Pedro Oliveira", school: "Escola Municipal Caminhos do Saber", className: "5º ano A" };
  const vehicle = { id: "Van Escolar 03", driver: "Carlos Mendes", plate: "ABC1D23" };
  const stops = [
    { name: "Garagem do transporte escolar", short: "Garagem", type: "origin" },
    { name: "Rua das Flores", short: "Rua das Flores", type: "stop" },
    { name: "Avenida Brasil", short: "Av. Brasil", type: "stop" },
    { name: "Escola Municipal Caminhos do Saber", short: "Escola", type: "school" }
  ];
  const initialNotices = [
    { id: 1, title: "Pequeno atraso na rota", category: "delay", label: "Atraso", date: "02/10/2026", time: "07h10", message: "O transporte escolar está com um atraso estimado de 10 minutos devido às condições do trânsito. A previsão de chegada à escola foi atualizada para 07h40.", read: false },
    { id: 2, title: "Atualização do horário", category: "info", label: "Informação", date: "01/10/2026", time: "18h00", message: "Informamos que os horários de saída do transporte escolar permanecem conforme o cronograma habitual.", read: true },
    { id: 3, title: "Alteração temporária de trajeto", category: "route", label: "Alteração de rota", date: "30/09/2026", time: "16h30", message: "Devido a uma manutenção viária, o veículo utilizará temporariamente uma rota alternativa.", read: true }
  ];
  let notices = loadNotices();
  let stage = 1;
  let page = "dashboard";
  let loggedIn = false;
  let timer = null;
  let lastUpdated = new Date();
  const loginScreen = $("#login-screen");
  const app = $("#app");
  const content = $("#page-content");

  function loadNotices() {
    try {
      const saved = localStorage.getItem("rota-escolar-notices");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === initialNotices.length) return parsed;
      }
    } catch (_) {}
    return initialNotices.map(item => ({ ...item }));
  }
  function saveNotices() {
    try { localStorage.setItem("rota-escolar-notices", JSON.stringify(notices)); } catch (_) {}
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  }
  function currentStatus() {
    if (stage === 0) return { label: "Aguardando saída", color: "gray" };
    if (stage === 3) return { label: "Concluído", color: "green" };
    if (stage === 2) return { label: "Próximo da escola", color: "blue" };
    if (notices.some(n => n.category === "delay" && n.id === 1)) return { label: "A caminho", color: "green" };
    return { label: "A caminho", color: "green" };
  }
  function eta() {
    if (stage === 0) return "07h30";
    if (stage === 1) return "07h30";
    if (stage === 2) return "07h40";
    return "Concluído";
  }
  function remaining() {
    if (stage === 0) return "Aguardando o início da viagem";
    if (stage === 1) return "Previsão demonstrativa · 20 min restantes";
    if (stage === 2) return "Previsão demonstrativa · 10 min restantes";
    return "O percurso foi finalizado";
  }
  function updatedText() {
    return lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  }
  function statusHTML() {
    const s = currentStatus();
    return `<span class="status ${s.color}">${s.label}</span>`;
  }
  function setPage(next) {
    page = next;
    app.classList.remove("menu-open");
    $("#mobile-menu").setAttribute("aria-expanded", "false");
    render();
    $$(".nav-link").forEach(button => {
      const active = button.dataset.page === page;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }
  function progressHTML() {
    const positions = [8, 36, 64, 92];
    return `<div class="route-progress" aria-label="Progresso do trajeto">${stops.map((stop, i) => {
      const state = i < stage ? "done" : i === stage ? "current" : "";
      return `<div class="progress-stop ${state}"><span class="stop-dot"></span>${escapeHTML(stop.short)}<small>${i < stage ? "Concluído" : i === stage ? "Atual" : "Pendente"}</small></div>`;
    }).join("")}<span class="progress-fill" style="width:${Math.max(0, (positions[Math.max(0, stage)] - 8))}%"></span></div>`;
  }
  function recentNoticeHTML(notice) {
    return `<div class="notice-preview"><span class="notice-symbol ${notice.category === "info" ? "info" : ""}">${notice.category === "delay" ? "!" : notice.category === "route" ? "↗" : "i"}</span><div class="notice-preview-main"><strong>${escapeHTML(notice.title)}</strong><span>${escapeHTML(notice.date)} · ${escapeHTML(notice.label)}</span></div>${notice.read ? "" : '<span class="unread-dot" aria-label="Não lido"></span>'}</div>`;
  }
  function dashboard() {
    const recent = [...notices].sort((a,b) => b.id-a.id).slice(0,2);
    return `<div class="page-heading"><div><h1>Acompanhamento do transporte</h1><p>Veja a situação atual do transporte escolar do Pedro.</p></div><span class="demo-badge">Demonstração</span></div>
      <div class="dashboard-grid">
        <section class="card student-card"><div class="student-avatar" aria-hidden="true">♙</div><div class="student-main"><span class="muted-label">ALUNO(A) ACOMPANHADO(A)</span><strong>${student.name}</strong></div><div class="student-details"><div class="detail-item"><span>Escola</span><strong>${student.school}</strong></div><div class="detail-item"><span>Turma</span><strong>${student.className}</strong></div></div></section>
        <section class="card vehicle-card"><div class="card-top"><div><h2 class="card-title">Transporte escolar</h2><p class="card-subtitle">Informações do veículo</p></div>${statusHTML()}</div><div class="vehicle-info"><div class="vehicle-icon" aria-hidden="true">🚐</div><div><strong>${vehicle.id}</strong><span>Motorista: ${vehicle.driver}</span></div></div><div class="vehicle-meta"><div class="meta-block"><span>Placa fictícia</span><strong>${vehicle.plate}</strong></div><div class="meta-block"><span>Última atualização</span><strong>${updatedText()}</strong></div></div></section>
        <section class="card arrival-card"><div><h2 class="card-title">Previsão de chegada</h2><p class="card-subtitle">Horário estimado (simulado)</p><div class="arrival-time">${eta()}</div><div class="arrival-remaining">${remaining()}</div></div><div class="arrival-destination"><span>⌖</span>${student.school}</div></section>
        <section class="card progress-card"><div class="section-head"><div><h2 class="card-title">Progresso da viagem</h2><p class="card-subtitle">Acompanhe as etapas do percurso</p></div><button class="text-link" data-page="route">Ver trajeto →</button></div>${progressHTML()}<div class="simulation-row"><span class="simulation-note">● Simulação local — não utiliza GPS real</span><div class="button-group"><button class="btn btn-outline btn-small" id="reset-sim">↺ Reiniciar</button><button class="btn btn-primary btn-small" id="next-stage" ${stage>=3?"disabled":""}>Avançar etapa →</button></div></div></section>
        <section class="card recent-card"><div class="section-head"><div><h2 class="card-title">Avisos recentes</h2><p class="card-subtitle">Comunicados sobre o transporte</p></div><button class="text-link" data-page="notices">Ver todos os avisos →</button></div>${recent.map(recentNoticeHTML).join("")}</section>
      </div>`;
  }
  function markerStyle(index) {
    return [
      "left:13%;top:76%",
      "left:38%;top:57%",
      "left:66%;top:39%",
      "left:86%;top:17%"
    ][index];
  }
  function route() {
    const markerIndex = Math.max(0, Math.min(stage, 3));
    const marker = markerStyle(markerIndex);
    return `<div class="page-heading"><div><h1>Trajeto do transporte</h1><p>Consulte o percurso e os pontos de parada do veículo.</p></div><span class="demo-badge">Localização simulada</span></div>
      <div class="map-layout"><section class="card map-card"><div class="map-canvas" role="img" aria-label="Mapa esquemático com garagem, duas paradas, veículo e escola"><div class="map-block block-a"></div><div class="map-block block-b"></div><div class="map-block block-c"></div><div class="map-block block-d"></div>
        <svg class="map-route" viewBox="0 0 600 360" preserveAspectRatio="none" aria-hidden="true"><path d="M78 274 L222 205 L395 140 L516 61"/><path class="route-line" d="M78 274 L222 205 L395 140 L516 61"/></svg>
        ${stops.map((stop,i)=>`<div class="map-marker ${i===markerIndex?"vehicle":""} ${i===3?"school":""}" style="${i===markerIndex?marker:markerStyle(i)}"><span class="marker-dot">${i===markerIndex?"🚐":""}</span><span class="marker-label">${escapeHTML(stop.short)}</span></div>`).join("")}
      </div><div class="map-legend"><span class="legend-item"><i class="legend-dot"></i> Parada</span><span class="legend-item"><i class="legend-dot vehicle"></i> Veículo</span><span class="legend-item"><i class="legend-dot school"></i> Escola</span></div></section>
      <div class="route-side"><section class="card"><h2 class="card-title">Etapas do trajeto</h2><p class="card-subtitle">Posição atual: ${escapeHTML(stops[stage].name)}</p><ol class="route-list">${stops.map((stop,i)=>`<li class="${i<stage?"done":i===stage?"current":""}"><span class="list-dot"></span><div><strong>${escapeHTML(stop.name)}</strong><span>${i<stage?"Etapa concluída":i===stage?"Posição atual":"Próxima etapa"}</span></div></li>`).join("")}</ol></section>
      <section class="card"><h2 class="card-title">Dados da viagem</h2><p class="card-subtitle">Informações demonstrativas</p><div class="route-facts" style="margin-top:15px"><div class="route-fact"><span>Veículo</span><strong>${vehicle.id}</strong></div><div class="route-fact"><span>Motorista</span><strong>${vehicle.driver}</strong></div><div class="route-fact"><span>Status</span><strong>${currentStatus().label}</strong></div><div class="route-fact"><span>Previsão</span><strong>${eta()}</strong></div><div class="route-fact"><span>Atualizado às</span><strong>${updatedText()}</strong></div></div><button class="btn btn-primary btn-full" style="margin-top:17px" data-page="dashboard">← Voltar ao acompanhamento</button></section></div></div>`;
  }
  function noticeCard(n) {
    const icon = n.category==="delay"?"!":n.category==="route"?"↗":n.category==="done"?"✓":"i";
    return `<article class="notice-card ${n.read?"":"unread"}"><div class="notice-top"><div class="notice-title-wrap"><span class="notice-icon ${n.category}">${icon}</span><div><h3>${escapeHTML(n.title)}</h3><span class="notice-date">${escapeHTML(n.date)} · ${escapeHTML(n.time)}</span></div></div><span class="category ${n.category}">${escapeHTML(n.label)}</span></div><p class="notice-message">${escapeHTML(n.message)}</p><div class="notice-actions">${n.read?'<span class="notice-date">✓ Lido</span>':`<button class="mark-read" data-read="${n.id}">Marcar como lido</button>`}</div></article>`;
  }
  function noticesPage() {
    const filter = window.noticeFilter || "all";
    const filters = [{id:"all",label:"Todos"},{id:"unread",label:"Não lidos"},{id:"delay",label:"Atrasos"},{id:"route",label:"Alterações de rota"},{id:"info",label:"Informações"}];
    const filtered = [...notices].sort((a,b)=>b.id-a.id).filter(n=>filter==="all"||(filter==="unread"?!n.read:n.category===filter));
    const unread = notices.filter(n=>!n.read).length;
    return `<div class="page-heading"><div><h1>Avisos do transporte</h1><p>Acompanhe as informações e atualizações da viagem.</p></div><span class="demo-badge">Central de avisos</span></div>
      <div class="notice-summary"><strong>${unread}</strong> ${unread===1?"aviso não lido":"avisos não lidos"} <span>·</span> ${notices.length} comunicados no total <span style="margin-left:auto"></span><button id="mark-all" class="text-link" ${unread===0?"disabled":""}>Marcar todos como lidos</button></div>
      <div class="filters" role="group" aria-label="Filtrar avisos">${filters.map(f=>`<button class="filter-btn ${filter===f.id?"active":""}" data-filter="${f.id}" aria-pressed="${filter===f.id}">${f.label}</button>`).join("")}</div>
      <div class="notice-list">${filtered.length?filtered.map(noticeCard).join(""):'<div class="empty-state"><div class="empty-icon">▤</div><strong>Nenhum aviso encontrado</strong><p style="margin:5px 0 0">Não há comunicados para este filtro.</p></div>'}</div>`;
  }
  function render() {
    content.innerHTML = page==="dashboard"?dashboard():page==="route"?route():noticesPage();
    content.focus({preventScroll:true});
    const next=$("#next-stage");
    if(next) next.addEventListener("click",advance);
    const reset=$("#reset-sim");
    if(reset) reset.addEventListener("click",()=>{stage=0;lastUpdated=new Date();render();});
    $$("[data-page]",content).forEach(el=>el.addEventListener("click",()=>setPage(el.dataset.page)));
    $$("[data-filter]",content).forEach(el=>el.addEventListener("click",()=>{window.noticeFilter=el.dataset.filter;render();}));
    $$("[data-read]",content).forEach(el=>el.addEventListener("click",()=>{const n=notices.find(item=>item.id===Number(el.dataset.read));if(n){n.read=true;saveNotices();render();updateUnread();}}));
    const markAll=$("#mark-all");
    if(markAll)markAll.addEventListener("click",()=>{notices.forEach(n=>n.read=true);saveNotices();render();updateUnread();});
  }
  function advance() {
    if(stage<3){stage++;lastUpdated=new Date();if(stage===2&&!notices.some(n=>n.id===4)){notices.unshift({id:4,title:"Transporte próximo da escola",category:"info",label:"Informação",date:"02/10/2026",time:updatedText(),message:"O veículo está próximo da escola. Esta atualização faz parte da simulação demonstrativa.",read:false});saveNotices();}if(stage===3&&!notices.some(n=>n.id===5)){notices.unshift({id:5,title:"Trajeto concluído",category:"done",label:"Conclusão",date:"02/10/2026",time:updatedText(),message:"A simulação indica que o transporte chegou ao destino. Esta informação não representa uma viagem real.",read:false});saveNotices();}render();updateUnread();}
  }
  function updateUnread(){const count=notices.filter(n=>!n.read).length;const badge=$("#nav-unread");badge.textContent=count;badge.hidden=count===0;}
  function login(email,password) {
    if(email.trim().toLowerCase()===demoUser.email&&password===demoUser.password){
      loggedIn=true;loginScreen.hidden=true;app.hidden=false;stage=1;lastUpdated=new Date();setPage("dashboard");
    }else{$("#login-error").textContent="E-mail ou senha incorretos. Confira as credenciais de demonstração.";}
  }
  function logout(){loggedIn=false;app.hidden=true;loginScreen.hidden=false;$("#login-form").reset();$("#login-error").textContent="";$("#password").type="password";$("#toggle-password").setAttribute("aria-label","Mostrar senha");if(timer)clearInterval(timer);}
  $("#login-form").addEventListener("submit",event=>{event.preventDefault();const email=$("#email").value;const password=$("#password").value;if(!email||!password){$("#login-error").textContent="Preencha o e-mail e a senha para continuar.";return;}login(email,password);});
  $("#toggle-password").addEventListener("click",()=>{const input=$("#password");const show=input.type==="password";input.type=show?"text":"password";$("#toggle-password").setAttribute("aria-label",show?"Ocultar senha":"Mostrar senha");});
  $("#logout").addEventListener("click",logout);$("#sidebar-logout").addEventListener("click",logout);
  $("#mobile-menu").addEventListener("click",()=>{const open=app.classList.toggle("menu-open");$("#mobile-menu").setAttribute("aria-expanded",String(open));});
  $("#mobile-overlay").addEventListener("click",()=>{app.classList.remove("menu-open");$("#mobile-menu").setAttribute("aria-expanded","false");});
  $$(".nav-link").forEach(button=>button.addEventListener("click",()=>setPage(button.dataset.page)));
  updateUnread();
})();