// ---------- Helpers ----------
const api = {
  async get(url) { const r = await fetch(url); return r.json(); },
  async send(url, method, body) {
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.erro || 'Erro na operação');
    return data;
  },
  post(u, b) { return this.send(u, 'POST', b); },
  put(u, b) { return this.send(u, 'PUT', b); },
  del(u) { return this.send(u, 'DELETE'); }
};

const el = (id) => document.getElementById(id);
const view = () => el('view');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const moeda = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
const dataBR = (d) => { if (!d) return '-'; const s = String(d).slice(0, 10).split('-'); return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : d; };

function toast(msg, erro = false) {
  const t = el('toast');
  t.textContent = msg;
  t.className = 'toast' + (erro ? ' erro' : '');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function abrirModal(titulo, html) {
  el('modal-title').textContent = titulo;
  el('modal-body').innerHTML = html;
  el('modal').classList.remove('hidden');
}
function fecharModal() { el('modal').classList.add('hidden'); }
el('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') fecharModal(); });

// ---------- Mobile nav ----------
(function () {
  const toggle  = document.getElementById('nav-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle) return;

  function openNav() {
    sidebar.classList.add('open');
    toggle.classList.add('open');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    sidebar.classList.remove('open');
    toggle.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () =>
    sidebar.classList.contains('open') ? closeNav() : openNav());
  overlay.addEventListener('click', closeNav);
  window._closeNav = closeNav;
})();

// ---------- Router ----------
const views = {};
function navegar(nome) {
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.toggle('active', a.dataset.view === nome));
  if (typeof window._closeNav === 'function') window._closeNav();
  (views[nome] || views.dashboard)();
}
document.querySelectorAll('.sidebar nav a').forEach(a =>
  a.addEventListener('click', () => navegar(a.dataset.view)));

// ---------- Dashboard ----------
views.dashboard = async () => {
  const d = await api.get('/api/dashboard');
  const totalOrdens = (d.statusBreakdown || []).reduce((s, r) => s + r.c, 0);
  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  view().innerHTML = `
    <div class="page-head">
      <h1>Painel</h1>
      <span class="muted" style="font-size:13px">${dataHoje}</span>
    </div>

    <div class="dash-kpis">
      <div class="kpi-card clickable" onclick="navegar('clientes')">
        <div class="kpi-icon kpi-verde">👥</div>
        <div class="kpi-body"><div class="kpi-num">${d.clientes}</div><div class="kpi-label">Clientes</div></div>
      </div>
      <div class="kpi-card clickable" onclick="navegar('equipamentos')">
        <div class="kpi-icon kpi-azul">🔧</div>
        <div class="kpi-body"><div class="kpi-num">${d.equipamentos}</div><div class="kpi-label">Equipamentos</div></div>
      </div>
      <div class="kpi-card clickable" onclick="navegar('ordens')">
        <div class="kpi-icon kpi-laranja">📋</div>
        <div class="kpi-body"><div class="kpi-num">${d.ordensAbertas}</div><div class="kpi-label">Em andamento</div></div>
      </div>
      <div class="kpi-card clickable ${d.estoqueBaixo ? 'kpi-alert' : ''}" onclick="navegar('estoque')">
        <div class="kpi-icon kpi-vermelho">📦</div>
        <div class="kpi-body"><div class="kpi-num">${d.estoqueBaixo}</div><div class="kpi-label">Estoque baixo</div></div>
      </div>
    </div>

    <div class="dash-kpis" style="margin-bottom:24px">
      <div class="kpi-card">
        <div class="kpi-icon kpi-verde">💰</div>
        <div class="kpi-body"><div class="kpi-num kpi-num-sm">${moeda(d.receitaTotal)}</div><div class="kpi-label">Receita total</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-verde">📈</div>
        <div class="kpi-body"><div class="kpi-num kpi-num-sm">${moeda(d.receitaMes)}</div><div class="kpi-label">Receita do mês</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-azul">📅</div>
        <div class="kpi-body"><div class="kpi-num">${d.osMes}</div><div class="kpi-label">OS este mês</div></div>
      </div>
      <div class="kpi-card clickable" onclick="navegar('ordens')">
        <div class="kpi-icon kpi-laranja">🚚</div>
        <div class="kpi-body"><div class="kpi-num">${d.aEntregar}</div><div class="kpi-label">Prontas p/ entrega</div></div>
      </div>
    </div>

    <div class="dash-grid-2">
      <div>
        <div class="dash-section-title">Status das ordens</div>
        <div class="panel">
          ${totalOrdens === 0
            ? '<p class="empty" style="padding:24px">Nenhuma ordem cadastrada ainda</p>'
            : ['aberta','em_andamento','concluida','entregue'].map(s => {
                const entry = (d.statusBreakdown || []).find(x => x.status === s) || { c: 0 };
                const pct = totalOrdens > 0 ? Math.round(entry.c / totalOrdens * 100) : 0;
                return `
                  <div class="status-row">
                    <div><span class="badge ${s}">${statusLabel(s)}</span></div>
                    <div class="status-bar-wrap">
                      <div class="status-bar-fill ${s}" style="width:${pct}%"></div>
                    </div>
                    <div class="status-row-num">${entry.c}</div>
                  </div>`;
              }).join('')
          }
        </div>
      </div>
      <div>
        <div class="dash-section-title">Peças com estoque baixo</div>
        <div class="panel">
          ${d.estoqueBaixoItens && d.estoqueBaixoItens.length
            ? d.estoqueBaixoItens.map(p => {
                const pct = p.quantidade_minima > 0 ? Math.min(100, Math.round(p.quantidade / p.quantidade_minima * 100)) : 0;
                return `
                  <div class="stock-alert-item">
                    <div>
                      <span class="stock-alert-name">${esc(p.nome)}</span>
                      <span class="muted stock-alert-cat">${esc(p.categoria || '—')}</span>
                    </div>
                    <div class="stock-alert-bar-wrap">
                      <div class="stock-alert-bar" style="width:${pct}%"></div>
                    </div>
                    <div class="stock-alert-qty">${p.quantidade}/${p.quantidade_minima}</div>
                  </div>`;
              }).join('')
            : '<p class="empty" style="padding:24px">Estoque OK 🎉</p>'
          }
        </div>
      </div>
    </div>

    <div class="dash-grid-2">
      <div>
        <div class="dash-section-title">Próximas entregas (14 dias)</div>
        <div class="panel">
          ${d.proximasEntregas && d.proximasEntregas.length
            ? d.proximasEntregas.map(o => `
                <div class="delivery-item" onclick="verOrdem(${o.id})">
                  <div class="delivery-date">${dataBR(o.data_previsao)}</div>
                  <div class="delivery-info">
                    <strong>${esc(o.numero || '#' + o.id)}</strong>
                    <span class="muted"> — ${esc(o.cliente_nome)}</span>
                  </div>
                  <span class="badge ${o.status}">${statusLabel(o.status)}</span>
                </div>`).join('')
            : '<p class="empty" style="padding:24px">Sem entregas previstas nos próximos 14 dias</p>'
          }
        </div>
      </div>
      <div>
        <div class="dash-section-title">Últimas ordens de serviço</div>
        <div class="panel">
          ${d.recentesOrdens && d.recentesOrdens.length
            ? `<table>
                <thead><tr><th>OS</th><th>Cliente</th><th>Entrada</th><th>Status</th></tr></thead>
                <tbody>${d.recentesOrdens.map(o => `
                  <tr style="cursor:pointer" onclick="verOrdem(${o.id})">
                    <td><strong>${esc(o.numero || '#' + o.id)}</strong></td>
                    <td>${esc(o.cliente_nome)}</td>
                    <td>${dataBR(o.data_entrada)}</td>
                    <td><span class="badge ${o.status}">${statusLabel(o.status)}</span></td>
                  </tr>`).join('')}
                </tbody>
               </table>`
            : '<p class="empty" style="padding:24px">Nenhuma ordem cadastrada</p>'
          }
        </div>
      </div>
    </div>`;
};

function statusLabel(s) {
  return { aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída', entregue: 'Entregue' }[s] || s;
}

// ---------- Clientes ----------
views.clientes = async () => {
  view().innerHTML = `
    <div class="page-head"><h1>Clientes</h1>
      <div class="actions"><button class="btn" onclick="formCliente()">+ Novo Cliente</button></div></div>
    <div class="toolbar"><input id="busca-cli" placeholder="Buscar por nome, CPF, telefone ou e-mail..."></div>
    <div class="panel" id="lista-cli"></div>`;
  el('busca-cli').addEventListener('input', (e) => carregarClientes(e.target.value));
  carregarClientes();
};

async function carregarClientes(busca = '') {
  const rows = await api.get('/api/clientes' + (busca ? '?busca=' + encodeURIComponent(busca) : ''));
  el('lista-cli').innerHTML = `
    <table><thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Marketing</th><th></th></tr></thead>
    <tbody>${rows.length ? rows.map(c => `
      <tr>
        <td style="cursor:pointer" onclick="verCliente(${c.id})"><strong>${esc(c.nome)}</strong></td>
        <td>${esc(c.telefone)}</td><td>${esc(c.email)}</td>
        <td>${c.aceita_marketing ? '<span class="badge ok">Sim</span>' : '<span class="badge entregue">Não</span>'}</td>
        <td><div class="row-actions">
          <button class="btn btn-sm btn-sec" onclick="formCliente(${c.id})">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="excluirCliente(${c.id})">Excluir</button>
        </div></td>
      </tr>`).join('') : '<tr><td colspan="5" class="empty">Nenhum cliente encontrado</td></tr>'}
    </tbody></table>`;
}

async function formCliente(id) {
  const c = id ? await api.get('/api/clientes/' + id) : {};
  abrirModal(id ? 'Editar Cliente' : 'Novo Cliente', `
    <div class="field"><label>Nome *</label><input id="f-nome" value="${esc(c.nome)}"></div>
    <div class="grid-2">
      <div class="field"><label>CPF</label><input id="f-cpf" value="${esc(c.cpf)}"></div>
      <div class="field"><label>Telefone</label><input id="f-tel" value="${esc(c.telefone)}"></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>E-mail</label><input id="f-email" value="${esc(c.email)}"></div>
      <div class="field"><label>Data de nascimento</label><input id="f-nasc" type="date" value="${esc(c.data_nascimento)}"></div>
    </div>
    <div class="field"><label>Endereço</label><input id="f-end" value="${esc(c.endereco)}"></div>
    <div class="field"><label>Observações</label><textarea id="f-obs">${esc(c.observacoes)}</textarea></div>
    <div class="field check"><input type="checkbox" id="f-mkt" ${c.aceita_marketing === 0 ? '' : 'checked'}>
      <label style="margin:0">Aceita receber contatos de marketing</label></div>
    <div class="modal-foot">
      <button class="btn btn-sec" onclick="fecharModal()">Cancelar</button>
      <button class="btn" onclick="salvarCliente(${id || 0})">Salvar</button>
    </div>`);
}

async function salvarCliente(id) {
  const body = {
    nome: el('f-nome').value.trim(), cpf: el('f-cpf').value.trim(),
    telefone: el('f-tel').value.trim(), email: el('f-email').value.trim(),
    endereco: el('f-end').value.trim(), data_nascimento: el('f-nasc').value,
    observacoes: el('f-obs').value.trim(), aceita_marketing: el('f-mkt').checked
  };
  if (!body.nome) return toast('Informe o nome', true);
  try {
    await (id ? api.put('/api/clientes/' + id, body) : api.post('/api/clientes', body));
    fecharModal(); toast('Cliente salvo'); carregarClientes();
  } catch (e) { toast(e.message, true); }
}

async function excluirCliente(id) {
  if (!confirm('Excluir este cliente e todos os seus equipamentos e ordens?')) return;
  await api.del('/api/clientes/' + id); toast('Cliente excluído'); carregarClientes();
}

async function verCliente(id) {
  const c = await api.get('/api/clientes/' + id);
  abrirModal('Cliente: ' + c.nome, `
    <p class="muted">${esc(c.telefone)} ${c.email ? '• ' + esc(c.email) : ''}</p>
    <p class="muted">${esc(c.endereco)}</p>
    ${c.observacoes ? `<p style="margin-top:8px">${esc(c.observacoes)}</p>` : ''}
    <div class="section-title">Equipamentos</div>
    <button class="btn btn-sm" onclick="formEquipamento(0, ${c.id})">+ Adicionar equipamento</button>
    <div class="panel" style="margin-top:10px">
      <table><tbody>${c.equipamentos.length ? c.equipamentos.map(e => `
        <tr><td>${esc(e.tipo)} — ${esc(e.marca)} ${esc(e.modelo)}</td>
        <td class="muted">${e.fps ? e.fps + ' FPS' : ''} ${e.numero_serie ? '• Sér: ' + esc(e.numero_serie) : ''}</td></tr>`).join('')
        : '<tr><td class="empty">Nenhum equipamento</td></tr>'}</tbody></table>
    </div>
    <div class="section-title">Ordens de serviço</div>
    <div class="panel">
      <table><tbody>${c.ordens.length ? c.ordens.map(o => `
        <tr style="cursor:pointer" onclick="verOrdem(${o.id})"><td>${esc(o.numero || '#' + o.id)}</td>
        <td>${dataBR(o.data_entrada)}</td><td><span class="badge ${o.status}">${statusLabel(o.status)}</span></td></tr>`).join('')
        : '<tr><td class="empty">Nenhuma ordem</td></tr>'}</tbody></table>
    </div>`);
}

// ---------- Equipamentos ----------
views.equipamentos = async () => {
  view().innerHTML = `
    <div class="page-head"><h1>Equipamentos</h1>
      <div class="actions"><button class="btn" onclick="formEquipamento()">+ Novo Equipamento</button></div></div>
    <div class="panel" id="lista-eq"></div>`;
  const rows = await api.get('/api/equipamentos');
  el('lista-eq').innerHTML = `
    <table><thead><tr><th>Cliente</th><th>Tipo</th><th>Marca/Modelo</th><th>Nº Série</th><th>FPS</th><th></th></tr></thead>
    <tbody>${rows.length ? rows.map(e => `
      <tr><td>${esc(e.cliente_nome)}</td><td>${esc(e.tipo)}</td>
      <td>${esc(e.marca)} ${esc(e.modelo)}</td><td>${esc(e.numero_serie)}</td><td>${e.fps || '-'}</td>
      <td><div class="row-actions">
        <button class="btn btn-sm btn-sec" onclick="formEquipamento(${e.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="excluirEquip(${e.id})">Excluir</button>
      </div></td></tr>`).join('') : '<tr><td colspan="6" class="empty">Nenhum equipamento cadastrado</td></tr>'}
    </tbody></table>`;
};

async function formEquipamento(id = 0, clienteFixo = 0) {
  const clientes = await api.get('/api/clientes');
  let e = {};
  if (id) { const all = await api.get('/api/equipamentos'); e = all.find(x => x.id === id) || {}; }
  const opts = clientes.map(c => `<option value="${c.id}" ${(clienteFixo || e.cliente_id) === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');
  abrirModal(id ? 'Editar Equipamento' : 'Novo Equipamento', `
    <div class="field"><label>Cliente *</label><select id="e-cli" ${id || clienteFixo ? 'disabled' : ''}>${opts}</select></div>
    <div class="grid-2">
      <div class="field"><label>Tipo</label><input id="e-tipo" value="${esc(e.tipo)}" placeholder="Rifle, Pistola, Sniper..."></div>
      <div class="field"><label>FPS</label><input id="e-fps" type="number" value="${esc(e.fps)}"></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>Marca</label><input id="e-marca" value="${esc(e.marca)}"></div>
      <div class="field"><label>Modelo</label><input id="e-modelo" value="${esc(e.modelo)}"></div>
    </div>
    <div class="field"><label>Número de série</label><input id="e-serie" value="${esc(e.numero_serie)}"></div>
    <div class="field"><label>Observações</label><textarea id="e-obs">${esc(e.observacoes)}</textarea></div>
    <div class="modal-foot">
      <button class="btn btn-sec" onclick="fecharModal()">Cancelar</button>
      <button class="btn" onclick="salvarEquip(${id}, ${clienteFixo})">Salvar</button>
    </div>`);
}

async function salvarEquip(id, clienteFixo) {
  const body = {
    cliente_id: clienteFixo || Number(el('e-cli').value),
    tipo: el('e-tipo').value.trim(), marca: el('e-marca').value.trim(),
    modelo: el('e-modelo').value.trim(), numero_serie: el('e-serie').value.trim(),
    fps: el('e-fps').value ? Number(el('e-fps').value) : null, observacoes: el('e-obs').value.trim()
  };
  try {
    await (id ? api.put('/api/equipamentos/' + id, body) : api.post('/api/equipamentos', body));
    fecharModal(); toast('Equipamento salvo');
    if (clienteFixo) verCliente(clienteFixo); else navegar('equipamentos');
  } catch (e) { toast(e.message, true); }
}

async function excluirEquip(id) {
  if (!confirm('Excluir este equipamento?')) return;
  await api.del('/api/equipamentos/' + id); toast('Excluído'); navegar('equipamentos');
}

// ---------- Estoque ----------
views.estoque = async () => {
  view().innerHTML = `
    <div class="page-head"><h1>Estoque de Peças</h1>
      <div class="actions"><button class="btn" onclick="formPeca()">+ Nova Peça</button></div></div>
    <div class="toolbar"><input id="busca-pc" placeholder="Buscar por nome, código ou categoria..."></div>
    <div class="panel" id="lista-pc"></div>`;
  el('busca-pc').addEventListener('input', (e) => carregarPecas(e.target.value));
  carregarPecas();
};

async function carregarPecas(busca = '') {
  const rows = await api.get('/api/pecas' + (busca ? '?busca=' + encodeURIComponent(busca) : ''));
  el('lista-pc').innerHTML = `
    <table><thead><tr><th>Peça</th><th>Código</th><th>Categoria</th><th>Qtd</th><th>Preço</th><th>Local</th><th></th></tr></thead>
    <tbody>${rows.length ? rows.map(p => `
      <tr>
        <td><strong>${esc(p.nome)}</strong> ${p.quantidade <= p.quantidade_minima ? '<span class="badge baixo">Baixo</span>' : ''}</td>
        <td>${esc(p.codigo)}</td><td>${esc(p.categoria)}</td>
        <td>
          <button class="btn btn-sm btn-sec" onclick="ajustar(${p.id}, -1)">−</button>
          <strong style="margin:0 6px">${p.quantidade}</strong>
          <button class="btn btn-sm btn-sec" onclick="ajustar(${p.id}, 1)">+</button>
        </td>
        <td>${moeda(p.preco_unitario)}</td><td>${esc(p.localizacao)}</td>
        <td><div class="row-actions">
          <button class="btn btn-sm btn-sec" onclick="formPeca(${p.id})">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="excluirPeca(${p.id})">Excluir</button>
        </div></td>
      </tr>`).join('') : '<tr><td colspan="7" class="empty">Nenhuma peça cadastrada</td></tr>'}
    </tbody></table>`;
}

async function ajustar(id, delta) {
  await api.post(`/api/pecas/${id}/ajuste`, { delta });
  carregarPecas(el('busca-pc')?.value || '');
}

async function formPeca(id) {
  let p = {};
  if (id) { const all = await api.get('/api/pecas'); p = all.find(x => x.id === id) || {}; }
  abrirModal(id ? 'Editar Peça' : 'Nova Peça', `
    <div class="field"><label>Nome *</label><input id="p-nome" value="${esc(p.nome)}"></div>
    <div class="grid-2">
      <div class="field"><label>Código</label><input id="p-cod" value="${esc(p.codigo)}"></div>
      <div class="field"><label>Categoria</label><input id="p-cat" value="${esc(p.categoria)}" placeholder="Gearbox, Hop-up, Bateria..."></div>
    </div>
    <div class="grid-3">
      <div class="field"><label>Quantidade</label><input id="p-qtd" type="number" value="${p.quantidade ?? 0}"></div>
      <div class="field"><label>Estoque mínimo</label><input id="p-min" type="number" value="${p.quantidade_minima ?? 0}"></div>
      <div class="field"><label>Preço unitário</label><input id="p-preco" type="number" step="0.01" value="${p.preco_unitario ?? 0}"></div>
    </div>
    <div class="field"><label>Localização</label><input id="p-loc" value="${esc(p.localizacao)}" placeholder="Prateleira A3..."></div>
    <div class="modal-foot">
      <button class="btn btn-sec" onclick="fecharModal()">Cancelar</button>
      <button class="btn" onclick="salvarPeca(${id || 0})">Salvar</button>
    </div>`);
}

async function salvarPeca(id) {
  const body = {
    nome: el('p-nome').value.trim(), codigo: el('p-cod').value.trim(),
    categoria: el('p-cat').value.trim(), quantidade: Number(el('p-qtd').value) || 0,
    quantidade_minima: Number(el('p-min').value) || 0, preco_unitario: Number(el('p-preco').value) || 0,
    localizacao: el('p-loc').value.trim()
  };
  if (!body.nome) return toast('Informe o nome', true);
  try {
    await (id ? api.put('/api/pecas/' + id, body) : api.post('/api/pecas', body));
    fecharModal(); toast('Peça salva'); carregarPecas();
  } catch (e) { toast(e.message, true); }
}

async function excluirPeca(id) {
  if (!confirm('Excluir esta peça?')) return;
  await api.del('/api/pecas/' + id); toast('Excluída'); carregarPecas();
}

// ---------- Ordens de Serviço ----------
views.ordens = async () => {
  view().innerHTML = `
    <div class="page-head"><h1>Ordens de Serviço</h1>
      <div class="actions"><button class="btn" onclick="formOrdem()">+ Nova Ordem</button></div></div>
    <div class="panel" id="lista-os"></div>`;
  const rows = await api.get('/api/ordens');
  el('lista-os').innerHTML = `
    <table><thead><tr><th>OS</th><th>Cliente</th><th>Equipamento</th><th>Entrada</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.length ? rows.map(o => `
      <tr>
        <td style="cursor:pointer" onclick="verOrdem(${o.id})"><strong>${esc(o.numero || '#' + o.id)}</strong></td>
        <td>${esc(o.cliente_nome)}</td>
        <td>${esc(o.equip_marca || '')} ${esc(o.equip_modelo || '')}</td>
        <td>${dataBR(o.data_entrada)}</td>
        <td><span class="badge ${o.status}">${statusLabel(o.status)}</span></td>
        <td><button class="btn btn-sm btn-sec" onclick="verOrdem(${o.id})">Abrir</button></td>
      </tr>`).join('') : '<tr><td colspan="6" class="empty">Nenhuma ordem cadastrada</td></tr>'}
    </tbody></table>`;
};

let itensOS = [];
let pecasCache = [];

async function formOrdem() {
  const [clientes, pecas] = await Promise.all([api.get('/api/clientes'), api.get('/api/pecas')]);
  pecasCache = pecas;
  itensOS = [];
  const optsCli = clientes.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  const semClientes = clientes.length === 0;
  abrirModal('Nova Ordem de Serviço', `
    <div class="grid-2">
      <div class="field">
        <label>Cliente *</label>
        <div style="display:flex;gap:8px">
          <select id="o-cli" onchange="carregarEquipOS()" style="flex:1" ${semClientes ? 'disabled' : ''}>
            ${semClientes ? '<option value="">Nenhum cliente cadastrado</option>' : optsCli}
          </select>
          <button class="btn btn-sm btn-sec" onclick="novoClienteNaOS()" title="Cadastrar novo cliente">+ Cliente</button>
        </div>
      </div>
      <div class="field">
        <label>Equipamento</label>
        <div style="display:flex;gap:8px">
          <select id="o-eq" style="flex:1"><option value="">—</option></select>
          <button class="btn btn-sm btn-sec" onclick="novoEquipNaOS()" title="Cadastrar novo equipamento">+ Equip.</button>
        </div>
      </div>
    </div>
    <div id="os-cliente-form"></div>
    <div id="os-equip-form"></div>
    <div class="field"><label>Descrição do problema</label><textarea id="o-prob"></textarea></div>
    <div class="field"><label>Serviço a realizar / realizado</label><textarea id="o-serv"></textarea></div>
    <div class="grid-3">
      <div class="field"><label>Status</label><select id="o-status">
        <option value="aberta">Aberta</option><option value="em_andamento">Em andamento</option>
        <option value="concluida">Concluída</option><option value="entregue">Entregue</option></select></div>
      <div class="field"><label>Mão de obra (R$)</label><input id="o-mo" type="number" step="0.01" value="0"></div>
      <div class="field"><label>Previsão de entrega</label><input id="o-prev" type="date"></div>
    </div>
    <div class="os-sec-head">
      <div class="section-title" style="margin:0">Peças utilizadas</div>
      <button class="btn btn-sm btn-sec" onclick="novaPecaNaOS()">+ Nova peça no estoque</button>
    </div>
    <div id="os-peca-form"></div>
    <div class="peca-linha">
      <select id="o-peca" ${!pecas.length ? 'disabled' : ''}>
        ${pecas.length
          ? pecas.map(p => `<option value="${p.id}" data-preco="${p.preco_unitario}" data-nome="${esc(p.nome)}">${esc(p.nome)} (estoque: ${p.quantidade})</option>`).join('')
          : '<option value="">— cadastre uma peça primeiro —</option>'}
      </select>
      <input id="o-peca-qtd" type="number" value="1" min="1" ${!pecas.length ? 'disabled' : ''}>
      <span></span>
      <button id="os-add-btn" class="btn btn-sm" onclick="addItemOS()" ${!pecas.length ? 'disabled' : ''}>+</button>
    </div>
    <div id="os-itens"></div>
    <div class="field"><label>Observações</label><textarea id="o-obs"></textarea></div>
    <div class="modal-foot">
      <button class="btn btn-sec" onclick="fecharModal()">Cancelar</button>
      <button class="btn" onclick="salvarOrdem()">Salvar Ordem</button>
    </div>`);
  if (!semClientes) carregarEquipOS();
}

function novoClienteNaOS() {
  const container = el('os-cliente-form');
  if (container.innerHTML) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <div class="inline-client-form">
      <div class="section-title" style="margin-top:0">Novo cliente</div>
      <div class="field"><label>Nome *</label><input id="nc-nome" placeholder="Nome completo"></div>
      <div class="grid-2">
        <div class="field"><label>Telefone</label><input id="nc-tel" placeholder="(xx) xxxxx-xxxx"></div>
        <div class="field"><label>E-mail</label><input id="nc-email" placeholder="email@exemplo.com"></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>CPF</label><input id="nc-cpf"></div>
        <div class="field"><label>Data de nascimento</label><input id="nc-nasc" type="date"></div>
      </div>
      <div class="field"><label>Endereço</label><input id="nc-end"></div>
      <div class="field check">
        <input type="checkbox" id="nc-mkt" checked>
        <label style="margin:0">Aceita receber contatos de marketing</label>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="btn btn-sm btn-sec" onclick="el('os-cliente-form').innerHTML=''">Cancelar</button>
        <button class="btn btn-sm" onclick="salvarClienteNaOS()">Salvar e selecionar</button>
      </div>
    </div>`;
  el('nc-nome').focus();
}

async function salvarClienteNaOS() {
  const nome = el('nc-nome').value.trim();
  if (!nome) return toast('Informe o nome do cliente', true);
  const body = {
    nome, telefone: el('nc-tel').value.trim(), email: el('nc-email').value.trim(),
    cpf: el('nc-cpf').value.trim(), data_nascimento: el('nc-nasc').value,
    endereco: el('nc-end').value.trim(), aceita_marketing: el('nc-mkt').checked
  };
  try {
    const c = await api.post('/api/clientes', body);
    const sel = el('o-cli');
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = esc(c.nome); opt.selected = true;
    sel.disabled = false;
    sel.appendChild(opt);
    el('os-cliente-form').innerHTML = '';
    await carregarEquipOS();
    toast('Cliente ' + c.nome + ' cadastrado');
  } catch (e) { toast(e.message, true); }
}

async function carregarEquipOS() {
  const cliId = el('o-cli').value;
  if (!cliId) return;
  const c = await api.get('/api/clientes/' + cliId);
  el('o-eq').innerHTML = '<option value="">—</option>' +
    c.equipamentos.map(e => `<option value="${e.id}">${esc(e.tipo)} ${esc(e.marca)} ${esc(e.modelo)}</option>`).join('');
}

function novoEquipNaOS() {
  const container = el('os-equip-form');
  if (container.innerHTML) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <div class="inline-client-form">
      <div class="section-title" style="margin-top:0">Novo equipamento</div>
      <div class="grid-2">
        <div class="field"><label>Tipo</label><input id="ne-tipo" placeholder="Rifle, Pistola, Sniper..."></div>
        <div class="field"><label>FPS</label><input id="ne-fps" type="number" placeholder="350"></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>Marca</label><input id="ne-marca" placeholder="Tokyo Marui, G&G..."></div>
        <div class="field"><label>Modelo</label><input id="ne-modelo" placeholder="M4A1, AK47..."></div>
      </div>
      <div class="field"><label>Número de série</label><input id="ne-serie"></div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="btn btn-sm btn-sec" onclick="el('os-equip-form').innerHTML=''">Cancelar</button>
        <button class="btn btn-sm" onclick="salvarEquipNaOS()">Salvar e selecionar</button>
      </div>
    </div>`;
  el('ne-tipo').focus();
}

async function salvarEquipNaOS() {
  const cliId = el('o-cli').value;
  if (!cliId) return toast('Selecione um cliente primeiro', true);
  const body = {
    cliente_id: Number(cliId),
    tipo: el('ne-tipo').value.trim(),
    marca: el('ne-marca').value.trim(),
    modelo: el('ne-modelo').value.trim(),
    numero_serie: el('ne-serie').value.trim(),
    fps: el('ne-fps').value ? Number(el('ne-fps').value) : null,
    observacoes: ''
  };
  try {
    const e = await api.post('/api/equipamentos', body);
    const sel = el('o-eq');
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = [e.tipo, e.marca, e.modelo].filter(Boolean).join(' ');
    opt.selected = true;
    sel.appendChild(opt);
    el('os-equip-form').innerHTML = '';
    toast('Equipamento cadastrado e selecionado');
  } catch (e) { toast(e.message, true); }
}

function novaPecaNaOS() {
  const container = el('os-peca-form');
  if (container.innerHTML) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <div class="inline-client-form">
      <div class="section-title" style="margin-top:0">Nova peça no estoque</div>
      <div class="field"><label>Nome *</label><input id="np-nome" placeholder="Ex: Mola M120, O-ring, Bateria LiPo..."></div>
      <div class="grid-2">
        <div class="field"><label>Categoria</label><input id="np-cat" placeholder="Gearbox, Hop-up, Bateria..."></div>
        <div class="field"><label>Preço unitário (R$)</label><input id="np-preco" type="number" step="0.01" min="0" value="0"></div>
      </div>
      <div class="grid-3">
        <div class="field"><label>Quantidade inicial</label><input id="np-qtd" type="number" min="0" value="1"></div>
        <div class="field"><label>Estoque mínimo</label><input id="np-min" type="number" min="0" value="0"></div>
        <div class="field"><label>Localização</label><input id="np-loc" placeholder="Prateleira A3..."></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="btn btn-sm btn-sec" onclick="el('os-peca-form').innerHTML=''">Cancelar</button>
        <button class="btn btn-sm" onclick="salvarPecaNaOS()">Salvar e adicionar</button>
      </div>
    </div>`;
  el('np-nome').focus();
}

async function salvarPecaNaOS() {
  const nome = el('np-nome').value.trim();
  if (!nome) return toast('Informe o nome da peça', true);
  const body = {
    nome, codigo: '',
    categoria: el('np-cat').value.trim(),
    preco_unitario: Number(el('np-preco').value) || 0,
    quantidade: Number(el('np-qtd').value) || 1,
    quantidade_minima: Number(el('np-min').value) || 0,
    localizacao: el('np-loc').value.trim()
  };
  try {
    const p = await api.post('/api/pecas', body);
    pecasCache.push(p);
    const sel = el('o-peca');
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.dataset.preco = p.preco_unitario;
    opt.dataset.nome = p.nome;
    opt.textContent = `${p.nome} (estoque: ${p.quantidade})`;
    opt.selected = true;
    if (sel.disabled) {
      sel.innerHTML = '';
      sel.disabled = false;
      el('o-peca-qtd').disabled = false;
      el('os-add-btn').disabled = false;
    }
    sel.appendChild(opt);
    el('os-peca-form').innerHTML = '';
    toast('Peça "' + p.nome + '" adicionada ao estoque');
  } catch (e) { toast(e.message, true); }
}

function addItemOS() {
  const sel = el('o-peca');
  if (!sel.value) return;
  const opt = sel.options[sel.selectedIndex];
  const qtd = Number(el('o-peca-qtd').value) || 1;
  itensOS.push({ peca_id: Number(sel.value), descricao: opt.dataset.nome, quantidade: qtd, preco_unitario: Number(opt.dataset.preco) });
  renderItensOS();
}

function removerItemOS(i) { itensOS.splice(i, 1); renderItensOS(); }

function renderItensOS() {
  el('os-itens').innerHTML = itensOS.map((it, i) => `
    <div class="peca-linha">
      <span>${esc(it.descricao)}</span>
      <span>${it.quantidade}x</span>
      <span>${moeda(it.quantidade * it.preco_unitario)}</span>
      <button class="rm" onclick="removerItemOS(${i})">×</button>
    </div>`).join('');
}

async function salvarOrdem() {
  const body = {
    cliente_id: Number(el('o-cli').value),
    equipamento_id: el('o-eq').value ? Number(el('o-eq').value) : null,
    descricao_problema: el('o-prob').value.trim(),
    servico_realizado: el('o-serv').value.trim(),
    status: el('o-status').value,
    valor_mao_obra: Number(el('o-mo').value) || 0,
    data_previsao: el('o-prev').value,
    observacoes: el('o-obs').value.trim(),
    pecas: itensOS
  };
  try {
    const o = await api.post('/api/ordens', body);
    fecharModal(); toast('Ordem criada: ' + o.numero); verOrdem(o.id);
  } catch (e) { toast(e.message, true); }
}

async function verOrdem(id) {
  const o = await api.get('/api/ordens/' + id);
  const eq = o.equipamento;
  abrirModal('Ordem ' + (o.numero || '#' + o.id), `
    <p class="muted">Cliente: <strong>${esc(o.cliente.nome)}</strong> • ${esc(o.cliente.telefone)}</p>
    ${eq ? `<p class="muted">Equipamento: ${esc(eq.tipo)} ${esc(eq.marca)} ${esc(eq.modelo)} ${eq.fps ? '• ' + eq.fps + ' FPS' : ''}</p>` : ''}
    <div class="grid-2" style="margin-top:12px">
      <div class="field"><label>Status</label>
        <select id="v-status">
          ${['aberta', 'em_andamento', 'concluida', 'entregue'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('')}
        </select></div>
      <div class="field"><label>Mão de obra (R$)</label><input id="v-mo" type="number" step="0.01" value="${o.valor_mao_obra}"></div>
    </div>
    <div class="field"><label>Problema</label><textarea id="v-prob">${esc(o.descricao_problema)}</textarea></div>
    <div class="field"><label>Serviço realizado</label><textarea id="v-serv">${esc(o.servico_realizado)}</textarea></div>
    <div class="section-title">Peças</div>
    <div class="panel"><table><tbody>
      ${o.pecas.length ? o.pecas.map(p => `<tr><td>${esc(p.descricao)}</td><td>${p.quantidade}x</td><td>${moeda(p.quantidade * p.preco_unitario)}</td></tr>`).join('')
        : '<tr><td class="empty">Sem peças</td></tr>'}
    </tbody></table></div>
    <p style="text-align:right;margin-top:12px;font-size:16px"><strong>Total: ${moeda(o.total)}</strong>
      <span class="muted">(peças ${moeda(o.total_pecas)} + mão de obra ${moeda(o.valor_mao_obra)})</span></p>
    <div class="modal-foot">
      <a class="btn btn-sec" href="/api/ordens/${o.id}/pdf" target="_blank">📄 Gerar PDF / Guia</a>
      <button class="btn" onclick="salvarStatusOrdem(${o.id})">Salvar alterações</button>
    </div>`);
}

async function salvarStatusOrdem(id) {
  const o = await api.get('/api/ordens/' + id);
  const body = {
    equipamento_id: o.equipamento_id,
    descricao_problema: el('v-prob').value.trim(),
    servico_realizado: el('v-serv').value.trim(),
    status: el('v-status').value,
    valor_mao_obra: Number(el('v-mo').value) || 0,
    data_previsao: o.data_previsao,
    observacoes: o.observacoes
  };
  try {
    await api.put('/api/ordens/' + id, body);
    fecharModal(); toast('Ordem atualizada'); navegar('ordens');
  } catch (e) { toast(e.message, true); }
}

// ---------- Remarketing ----------
views.remarketing = async () => {
  view().innerHTML = `
    <div class="page-head"><h1>Remarketing</h1></div>
    <div class="section-title">Clientes para reconectar (sem contato há 90+ dias)</div>
    <div class="panel" id="rm-sugestoes"></div>
    <div class="section-title" style="margin-top:22px">Aniversariantes do mês</div>
    <div class="panel" id="rm-aniver"></div>`;
  const [sug, aniv] = await Promise.all([
    api.get('/api/remarketing/sugestoes'), api.get('/api/remarketing/aniversariantes')
  ]);
  el('rm-sugestoes').innerHTML = `
    <table><thead><tr><th>Cliente</th><th>Telefone</th><th>Sem contato</th><th></th></tr></thead>
    <tbody>${sug.length ? sug.map(c => `
      <tr><td>${esc(c.nome)}</td><td>${esc(c.telefone)}</td>
      <td>${c.dias_sem_contato === null ? 'nunca' : c.dias_sem_contato + ' dias'}</td>
      <td><button class="btn btn-sm" onclick="formContato(${c.id}, '${esc(c.nome)}')">Registrar contato</button></td></tr>`).join('')
      : '<tr><td colspan="4" class="empty">Nenhum cliente pendente 🎉</td></tr>'}
    </tbody></table>`;
  el('rm-aniver').innerHTML = `
    <table><tbody>${aniv.length ? aniv.map(c => `
      <tr><td>🎂 ${esc(c.nome)}</td><td>${dataBR(c.data_nascimento)}</td><td>${esc(c.telefone)}</td>
      <td><button class="btn btn-sm" onclick="formContato(${c.id}, '${esc(c.nome)}')">Parabenizar</button></td></tr>`).join('')
      : '<tr><td class="empty">Ninguém faz aniversário este mês</td></tr>'}
    </tbody></table>`;
};

function formContato(id, nome) {
  abrirModal('Registrar contato — ' + nome, `
    <div class="field"><label>Canal</label><select id="c-canal">
      <option>WhatsApp</option><option>Telefone</option><option>E-mail</option><option>Presencial</option></select></div>
    <div class="field"><label>Mensagem / observação</label><textarea id="c-msg" placeholder="Ex.: enviada promoção de revisão de gearbox"></textarea></div>
    <div class="modal-foot">
      <button class="btn btn-sec" onclick="fecharModal()">Cancelar</button>
      <button class="btn" onclick="salvarContato(${id})">Registrar</button>
    </div>`);
}

async function salvarContato(id) {
  try {
    await api.post('/api/remarketing/contato', { cliente_id: id, canal: el('c-canal').value, mensagem: el('c-msg').value.trim() });
    fecharModal(); toast('Contato registrado'); navegar('remarketing');
  } catch (e) { toast(e.message, true); }
}

// ---------- Início ----------
navegar('dashboard');
