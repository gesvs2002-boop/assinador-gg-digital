import { MODELS, esc } from './src/core.js';
import { renderJomti } from './src/jomti.js';
import { renderInteracao } from './src/interacao.js';

const app = document.getElementById('app');
const brandHome = document.getElementById('brandHome');
const store = { url: null };

const ADMIN_PATH = '/gg-admin-9f3c7e2a6b1d4c8f';
const DOC_PATHS = {
  'jomti-2026': '/d/jomti-2026',
  'interacao-unisapiens-2026': '/d/interacao-unisapiens-2026'
};
const PATH_TO_MODEL = Object.fromEntries(Object.entries(DOC_PATHS).map(([id, path]) => [path, id]));

function cleanup() {
  if (store.url) {
    URL.revokeObjectURL(store.url);
    store.url = null;
  }
}

function normalizedPath() {
  const p = location.pathname.replace(/\/+$/, '');
  return p || '/';
}

function publicUrl(id) {
  return `${location.origin}${DOC_PATHS[id]}`;
}

function showNeutral() {
  cleanup();
  app.innerHTML = `
    <section class="home-hero">
      <div>
        <span class="eyebrow">ASSINADOR GG DIGITAL</span>
        <h1>Acesse seu documento pelo link recebido.</h1>
        <p>Este ambiente gera documentos em PDF a partir de formulários específicos. Para começar, utilize o link enviado pela organização responsável.</p>
      </div>
      <aside class="hero-note">
        <strong>Privacidade por padrão</strong>
        <p>Os dados são processados no navegador durante a geração do documento.</p>
      </aside>
    </section>
    <section class="panel">
      <div class="panel-head">
        <div><span class="section-kicker">Acesso direto</span><h2>Nenhum documento selecionado</h2></div>
        <p>Solicite à organização o link específico do formulário que você precisa preencher.</p>
      </div>
    </section>`;
}

function adminCard(model) {
  return `
    <article class="model-card" data-card="${model.id}">
      <div class="model-card-top">
        <span class="model-icon">${model.icon}</span>
        <span class="status-badge">Disponível</span>
      </div>
      <h3>${esc(model.title)}</h3>
      <p><strong>${esc(model.subtitle)}</strong><br>${esc(model.description)}</p>
      <div class="model-meta">${model.tags.map(tag => `<span class="mini-badge">${esc(tag)}</span>`).join('')}</div>
      <div class="model-actions">
        <button class="btn btn-ghost" type="button" data-copy="${model.id}">Copiar link</button>
        <button class="btn btn-primary" type="button" data-open="${model.id}">Abrir modelo</button>
      </div>
    </article>`;
}

function bindAdminCards() {
  app.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const url = publicUrl(btn.dataset.copy);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    const original = btn.textContent;
    btn.textContent = 'Link copiado ✓';
    setTimeout(() => { btn.textContent = original; }, 1600);
  }));

  app.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => {
    window.open(publicUrl(btn.dataset.open), '_blank', 'noopener');
  }));
}

function renderAdminGrid(models) {
  const grid = app.querySelector('#modelGrid');
  if (!grid) return;
  grid.innerHTML = models.length ? models.map(adminCard).join('') : '<div class="empty-state">Nenhum modelo encontrado.</div>';
  bindAdminCards();
}

function showAdmin() {
  cleanup();
  app.innerHTML = `
    <section class="home-hero">
      <div>
        <span class="eyebrow">GG DIGITAL • ADMIN</span>
        <h1>Painel de documentos</h1>
        <p>Gerencie os modelos disponíveis e copie apenas o link do documento que deseja enviar.</p>
      </div>
      <aside class="hero-note">
        <strong>Painel reservado</strong>
        <p>Esta rota não é exibida no ambiente público. Os links compartilháveis abrem somente o documento escolhido.</p>
      </aside>
    </section>

    <section>
      <div class="toolbar">
        <div><span class="section-kicker">Modelos</span><h2>Documentos disponíveis</h2></div>
        <label class="search"><input id="modelSearch" type="search" placeholder="Buscar documento..." aria-label="Buscar documento"></label>
      </div>
      <div id="modelGrid" class="model-grid"></div>
    </section>`;

  renderAdminGrid(MODELS);
  app.querySelector('#modelSearch')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = MODELS.filter(m => `${m.title} ${m.subtitle} ${m.description} ${m.tags.join(' ')}`.toLowerCase().includes(q));
    renderAdminGrid(filtered);
  });
}

function openModel(id) {
  cleanup();
  const model = MODELS.find(m => m.id === id);
  if (!model) {
    showNeutral();
    return;
  }
  const exitPublic = () => location.assign('/');
  if (id === 'jomti-2026') renderJomti(app, model, exitPublic, store);
  else if (id === 'interacao-unisapiens-2026') renderInteracao(app, model, exitPublic, store);
}

function route() {
  const path = normalizedPath();

  if (path === ADMIN_PATH) {
    showAdmin();
    return;
  }

  if (PATH_TO_MODEL[path]) {
    openModel(PATH_TO_MODEL[path]);
    return;
  }

  const legacy = new URLSearchParams(location.search).get('modelo');
  if (legacy && DOC_PATHS[legacy]) {
    history.replaceState({}, '', DOC_PATHS[legacy]);
    openModel(legacy);
    return;
  }

  showNeutral();
}

function prepareVisibleCanvas() {
  requestAnimationFrame(() => {
    const c = app.querySelector('#signatureCanvas');
    if (!c || c.closest('[hidden]')) return;
    const r = c.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.2;
  });
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-next="3"]')) prepareVisibleCanvas();
});

brandHome.addEventListener('click', () => {
  if (normalizedPath() === ADMIN_PATH) showAdmin();
  else location.assign('/');
});

window.addEventListener('popstate', route);
route();
