// ===================== AUTH GUARD =====================
(function guard() {
  const token = localStorage.getItem('vedit_admin_token');
  if (!token) { window.location.href = 'login.html'; return; }
  document.getElementById('adminName').textContent = localStorage.getItem('vedit_admin_name') || 'Admin';
  document.getElementById('adminRole').textContent = localStorage.getItem('vedit_admin_role') || 'admin';
})();

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('vedit_admin_token');
  localStorage.removeItem('vedit_admin_name');
  localStorage.removeItem('vedit_admin_role');
  sessionStorage.clear();
  window.location.href = 'login.html';
});

document.getElementById('mobileSidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// handle expired/invalid tokens globally
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && /401|token/i.test(e.reason.message || '')) {
    localStorage.removeItem('vedit_admin_token');
    window.location.href = 'login.html';
  }
});

// ===================== TAB SWITCHING =====================
const TAB_META = {
  serviceRequests: ['Service Requests', 'All incoming editing service requests.'],
  classApplications: ['Class Applications', 'Applications to join online editing classes.'],
  teamApplications: ['Team Applications', 'People applying to join the Vedit team.'],
  manageServices: ['Services & Pricing', 'Edit what appears in the Services section.'],
  manageCourses: ['Courses & Pricing', 'Edit what appears in the Online Classes section.'],
  manageTestimonials: ['Testimonials', 'Edit what appears in the Testimonials section.'],
  managePortfolio: ['Portfolio', 'Edit what appears in the Portfolio section.'],
};

document.querySelectorAll('.navitem').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.navitem').forEach((n) => n.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    item.classList.add('active');
    const tab = item.dataset.tab;
    document.getElementById(`panel-${tab}`).classList.add('active');
    const [title, sub] = TAB_META[tab];
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSubtitle').textContent = sub;
    document.getElementById('sidebar').classList.remove('open');
    loadTab(tab);
  });
});

function loadTab(tab) {
  const loaders = {
    serviceRequests: () => loadApplications('service', 'sr'),
    classApplications: () => loadApplications('class', 'ca'),
    teamApplications: () => loadApplications('team', 'ta'),
    manageServices: loadServices,
    manageCourses: loadCourses,
    manageTestimonials: loadTestimonials,
    managePortfolio: loadPortfolio,
  };
  loaders[tab] && loaders[tab]();
}

// ===================== APPLICATIONS (service / class / team) =====================
const appState = {
  service: { page: 1, search: '', status: '' },
  class: { page: 1, search: '', status: '' },
  team: { page: 1, search: '', status: '' },
};
const PAGE_SIZE = 10;

async function loadApplications(type, prefix) {
  const state = appState[type];
  const tbody = document.querySelector(`#${prefix}-table tbody`);
  tbody.innerHTML = `<tr><td colspan="8" class="text-center text-[--muted] py-8">Loading...</td></tr>`;
  try {
    const qs = new URLSearchParams({ page: state.page, limit: PAGE_SIZE, search: state.search, status: state.status });
    const res = await api.get(`/admin/applications/${type}?${qs.toString()}`);
    renderApplicationRows(type, prefix, res.items);
    renderPagination(prefix, res.page, res.totalPages, (p) => { state.page = p; loadApplications(type, prefix); });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-red-300 py-8">${e.message}</td></tr>`;
  }
}

function renderApplicationRows(type, prefix, items) {
  const tbody = document.querySelector(`#${prefix}-table tbody`);
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-[--muted] py-8">No applications found.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((it) => {
    const statusCell = `<span class="badge ${statusBadgeClass(it.status)}">${it.status}</span>`;
    const actions = `
      <div class="flex flex-wrap gap-2">
        <select class="icon-btn" onchange="updateStatus('${type}','${it._id}', this.value, '${prefix}')">
          ${['Pending','Under Review','Accepted','Rejected','Completed'].map((s) => `<option ${s === it.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button class="icon-btn" onclick="viewApplication('${type}','${it._id}')">View</button>
        <button class="icon-btn" onclick="deleteApplication('${type}','${it._id}','${prefix}')">Delete</button>
      </div>`;
    if (type === 'service') {
      return `<tr><td class="mono">${it.applicationId}</td><td>${it.fullName}</td><td class="text-xs">${it.email}<br>${it.discordUsername}</td><td>${it.projectType}</td><td>${new Date(it.deadline).toLocaleDateString()}</td><td>${it.budget}</td><td>${statusCell}</td><td>${actions}</td></tr>`;
    }
    if (type === 'class') {
      return `<tr><td class="mono">${it.applicationId}</td><td>${it.fullName}</td><td class="text-xs">${it.email}<br>${it.discordUsername}</td><td>${it.course}</td><td>${it.skillLevel}</td><td>${statusCell}</td><td>${actions}</td></tr>`;
    }
    return `<tr><td class="mono">${it.applicationId}</td><td>${it.fullName}</td><td class="text-xs">${it.email}<br>${it.discordUsername}</td><td>${it.specialization}</td><td>${statusCell}</td><td>${actions}</td></tr>`;
  }).join('');
}

function renderPagination(prefix, page, totalPages, onPage) {
  const el = document.getElementById(`${prefix}-pagination`);
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="icon-btn ${i === page ? 'border-[--bright]' : ''}" data-p="${i}">${i}</button>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => onPage(Number(b.dataset.p))));
}

async function updateStatus(type, id, status, prefix) {
  try {
    await api.put(`/admin/applications/${type}/${id}`, { status });
    loadApplications(type, prefix);
  } catch (e) { alert(e.message); }
}

async function deleteApplication(type, id, prefix) {
  if (!confirm('Delete this application permanently?')) return;
  try {
    await api.del(`/admin/applications/${type}/${id}`);
    loadApplications(type, prefix);
  } catch (e) { alert(e.message); }
}

async function viewApplication(type, id) {
  try {
    const item = await api.get(`/admin/applications/${type}/${id}`);
    const rows = Object.entries(item).filter(([k]) => !['__v', '_id'].includes(k))
      .map(([k, v]) => `<div class="flex justify-between gap-4 border-b border-[--line] py-2 text-sm"><span class="text-[--muted]">${k}</span><span class="text-right break-all">${v}</span></div>`).join('');
    openModal(`<p class="timecode">APPLICATION DETAIL</p><h3 class="font-700 text-lg mb-4">${item.applicationId}</h3>${rows}<button class="btn btn-ghost btn-sm w-full mt-5" onclick="closeModal()">Close</button>`);
  } catch (e) { alert(e.message); }
}

['sr', 'ca', 'ta'].forEach((prefix, i) => {
  const type = ['service', 'class', 'team'][i];
  document.getElementById(`${prefix}-search`).addEventListener('input', debounce((e) => {
    appState[type].search = e.target.value; appState[type].page = 1; loadApplications(type, prefix);
  }, 350));
  document.getElementById(`${prefix}-filter`).addEventListener('change', (e) => {
    appState[type].status = e.target.value; appState[type].page = 1; loadApplications(type, prefix);
  });
  document.getElementById(`${prefix}-export`).addEventListener('click', () => exportCSV(type));
});

async function exportCSV(type) {
  try {
    const token = localStorage.getItem('vedit_admin_token');
    const res = await fetch(`${API_BASE}/admin/applications/${type}/export`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${type}-applications.csv`; a.click();
    URL.revokeObjectURL(url);
  } catch (e) { alert(e.message); }
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ===================== CONTENT MANAGEMENT (services/courses/testimonials/portfolio) =====================
async function loadServices() {
  const list = document.getElementById('svc-list');
  list.innerHTML = 'Loading...';
  const items = await api.get('/services');
  list.innerHTML = items.map((s) => contentRow('service', s, `${s.name} — ₹${s.startingPrice}`, s.description)).join('') || emptyRow();
}
async function loadCourses() {
  const list = document.getElementById('crs-list');
  list.innerHTML = 'Loading...';
  const items = await api.get('/courses');
  list.innerHTML = items.map((c) => contentRow('course', c, `${c.title} — ₹${c.price}`, `${c.level} · ${c.duration}`)).join('') || emptyRow();
}
async function loadTestimonials() {
  const list = document.getElementById('tst-list');
  list.innerHTML = 'Loading...';
  const items = await api.get('/testimonials');
  list.innerHTML = items.map((t) => contentRow('testimonial', t, t.name, t.quote)).join('') || emptyRow();
}
async function loadPortfolio() {
  const list = document.getElementById('pf-list');
  list.innerHTML = 'Loading...';
  const items = await api.get('/portfolio');
  list.innerHTML = items.map((p) => contentRow('portfolio', p, p.title, p.category)).join('') || emptyRow();
}
function emptyRow() { return `<p class="text-sm text-[--muted] py-6 text-center">Nothing here yet.</p>`; }
function contentRow(kind, item, title, sub) {
  return `<div class="glass p-4 flex justify-between items-center gap-4">
    <div><p class="font-semibold">${title}</p><p class="text-xs text-[--muted] mt-1">${sub}</p></div>
    <div class="flex gap-2 shrink-0">
      <button class="icon-btn" onclick='openEditForm("${kind}", ${JSON.stringify(item).replace(/'/g, "&#39;")})'>Edit</button>
      <button class="icon-btn" onclick="deleteContent('${kind}','${item._id}')">Delete</button>
    </div></div>`;
}

const KIND_ENDPOINT = { service: '/services', course: '/courses', testimonial: '/testimonials', portfolio: '/portfolio' };
const KIND_RELOAD = { service: loadServices, course: loadCourses, testimonial: loadTestimonials, portfolio: loadPortfolio };

const FORM_FIELDS = {
  service: [['name', 'Name'], ['description', 'Description', 'textarea'], ['startingPrice', 'Starting Price (₹)', 'number']],
  course: [['title', 'Title'], ['description', 'Description', 'textarea'], ['duration', 'Duration'], ['level', 'Skill Level'], ['price', 'Price (₹)', 'number']],
  testimonial: [['name', 'Name'], ['role', 'Role / Context'], ['quote', 'Quote', 'textarea']],
  portfolio: [['title', 'Title'], ['category', 'Category']],
};

function openEditForm(kind, item) {
  const fields = FORM_FIELDS[kind];
  const inputs = fields.map(([key, label, type]) => `
    <div><label class="flabel">${label}</label>
    ${type === 'textarea'
      ? `<textarea name="${key}" rows="3" class="field">${item[key] ?? ''}</textarea>`
      : `<input name="${key}" type="${type || 'text'}" class="field" value="${item[key] ?? ''}">`}
    </div>`).join('');
  openModal(`
    <p class="timecode">${item._id ? 'EDIT' : 'NEW'} ${kind.toUpperCase()}</p>
    <form id="contentForm" class="space-y-4 mt-2">${inputs}
      <div class="flex gap-3"><button type="submit" class="btn btn-primary flex-1">Save</button><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button></div>
    </form>`);
  document.getElementById('contentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      if (item._id) await api.put(`/admin${KIND_ENDPOINT[kind]}/${item._id}`, data);
      else await api.post(`/admin${KIND_ENDPOINT[kind]}`, data);
      closeModal();
      KIND_RELOAD[kind]();
    } catch (err) { alert(err.message); }
  });
}

async function deleteContent(kind, id) {
  if (!confirm('Delete this item?')) return;
  try { await api.del(`/admin${KIND_ENDPOINT[kind]}/${id}`); KIND_RELOAD[kind](); } catch (e) { alert(e.message); }
}

document.getElementById('svc-add').addEventListener('click', () => openEditForm('service', {}));
document.getElementById('crs-add').addEventListener('click', () => openEditForm('course', {}));
document.getElementById('tst-add').addEventListener('click', () => openEditForm('testimonial', {}));
document.getElementById('pf-add').addEventListener('click', () => openEditForm('portfolio', {}));

// ===================== MODAL =====================
function openModal(html) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modalOverlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }
document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') closeModal(); });

// initial load
loadApplications('service', 'sr');
