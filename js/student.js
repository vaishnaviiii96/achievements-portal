/* ============================================================
   student.js  —  GITAM Achievements Portal (Student)
   Changes in this version:
   1. Auto-calculate duration from start + end date
   2. Organiser name field included in submit/edit
   3. Multiple photos + certificates with preview thumbnails
   4. Save as Draft (partial data, no validation required)
   5. Export my achievements as Excel
   ============================================================ */

let achievements = [], user = {};

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  const name = user.name || 'Student';
  document.getElementById('pname').textContent    = name;
  document.getElementById('pid').textContent      = user.roll_number || user.id || '—';
  document.getElementById('av').textContent       = initials(name);
  const hav = document.getElementById('header-av');
  if (hav) hav.textContent = initials(name);
  const ddName = document.getElementById('dd-name');
  if (ddName) ddName.textContent = name;
  const ddRoll = document.getElementById('dd-roll');
  if (ddRoll) ddRoll.textContent = user.roll_number || user.id || '—';
  document.getElementById('welcome').textContent  = 'Welcome, ' + (name.split(' ')[0] || 'Student') + '!';

  loadAchievements();
});

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function showToast(title, msg = '', duration = 2200) {
  const modal = document.getElementById('toast-modal');
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-msg').textContent   = msg;
  modal.style.display = 'flex';
  setTimeout(() => { modal.style.display = 'none'; }, duration);
}
/* ── Navigation ─────────────────────────────────────────── */
function show(page, el) {
  document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
  document.getElementById('page-' + page).style.display = 'block';
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  closeSb();
  if (page === 'mine')    { loadAchievements().then(() => renderMinePage()); }
  if (page === 'profile') renderProfilePage();
}

function toggleSb() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeSb() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

/* ── Header profile dropdown ────────────────────────────── */
function toggleProfileDropdown(e) {
  e.stopPropagation();
  document.getElementById('profile-dropdown').classList.toggle('open');
}
document.addEventListener('click', () => {
  const dd = document.getElementById('profile-dropdown');
  if (dd) dd.classList.remove('open');
});

/* ── API helper ─────────────────────────────────────────── */
async function api(path, opts = {}) {
  const r = await fetch(API_BASE + path, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token'),
      ...(opts.headers || {})
    },
    ...opts
  });
  if (!r.ok) throw new Error('api error ' + r.status);
  return r.json();
}

/* ── Load achievements ──────────────────────────────────── */
async function loadAchievements() {
  try { achievements = await api('/api/achievements/mine') || []; }
  catch { achievements = []; }
  renderDash();
}

/* ── Dashboard render ───────────────────────────────────── */
function renderDash() {
  const submitted = achievements.filter(a => a.status !== 'draft');
  const drafts    = achievements.filter(a => a.status === 'draft');

  document.getElementById('s-total').textContent  = submitted.length;
  document.getElementById('s-drafts').textContent = drafts.length;

  const rl = document.getElementById('recent-list');
  rl.innerHTML = achievements.length === 0
    ? emptyState('No achievements yet.',
        `<a onclick="show('submit',document.getElementById('nav-submit'))" style="color:var(--teal);cursor:pointer;font-weight:600">Submit your first one →</a>`)
    : achievements.slice(0, 4).map(a => achievementCard(a, false)).join('');
}

/* ── Profile page render ────────────────────────────────── */
function renderProfilePage() {
  const name = user.name || '—';
  document.getElementById('prof-av').textContent    = initials(name);
  document.getElementById('prof-name').textContent  = name;
  document.getElementById('prof-dept').textContent  = user.department || 'GITAM University';
  document.getElementById('prof-roll').textContent  = user.roll_number || '—';
  document.getElementById('prof-email').textContent = user.email || '—';
  document.getElementById('prof-year').textContent  = user.year_of_study || '—';
  document.getElementById('prof-batch').textContent = user.batch || '—';
}

/* ── My Achievements page ───────────────────────────────── */
function renderMinePage(filter = 'all') {
  // Build filter tabs
  const drafts    = achievements.filter(a => a.status === 'draft');
  const submitted = achievements.filter(a => a.status !== 'draft');
  const list      = filter === 'drafts' ? drafts : filter === 'submitted' ? submitted : achievements;

  const tabs = `
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button onclick="renderMinePage('all')"
        class="btn btn-sm ${filter==='all' ? '' : 'btn-out'}"
        style="${filter==='all' ? 'background:var(--teal);color:#fff' : ''}">
        All (${achievements.length})
      </button>
      <button onclick="renderMinePage('submitted')"
        class="btn btn-sm ${filter==='submitted' ? '' : 'btn-out'}"
        style="${filter==='submitted' ? 'background:var(--teal);color:#fff' : ''}">
        Submitted (${submitted.length})
      </button>
      <button onclick="renderMinePage('drafts')"
        class="btn btn-sm ${filter==='drafts' ? '' : 'btn-out'}"
        style="${filter==='drafts' ? 'background:var(--teal);color:#fff' : ''}">
        Drafts (${drafts.length})
      </button>
    </div>`;

  const el = document.getElementById('mine-list');
  el.innerHTML = tabs + (list.length === 0
    ? `<div class="card"><div class="cb">${emptyState(
        filter === 'drafts' ? 'No drafts saved.' : 'No achievements yet.'
      )}</div></div>`
    : list.map(a => achievementCard(a, true)).join(''));
}

/* ── Shared achievement card builder ────────────────────── */
function achievementCard(a, fullMode) {
  const fmtDate = s => s
    ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const isDraft       = a.status === 'draft';
  const eventDate     = fmtDate(a.start_date);
  const submittedDate = a.created_at ? fmtDate(a.created_at) : '';

  const statusBadge = isDraft
    ? `<span class="badge bdraft"><span class="dot"></span>Draft</span>`
    : a.status === 'verified'
      ? `<span class="badge" style="background:#ecfdf5;color:#059669">&#10003; Verified</span>`
      : a.status === 'rejected'
        ? `<span class="badge" style="background:#fef2f2;color:#dc2626">&#10007; Rejected</span>`
        : `<span class="badge" style="background:#fffbeb;color:#d97706">&#9679; Pending Review</span>`;

  const viewBtn = `<button class="btn btn-sm btn-out" onclick="openModal('${a.id}')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    View
  </button>`;

  const editBtn = fullMode
    ? `<button class="btn btn-sm" onclick="openEditModal('${a.id}')" style="background:var(--teal-light);color:var(--teal);border:1px solid var(--teal-mid)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        ${isDraft ? 'Complete & Submit' : 'Edit'}
      </button>`
    : '';

  const deleteBtn = fullMode
    ? `<button class="btn btn-sm btn-d" onclick="deleteAch('${a.id}')">Delete</button>`
    : '';

  return `
    <div class="ai-card${isDraft ? ' draft-card' : ''}" style="${fullMode ? 'margin-bottom:12px' : ''}">
      <div class="ai-top">
        <div>
          <div class="ai-title">
            ${a.title || '<em style="color:var(--muted)">Untitled Draft</em>'}
            ${statusBadge}
            ${submittedDate ? `<span style="font-size:11px;font-weight:400;color:var(--muted);margin-left:8px">Saved ${submittedDate}</span>` : ''}
          </div>
          <div class="ai-meta">${a.event_name || '—'} &nbsp;·&nbsp; ${eventDate || '—'}</div>
        </div>
      </div>
      <div class="ai-bottom">
        ${a.event_type ? `<span class="tag">${a.event_type}</span>` : ''}
        ${a.level      ? `<span class="tag">${a.level}</span>`      : ''}
        ${a.result     ? `<span class="tag">${a.result}</span>`     : ''}
        <div class="ai-actions">${viewBtn}${editBtn}${deleteBtn}</div>
      </div>
    </div>`;
}

/* ── Change 1: Auto-calculate duration ──────────────────── */
function calcDuration() {
  const start = document.getElementById('f-start').value;
  const end   = document.getElementById('f-end').value;
  const pill  = document.getElementById('duration-pill');
  const text  = document.getElementById('duration-text');

  if (!start || !end) { pill.style.display = 'none'; return; }

  const s = new Date(start), e = new Date(end);
  if (e < s) {
    pill.style.display = 'flex';
    pill.style.background = 'var(--danger-light)';
    pill.style.borderColor = '#fca5a5';
    pill.style.color = 'var(--danger)';
    text.textContent = 'End date must be after start date';
    return;
  }
  const days = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  pill.style.display = 'flex';
  pill.style.background = 'var(--teal-light)';
  pill.style.borderColor = 'var(--teal-mid)';
  pill.style.color = 'var(--teal)';
  text.textContent = `Duration: ${days} day${days > 1 ? 's' : ''}`;
}

function calcEditDuration() {
  const start = document.getElementById('ef-start').value;
  const end   = document.getElementById('ef-end').value;
  const pill  = document.getElementById('edit-duration-pill');
  const text  = document.getElementById('edit-duration-text');

  if (!start || !end) { pill.style.display = 'none'; return; }

  const s = new Date(start), e = new Date(end);
  if (e < s) {
    pill.style.display = 'flex';
    pill.style.background = 'var(--danger-light)';
    pill.style.borderColor = '#fca5a5';
    pill.style.color = 'var(--danger)';
    text.textContent = 'End date must be after start date';
    return;
  }
  const days = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  pill.style.display = 'flex';
  pill.style.background = 'var(--teal-light)';
  pill.style.borderColor = 'var(--teal-mid)';
  pill.style.color = 'var(--teal)';
  text.textContent = `Duration: ${days} day${days > 1 ? 's' : ''}`;
}

/* ── Change 3: Unified file preview renderer ────────────── */
function renderPreviews(inputId, barId) {
  const files = document.getElementById(inputId).files;
  const bar   = document.getElementById(barId);
  bar.innerHTML = '';
  if (!files.length) return;

  Array.from(files).forEach(f => {
    const wrap = document.createElement('div');
    wrap.className = 'preview-thumb';

    const isPdf = f.type === 'application/pdf';

    if (isPdf) {
      const icon = document.createElement('div');
      icon.className = 'pdf-icon';
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>PDF`;
      wrap.appendChild(icon);
    } else {
      const img = document.createElement('img');
      const reader = new FileReader();
      reader.onload = e => img.src = e.target.result;
      reader.readAsDataURL(f);
      wrap.appendChild(img);
    }

    const label = document.createElement('div');
    label.className = 'fname';
    label.textContent = f.name.length > 12 ? f.name.slice(0, 10) + '…' : f.name;
    wrap.appendChild(label);
    bar.appendChild(wrap);
  });
}



/* ── Submit achievement ─────────────────────────────────── */
async function submitAchievement() {
  const title     = document.getElementById('f-title').value.trim();
  const event     = document.getElementById('f-event').value.trim();
  const type      = document.getElementById('f-type').value;
  const level     = document.getElementById('f-level').value;
  const result    = document.getElementById('f-result').value;
  const position  = document.getElementById('f-position').value.trim();
  const place     = document.getElementById('f-place').value.trim();
  const start     = document.getElementById('f-start').value;
  const end       = document.getElementById('f-end').value;
  const organiser = document.getElementById('f-organiser').value.trim();
  const certs     = document.getElementById('f-cert').files;
  const photos    = document.getElementById('f-photos').files;
  const alertEl   = document.getElementById('submit-alert');

  const missing = [];
  if (!title)          missing.push('Achievement Title');
  if (!event)          missing.push('Event Name');
  if (!organiser)      missing.push('Organiser Name');
  if (!type)           missing.push('Event Type');
  if (!level)          missing.push('Level');
  if (!result)         missing.push('Result');
  if (!position)       missing.push('Position');
  if (!place)          missing.push('Place Held');
  if (!start)          missing.push('Start Date');
  if (!end)            missing.push('End Date');
  if (!certs.length)   missing.push('Certificate');
  if (!photos.length)  missing.push('Proof Photos');

  if (missing.length) {
    alertEl.innerHTML = `<div class="alert alert-e">
      Please fill in all required fields:<br>
      <span style="font-weight:700">${missing.join(', ')}</span>
    </div>`;
    return;
  }

  // Validate dates
  if (new Date(end) < new Date(start)) {
    alertEl.innerHTML = `<div class="alert alert-e">End date must be after start date.</div>`;
    return;
  }

  const fd = new FormData();
  fd.append('status',         'pending');
  fd.append('title',          title);
  fd.append('event_name',     event);
  fd.append('event_type',     type);
  fd.append('level',          level);
  fd.append('result',         result);
  fd.append('start_date',     start);
  fd.append('end_date',       end);
  fd.append('position',       position);
  fd.append('place_held',     place);
  fd.append('organiser_name', organiser);
  fd.append('description',    document.getElementById('f-desc').value);

  for (let i = 0; i < certs.length;  i++) fd.append('certificate', certs[i]);
  for (let i = 0; i < photos.length; i++) fd.append('photos', photos[i]);

  try {
    const r = await fetch(`${API_BASE}/api/achievements`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: fd
    });
    const d = await r.json();

    if (r.ok) {
      showToast('Submitted!', 'Your achievement has been submitted.');
alertEl.innerHTML = '';
      // Reset form
      ['f-title','f-event','f-organiser','f-position','f-place','f-desc']
        .forEach(id => document.getElementById(id).value = '');
      ['f-type','f-level','f-result','f-start','f-end']
        .forEach(id => document.getElementById(id).value = '');
      document.getElementById('f-cert').value   = '';
      document.getElementById('f-photos').value = '';
      document.getElementById('cert-preview-bar').innerHTML  = '';
      document.getElementById('photo-preview-bar').innerHTML = '';
      document.getElementById('duration-pill').style.display = 'none';
      await loadAchievements();
      show('mine', document.getElementById('nav-mine'));
      setTimeout(() => alertEl.innerHTML = '', 4000);
    } else {
      alertEl.innerHTML = `<div class="alert alert-e">${d.message || d.error || 'Submission failed.'}</div>`;
    }
  } catch {
    alertEl.innerHTML = `<div class="alert alert-e">Connection error. Is the server running?</div>`;
  }
}

/* ── Change 5: Export my achievements as Excel ──────────── */
async function exportMyAchievements() {
  try {
    const token = localStorage.getItem('token');
    // Use the export route — it streams an xlsx file
    const r = await fetch(`${API_BASE}/api/export/my-students`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!r.ok) {
      // Export route is faculty-only — fall back to client-side CSV for students
      exportAsCSV();
      return;
    }

    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `my_achievements_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Fallback: export current achievements as CSV
    exportAsCSV();
  }
}

function exportAsCSV() {
  if (!achievements.length) {
    alert('No achievements to export.');
    return;
  }

  const fmtDate = s => s
    ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const headers = [
    'Title','Event Name','Organiser','Event Type','Level',
    'Result','Position','Place Held','Start Date','End Date',
    'Duration (days)','Description'
  ];

  const rows = achievements.map(a => [
    a.title          || '',
    a.event_name     || '',
    a.organiser_name || '',
    a.event_type     || '',
    a.level          || '',
    a.result         || '',
    a.position       || '',
    a.place_held     || '',
    fmtDate(a.start_date),
    fmtDate(a.end_date),
    a.duration_days  || '',
    (a.description || '').replace(/\n/g, ' ')
  ].map(v => `"${String(v).replace(/"/g, '""')}"`));

  const csv  = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `my_achievements_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ADD this instead:
function deleteAch(id) {
  document.getElementById('delete-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('delete-confirm-btn').onclick = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/achievements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      });
      if (r.ok) {
        closeDeleteModal();
        await loadAchievements();
        renderMinePage();
        showToast('Deleted', 'Achievement removed.');
      }
    } catch { closeDeleteModal(); }
  };
}

function closeDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
  document.body.style.overflow = '';
}

/* ── View Modal ─────────────────────────────────────────── */
function openModal(id) {
  const a = achievements.find(x => x.id === id);
  if (!a) return;

  const date = s => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // photo_urls may come back as a postgres array string like {file1,file2}
  let photoUrls = [];
  if (Array.isArray(a.photo_urls)) {
    photoUrls = a.photo_urls;
  } else if (typeof a.photo_urls === 'string' && a.photo_urls.startsWith('{')) {
    photoUrls = a.photo_urls.slice(1, -1).split(',').filter(Boolean);
  }

  // certificate_url may be comma-separated (multiple certs)
  const certFiles = a.certificate_url
    ? a.certificate_url.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  let photoHtml = '';
  if (photoUrls.length) {
    photoHtml = `
      <div style="margin-top:14px">
        <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Proof Photos</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${photoUrls.map(url => `
            <img src="${url.trim()}"
              onclick="openLightbox(this.src)"
              style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:2px solid var(--teal-mid);cursor:pointer;transition:transform .15s"
              onmouseover="this.style.transform='scale(1.05)'"
              onmouseout="this.style.transform='scale(1)'"
            />`).join('')}
        </div>
      </div>`;
  }

  let certHtml = '';
  if (certFiles.length) {
    certHtml = `
      <div style="margin-top:14px">
        <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Certificate${certFiles.length > 1 ? 's' : ''}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${certFiles.map(f => {
            const isPdf = f.toLowerCase().endsWith('.pdf');
            return isPdf
              ? `<a href="${f}" target="_blank" class="btn btn-sm btn-out">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  View PDF
                </a>`
              : `<img src="${f}"
                    onclick="openLightbox(this.src)"
                    style="max-width:140px;max-height:140px;object-fit:contain;border-radius:8px;border:1px solid var(--border);cursor:pointer"/>`;
          }).join('')}
        </div>
      </div>`;
  }

  const statusHtml = a.status === 'draft'
    ? `<span class="badge bdraft" style="margin-top:6px"><span class="dot"></span>Draft</span>`
    : a.status === 'verified'
      ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#ecfdf5;color:#059669;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;margin-top:6px">&#10003; Verified</span>`
      : a.status === 'rejected'
        ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#fef2f2;color:#dc2626;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;margin-top:6px">&#10007; Rejected</span>`
        : `<span style="display:inline-flex;align-items:center;gap:4px;background:#fffbeb;color:#d97706;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;margin-top:6px">&#9679; Pending Review</span>`;

  document.getElementById('modal-body').innerHTML = `
    <div style="margin-bottom:16px">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:4px">${a.title || 'Untitled Draft'}</h2>
      <div style="font-size:13px;color:var(--muted)">${a.event_name || ''}</div>
      ${statusHtml}
      ${a.status === 'rejected' && a.remarks ? `<div style="margin-top:8px;padding:9px 12px;background:#fef2f2;border:1px solid #fca5a5;border-radius:7px;font-size:12px;color:#b91c1c"><strong>Reason:</strong> ${a.remarks}</div>` : ''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px">
      ${row('Event Type',   cap(a.event_type))}
      ${row('Level',        cap(a.level))}
      ${row('Result',       cap(a.result))}
      ${row('Position',     a.position || '—')}
      ${row('Place Held',   a.place_held || '—')}
      ${row('Organiser',    a.organiser_name || '—')}
      ${row('Start Date',   date(a.start_date))}
      ${row('End Date',     date(a.end_date))}
      ${a.duration_days ? row('Duration', a.duration_days + ' day' + (a.duration_days > 1 ? 's' : '')) : ''}
    </div>

    ${a.description ? `<div style="margin-top:12px;padding:10px 12px;background:#f8fafb;border-radius:7px;font-size:13px;color:var(--muted)">${a.description}</div>` : ''}
    ${photoHtml}
    ${certHtml}
  `;

  document.getElementById('achievement-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('achievement-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function row(label, value) {
  return `<div style="background:#f8fafb;border-radius:7px;padding:9px 12px">
    <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:2px">${label}</div>
    <div style="font-size:13px;font-weight:600">${value}</div>
  </div>`;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') : '—'; }

/* ── Lightbox ───────────────────────────────────────────── */
function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
  document.body.style.overflow = '';
}

/* ── Edit Modal ─────────────────────────────────────────── */
function openEditModal(id) {
  const a = achievements.find(x => x.id === id);
  if (!a) return;

  document.getElementById('edit-id').value         = a.id;
  document.getElementById('ef-title').value        = a.title || '';
  document.getElementById('ef-event').value        = a.event_name || '';
  document.getElementById('ef-organiser').value    = a.organiser_name || '';
  document.getElementById('ef-type').value         = a.event_type || '';
  document.getElementById('ef-level').value        = a.level || '';
  document.getElementById('ef-result').value       = a.result || '';
  document.getElementById('ef-position').value     = a.position || '';
  document.getElementById('ef-place').value        = a.place_held || '';
  document.getElementById('ef-start').value        = a.start_date ? a.start_date.slice(0, 10) : '';
  document.getElementById('ef-end').value          = a.end_date   ? a.end_date.slice(0, 10)   : '';
  document.getElementById('ef-desc').value         = a.description || '';
  document.getElementById('edit-alert').innerHTML  = '';
  document.getElementById('ef-cert-preview').innerHTML  = '';
  document.getElementById('ef-photo-preview').innerHTML = '';

  // Show existing duration on open
  calcEditDuration();

  document.getElementById('edit-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function saveEdit(action = 'save') {
  const id        = document.getElementById('edit-id').value;
  const title     = document.getElementById('ef-title').value.trim();
  const event     = document.getElementById('ef-event').value.trim();
  const type      = document.getElementById('ef-type').value;
  const level     = document.getElementById('ef-level').value;
  const result    = document.getElementById('ef-result').value;
  const position  = document.getElementById('ef-position').value.trim();
  const place     = document.getElementById('ef-place').value.trim();
  const start     = document.getElementById('ef-start').value;
  const end       = document.getElementById('ef-end').value;
  const organiser = document.getElementById('ef-organiser').value.trim();
  const alertEl   = document.getElementById('edit-alert');

  // Get the achievement to know its current status
  const existing = achievements.find(x => x.id === id);
  const isDraft  = existing?.status === 'draft';

  const missing = [];
  if (!title)    missing.push('Achievement Title');
  if (!event)    missing.push('Event Name');
  if (!type)     missing.push('Event Type');
  if (!level)    missing.push('Level');
  if (!result)   missing.push('Result');
  if (!position) missing.push('Position');
  if (!place)    missing.push('Place Held');
  if (!start)    missing.push('Start Date');
  if (!end)      missing.push('End Date');

  // If editing a draft, check if they want to submit it (all required filled)
if (action === 'submit' && missing.length) {
    // Clear previous stars
    document.querySelectorAll('.field-error-star').forEach(el => el.remove());
    document.querySelectorAll('.field-error-input').forEach(el => el.classList.remove('field-error-input'));

    const fieldMap = [
      { missingLabel: 'Achievement Title', inputId: 'ef-title' },
      { missingLabel: 'Event Name',        inputId: 'ef-event' },
      { missingLabel: 'Event Type',        inputId: 'ef-type' },
      { missingLabel: 'Level',             inputId: 'ef-level' },
      { missingLabel: 'Result',            inputId: 'ef-result' },
      { missingLabel: 'Position',          inputId: 'ef-position' },
      { missingLabel: 'Place Held',        inputId: 'ef-place' },
      { missingLabel: 'Start Date',        inputId: 'ef-start' },
      { missingLabel: 'End Date',          inputId: 'ef-end' },
    ];

    let firstEl = null;
    fieldMap.forEach(({ missingLabel, inputId }) => {
      if (!missing.includes(missingLabel)) return;
      const input = document.getElementById(inputId);
      if (input) {
        input.classList.add('field-error-input');
        if (!firstEl) firstEl = input;
      }
    });

    if (firstEl) firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
// Clear any previous error markers

  const fd = new FormData();
  fd.append('title',          title);
  fd.append('event_name',     event);
  fd.append('event_type',     type);
  fd.append('level',          level);
  fd.append('result',         result);
  fd.append('position',       position);
  fd.append('place_held',     place);
  fd.append('start_date',     start);
  fd.append('end_date',       end);
  fd.append('organiser_name', organiser);
  fd.append('description',    document.getElementById('ef-desc').value);
  // If it was a draft and all fields are filled, submit it; otherwise keep as draft
  fd.append('status', action === 'submit' ? 'pending' : (isDraft ? 'draft' : 'pending'));

  const certs  = document.getElementById('ef-cert').files;
  const photos = document.getElementById('ef-photos').files;
  for (let i = 0; i < certs.length;  i++) fd.append('certificate', certs[i]);
  for (let i = 0; i < photos.length; i++) fd.append('photos', photos[i]);

  try {
    const r = await fetch(`${API_BASE}/api/achievements/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: fd
    });
    const d = await r.json();
    if (r.ok) {
      const msg = action === 'submit' ? 'Draft submitted successfully!' : 'Achievement updated!';
      alertEl.innerHTML = '';
showToast(msg);
await loadAchievements();
setTimeout(() => { closeEditModal(); renderMinePage(); }, 1800);
    } else {
      alertEl.innerHTML = `<div class="alert alert-e">${d.message || d.error || 'Update failed.'}</div>`;
    }
  } catch {
    alertEl.innerHTML = `<div class="alert alert-e">Connection error. Is the server running?</div>`;
  }
}

/* ── Helpers ─────────────────────────────────────────────── */
function emptyState(msg, extra = '') {
  return `<div class="empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:46px;height:46px;margin:0 auto 10px;display:block;opacity:.3">
      <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
    <p>${msg} ${extra}</p>
  </div>`;
}
async function saveDraft() {
  const alertEl = document.getElementById('submit-alert');

  const fd = new FormData();
  fd.append('status',         'draft');
  fd.append('title',          document.getElementById('f-title').value.trim());
  fd.append('event_name',     document.getElementById('f-event').value.trim());
  fd.append('event_type',     document.getElementById('f-type').value);
  fd.append('level',          document.getElementById('f-level').value);
  fd.append('result',         document.getElementById('f-result').value);
  fd.append('position',       document.getElementById('f-position').value.trim());
  fd.append('place_held',     document.getElementById('f-place').value.trim());
  fd.append('start_date',     document.getElementById('f-start').value);
  fd.append('end_date',       document.getElementById('f-end').value);
  fd.append('organiser_name', document.getElementById('f-organiser').value.trim());
  fd.append('description',    document.getElementById('f-desc').value);

  const certs  = document.getElementById('f-cert').files;
  const photos = document.getElementById('f-photos').files;
  for (let i = 0; i < certs.length;  i++) fd.append('certificate', certs[i]);
  for (let i = 0; i < photos.length; i++) fd.append('photos', photos[i]);

  try {
    const r = await fetch(`${API_BASE}/api/achievements`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: fd
    });
    const d = await r.json();
    if (r.ok) {
      showToast('Draft Saved!', 'Find it in My Achievements → Drafts.');
alertEl.innerHTML = '';
      await loadAchievements();
      show('mine', document.getElementById('nav-mine'));
      setTimeout(() => alertEl.innerHTML = '', 5000);
    } else {
      alertEl.innerHTML = `<div class="alert alert-e">${d.error || 'Could not save draft.'}</div>`;
    }
  } catch {
    alertEl.innerHTML = `<div class="alert alert-e">Connection error. Is the server running?</div>`;
  }
}
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}