/* ============================================================
   admin.js  —  GITAM Achievements Portal (Admin)
   ============================================================ */

let allStudents = [], allFaculty = [], allAchievements = [], allUsers = [];
let studentAchievements = [], facultyAchievements = [];

// ── Auth guard ──
(function() {
  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user || user.role !== 'admin') {
    window.location.href = 'login.html';
  }
})();

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  const name = u.name || u.faculty_code || 'Admin';
  document.getElementById('pname').textContent = name;
  document.getElementById('pid').textContent   = u.faculty_code || u.email || u.id || '—';
  document.getElementById('av').textContent    = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  loadAll();
});

// ── Navigation ──
function show(page, el) {
  document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
  document.getElementById('page-' + page).style.display = 'block';
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  closeSb();
  if (page === 'student-achievements') filterStudentAch();
  if (page === 'faculty-achievements') filterFacultyAch();
}

function toggleSb() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeSb() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ── XSS helper ──
function esc(str) {
  if (str == null) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Status badge helper ──
function statusBadge(status) {
  if (status === 'verified') return `<span class="status-verified">&#10003; Verified</span>`;
  if (status === 'rejected') return `<span class="status-rejected">&#10007; Rejected</span>`;
  return `<span class="status-pending">&#9679; Pending</span>`;
}

// ── Charts ──
let chartType = null, chartMonthly = null;

async function renderCharts() {
  const wrapType    = document.getElementById('chart-type-wrap');
  const wrapMonthly = document.getElementById('chart-monthly-wrap');
  try {
    const stats = await api('/api/achievements/stats');
    const PALETTE = ['#0A7C6C','#14b8a6','#f59e0b','#a78bfa','#f87171','#60a5fa'];
    const hasType = stats.byType && stats.byType.length > 0;
    const typeLabels = hasType ? stats.byType.map(r => r.event_type ? r.event_type.charAt(0).toUpperCase() + r.event_type.slice(1) : 'Other') : ['No data'];
    const typeCounts = hasType ? stats.byType.map(r => +r.count) : [1];
    const typeColors = hasType ? PALETTE.slice(0, typeLabels.length) : ['#e5e7eb'];

    const ctxType = document.getElementById('chart-type')?.getContext('2d');
    if (ctxType) {
      if (chartType) chartType.destroy();
      chartType = new Chart(ctxType, {
        type: 'doughnut',
        data: { labels: typeLabels, datasets: [{ data: typeCounts, backgroundColor: typeColors, borderWidth: 3, borderColor: '#fff', hoverOffset: 10 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          animation: { duration: 700 },
          plugins: {
            legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, padding: 16, usePointStyle: true, pointStyleWidth: 8 } },
            tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + ctx.raw } }
          }
        }
      });
    }

    // Full 12-month axis — fill missing months with 0
    const now = new Date();
    const allKeys = [], allLabels = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      allKeys.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0'));
      allLabels.push(d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }));
    }
    const monthMap = {};
    (stats.byMonth || []).forEach(r => { monthMap[r.month] = +r.count; });
    const monthCounts = allKeys.map(k => monthMap[k] || 0);

    const ctxMonth = document.getElementById('chart-monthly')?.getContext('2d');
    if (ctxMonth) {
      if (chartMonthly) chartMonthly.destroy();
      const grad = ctxMonth.createLinearGradient(0, 0, 0, 220);
      grad.addColorStop(0, 'rgba(10,124,108,0.88)');
      grad.addColorStop(1, 'rgba(10,124,108,0.22)');
      chartMonthly = new Chart(ctxMonth, {
        type: 'bar',
        data: { labels: allLabels, datasets: [{ label: 'Submissions', data: monthCounts, backgroundColor: grad, borderRadius: { topLeft: 5, topRight: 5 }, borderSkipped: false, maxBarThickness: 32 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 700 },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ' ' + ctx.raw + ' submission' + (ctx.raw !== 1 ? 's' : '') } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 9 }, maxRotation: 45 } },
            y: { beginAtZero: true, ticks: { precision: 0, stepSize: 1, font: { family: 'DM Sans', size: 10 } }, grid: { color: '#f3f4f6' } }
          }
        }
      });
    }
  } catch (e) {
    console.warn('Charts could not load:', e.message);
    if (wrapType)    wrapType.innerHTML    = '<div style="height:240px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px">No data yet</div>';
    if (wrapMonthly) wrapMonthly.innerHTML = '<div style="height:240px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px">No data yet</div>';
  }
}

// ── Date helpers ──
// Normalise any ISO timestamp or date string to "YYYY-MM-DD"
function toDateStr(s) {
  if (!s) return '';
  return String(s).slice(0, 10);   // "2026-04-01T00:00:00Z" → "2026-04-01"
}

const fmtD = s => {
  const d = toDateStr(s);
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

// ── API ──
async function api(path) {
  const r = await fetch(API_BASE + path, {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
  });
  if (r.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    throw new Error('Unauthorized');
  }
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`${r.status} ${r.statusText}${text ? ': ' + text.slice(0, 120) : ''}`);
  }
  return r.json();
}

// ── Loading / error state helpers ──
function setLoadingState(isLoading, errorMsg = '') {
  const banner  = document.getElementById('load-error-banner');
  const spinner = document.getElementById('load-spinner');
  if (spinner) spinner.style.display = isLoading ? 'flex' : 'none';
  if (!banner) return;
  if (errorMsg) {
    banner.style.display = 'flex';
    document.getElementById('load-error-msg').textContent = errorMsg;
  } else {
    banner.style.display = 'none';
  }
}

// ── Load all data ──
async function loadAll() {
  setLoadingState(true);
  const errors = [];

  // Students + faculty + achievements — fetch in parallel
  let facultyList = [];
  await Promise.all([
    api('/api/users/students').then(d => { allStudents = d || []; }).catch(e => { allStudents = []; errors.push('students: ' + e.message); }),
    api('/api/users/faculty').then(d => { facultyList = d || []; }).catch(() =>
      api('/api/faculty').then(d => { facultyList = d || []; }).catch(e => errors.push('faculty: ' + e.message))
    ),
  ]);

  allStudents = allStudents.map(u => ({ role: 'student', ...u }));
  facultyList = facultyList.map(u => ({ role: 'faculty', ...u }));
  allUsers    = [...allStudents, ...facultyList];
  allFaculty  = facultyList;

  // Achievements
  try { allAchievements = await api('/api/achievements/all') || []; }
  catch (e1) {
    try { allAchievements = await api('/api/achievements?all=true') || []; }
    catch (e2) { allAchievements = []; errors.push('achievements: ' + e1.message); }
  }

  // Split by submitter role
  studentAchievements = allAchievements.filter(a => {
    const u = allUsers.find(u => String(u.id) === String(a.user_id));
    if (u) return u.role === 'student';
    if (a.user_role) return a.user_role === 'student';
    if (a.role)      return a.role === 'student';
    return !!(a.roll_number);
  });

  facultyAchievements = allAchievements.filter(a => {
    const u = allUsers.find(u => String(u.id) === String(a.user_id));
    if (u) return u.role === 'faculty';
    if (a.user_role) return a.user_role === 'faculty';
    if (a.role)      return a.role === 'faculty';
    return !!(a.faculty_code);
  });

  setLoadingState(false, errors.length ? errors.join(' | ') : '');
  renderDash();
  renderCharts();
}

// ── Dashboard ──
function renderDash() {
  document.getElementById('s-total').textContent     = allAchievements.length;
  document.getElementById('s-academic').textContent  = allAchievements.filter(a => a.event_type === 'academic').length;
  document.getElementById('s-technical').textContent = allAchievements.filter(a => a.event_type === 'technical').length;
  document.getElementById('s-sports').textContent    = allAchievements.filter(a => a.event_type === 'sports').length;
  document.getElementById('s-cultural').textContent  = allAchievements.filter(a => a.event_type === 'cultural').length;

  const aEl = document.getElementById('dt-ach');

  if (allAchievements.length === 0) {
    aEl.innerHTML = `<tr><td colspan="6"><div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:46px;height:46px;margin:0 auto 10px;display:block;opacity:.3"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
      <p>No achievements yet. Make sure <code style="background:#f0f0f0;padding:1px 5px;border-radius:3px">GET /api/achievements/all</code> exists and returns data.</p>
    </div></td></tr>`;
    return;
  }

  aEl.innerHTML = allAchievements.slice(0, 8).map(a => {
    const submitter     = allUsers.find(u => String(u.id) === String(a.user_id));
    const submitterName = submitter ? submitter.name : (a.student_name || a.faculty_name || '—');
    const submitterId   = submitter
      ? (submitter.roll_number || submitter.faculty_code || '')
      : (a.roll_number || a.faculty_code || '');

    return `<tr>
      <td>
        <button class="btn btn-sm btn-out" onclick="openViewModal('${esc(a.id)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View
        </button>
      </td>
      <td><div class="sname">${esc(submitterName)}</div><div class="sroll">${esc(submitterId)}</div></td>
      <td style="font-size:13px;font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.title)}</td>
      <td style="font-size:12px">${esc(a.event_type)}</td>
      <td style="font-size:12px">${fmtD(a.start_date)}</td>
      <td>${statusBadge(a.status)}</td>
    </tr>`;
  }).join('');
}

// ── Student Achievements page ──
// ── ID/name helpers — pull from achievement fields first, user join as fallback ──
function getStudentId(a) {
  const st = allUsers.find(u => String(u.id) === String(a.user_id));
  return a.roll_number || st?.roll_number || '';
}
function getStudentName(a) {
  const st = allUsers.find(u => String(u.id) === String(a.user_id));
  return a.student_name || st?.name || '—';
}
function findFacUser(a) {
  return allUsers.find(u => a.user_id && String(u.id) === String(a.user_id));
}
function getFacultyId(a) {
  const fac = findFacUser(a);
  return String(fac?.faculty_code || a.faculty_code || '');
}
function getFacultyName(a) {
  // Backend stores faculty name in student_name column; faculty_name is always null
  const fac = findFacUser(a);
  return a.student_name || a.faculty_name || fac?.name || '—';
}

function filterStudentAch() {
  const ty   = document.getElementById('ftype-s').value;
  const from = document.getElementById('fdate-from-s').value;
  const to   = document.getElementById('fdate-to-s').value;
  const idQ  = document.getElementById('fsearch-s').value.trim().toLowerCase();
  let data = studentAchievements;
  if (ty)   data = data.filter(a => a.event_type === ty);
  if (from) data = data.filter(a => toDateStr(a.start_date) >= from);
  if (to)   data = data.filter(a => toDateStr(a.start_date) <= to);
  if (idQ)  data = data.filter(a =>
    getStudentId(a).toLowerCase().includes(idQ) ||
    getStudentName(a).toLowerCase().includes(idQ)
  );
  renderStudentAchPage(data);
}

function clearStudentFilters() {
  document.getElementById('ftype-s').value      = '';
  document.getElementById('fdate-from-s').value = '';
  document.getElementById('fdate-to-s').value   = '';
  document.getElementById('fsearch-s').value    = '';
  renderStudentAchPage(studentAchievements);
}

function renderStudentAchPage(data) {
  const tb      = document.getElementById('tb-student-ach');
  const countEl = document.getElementById('student-ach-count');
  if (countEl) countEl.textContent = `${data.length} record${data.length !== 1 ? 's' : ''}`;

  // BUG FIX: colspan was 7 but table has 8 columns
  tb.innerHTML = data.length === 0
    ? `<tr><td colspan="8"><div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:46px;height:46px;margin:0 auto 10px;display:block;opacity:.3"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
        <p>${studentAchievements.length === 0
          ? 'No student achievements found. Check that <code style="background:#f0f0f0;padding:1px 5px;border-radius:3px">GET /api/achievements/all</code> returns data.'
          : 'No results match the current filters.'}</p>
      </div></td></tr>`
    : data.map((a, i) => {
        const stName = getStudentName(a);
        const stId   = getStudentId(a);
        return `<tr>
          <td style="color:var(--muted);font-size:12px">${i + 1}</td>
          <td><div class="sname">${esc(stName)}</div><div class="sroll">${esc(stId)}</div></td>
          <td>
            <button class="btn btn-sm btn-out" onclick="openViewModal('${esc(a.id)}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View
            </button>
          </td>
          <td style="font-size:13px;font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.title)}</td>
          <td style="font-size:12px">${esc(a.event_type)}</td>
          <td style="font-size:12px">${esc(a.level)}</td>
          <td style="font-size:12px">${esc(a.result)}</td>
          <td>${statusBadge(a.status)}</td>
          <td style="font-size:12px">${fmtD(a.start_date)}</td>
        </tr>`;
      }).join('');
}

// ── Faculty Achievements page ──
function filterFacultyAch() {
  const ty   = document.getElementById('ftype-f').value;
  const from = document.getElementById('fdate-from-f').value;
  const to   = document.getElementById('fdate-to-f').value;
  const idQ  = document.getElementById('fsearch-f').value.trim().toLowerCase();
  let data = facultyAchievements;
  if (ty)   data = data.filter(a => a.event_type === ty);
  if (from) data = data.filter(a => toDateStr(a.start_date) >= from);
  if (to)   data = data.filter(a => toDateStr(a.start_date) <= to);
  if (idQ)  data = data.filter(a =>
    getFacultyId(a).toLowerCase().includes(idQ) ||
    getFacultyName(a).toLowerCase().includes(idQ)
  );
  renderFacultyAchPage(data);
}

function clearFacultyFilters() {
  document.getElementById('ftype-f').value      = '';
  document.getElementById('fdate-from-f').value = '';
  document.getElementById('fdate-to-f').value   = '';
  document.getElementById('fsearch-f').value    = '';
  renderFacultyAchPage(facultyAchievements);
}

function renderFacultyAchPage(data) {
  const tb      = document.getElementById('tb-faculty-ach');
  const countEl = document.getElementById('faculty-ach-count');
  if (countEl) countEl.textContent = `${data.length} record${data.length !== 1 ? 's' : ''}`;

  tb.innerHTML = data.length === 0
    ? `<tr><td colspan="8"><div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:46px;height:46px;margin:0 auto 10px;display:block;opacity:.3"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
        <p>${facultyAchievements.length === 0
          ? 'No faculty achievements found.'
          : 'No results match the current filters.'}</p>
      </div></td></tr>`
    : data.map((a, i) => {
        const facName = getFacultyName(a);
        const facCode = getFacultyId(a);
        return `<tr>
          <td style="color:var(--muted);font-size:12px">${i + 1}</td>
          <td><div class="sname">${esc(facName)}</div><div class="sroll">${esc(facCode)}</div></td>
          <td>
            <button class="btn btn-sm btn-out" onclick="openViewModal('${esc(a.id)}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View
            </button>
          </td>
          <td style="font-size:13px;font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.title)}</td>
          <td style="font-size:12px">${esc(a.event_type)}</td>
          <td style="font-size:12px">${esc(a.level)}</td>
          <td style="font-size:12px">${esc(a.result)}</td>
          <td>${statusBadge(a.status)}</td>
          <td style="font-size:12px">${fmtD(a.start_date)}</td>
        </tr>`;
      }).join('');
}

// ── View modal ──
// BUG FIX: coerce both sides to String so numeric DB ids match string ids from template literals
function openViewModal(id) {
  const a  = allAchievements.find(x => String(x.id) === String(id));
  if (!a) return;
  const st = allUsers.find(u => String(u.id) === String(a.user_id));

  let photoUrls = [];
  if (a.photo_urls) {
    if (Array.isArray(a.photo_urls)) {
      photoUrls = a.photo_urls.filter(Boolean);
    } else if (typeof a.photo_urls === 'string') {
      if (a.photo_urls.startsWith('{')) {
        photoUrls = a.photo_urls.slice(1, -1).split(',').filter(Boolean);
      } else if (a.photo_urls.trim()) {
        photoUrls = [a.photo_urls];
      }
    }
  }

  const photoHtml = photoUrls.length ? `
    <div style="margin-top:14px">
      <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Proof Photos</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${photoUrls.map(url => `<img src="${API_BASE}/uploads/${encodeURIComponent(url.trim())}" onclick="openLightbox(this.src)"
          style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:2px solid var(--teal-mid);cursor:pointer;transition:transform .15s"
          onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"/>`).join('')}
      </div>
    </div>` : '';

  const certFiles = a.certificate_url
    ? a.certificate_url.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const certHtml = certFiles.length ? `
    <div style="margin-top:14px">
      <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Certificate${certFiles.length > 1 ? 's' : ''}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${certFiles.map(f => f.toLowerCase().endsWith('.pdf')
          ? `<a href="${API_BASE}/uploads/${encodeURIComponent(f)}" target="_blank" class="btn btn-sm btn-out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              View PDF
            </a>`
          : `<img src="${API_BASE}/uploads/${encodeURIComponent(f)}" onclick="openLightbox(this.src)"
                style="max-width:140px;max-height:140px;object-fit:contain;border-radius:8px;border:1px solid var(--border);cursor:pointer"/>`
        ).join('')}
      </div>
    </div>` : '';

  const cap  = s => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—';
  const drow = (label, value) => `<div style="background:#f8fafb;border-radius:7px;padding:9px 12px">
    <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:2px">${label}</div>
    <div style="font-size:13px;font-weight:600">${value}</div>
  </div>`;

  const role          = st?.role || a.user_role || a.role || (a.roll_number ? 'student' : 'faculty');
  const submitterName = role === 'faculty' ? getFacultyName(a) : getStudentName(a);
  const submitterId   = role === 'faculty' ? getFacultyId(a)   : getStudentId(a);
  const roleLabel = role === 'faculty'
    ? `<span class="badge bf" style="margin-left:6px">Faculty</span>`
    : `<span class="badge bs" style="margin-left:6px">Student</span>`;

  document.getElementById('modal-body').innerHTML = `
    <div style="margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin-bottom:3px">${esc(a.title)}</h2>
      <div style="font-size:13px;color:var(--muted)">${esc(a.event_name)}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:5px;display:flex;align-items:center;flex-wrap:wrap;gap:6px">
        By <strong style="margin:0 2px">${esc(submitterName)}</strong>
        ${submitterId ? `(${esc(submitterId)})` : ''}
        ${roleLabel}
        &nbsp;·&nbsp; Submitted ${fmtD(a.created_at)}
        &nbsp;·&nbsp; ${statusBadge(a.status)}
      </div>
      ${a.remarks ? `<div style="margin-top:8px;padding:8px 12px;background:var(--danger-light);border-radius:6px;font-size:12px;color:var(--danger)"><strong>Rejection reason:</strong> ${esc(a.remarks)}</div>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px">
      ${drow('Event Type', cap(a.event_type))}
      ${drow('Level',      cap(a.level))}
      ${drow('Result',     cap(a.result))}
      ${drow('Position',   esc(a.position)   || '—')}
      ${drow('Place Held', esc(a.place_held) || '—')}
      ${a.organiser_name ? drow('Organiser', esc(a.organiser_name)) : ''}
      ${drow('Start Date', fmtD(a.start_date))}
      ${drow('End Date',   fmtD(a.end_date))}
      ${a.duration_days ? drow('Duration', esc(a.duration_days) + ' day(s)') : ''}
    </div>
    ${a.description ? `<div style="margin-top:12px;padding:10px 12px;background:#f8fafb;border-radius:7px;font-size:13px;color:var(--muted)">${esc(a.description)}</div>` : ''}
    ${photoHtml}
    ${certHtml}
  `;

  // Show/hide action buttons based on status
  const canAct = a.status === 'pending';
  const verifyBtn = document.getElementById('btn-verify');
  const rejectSec = document.getElementById('reject-section');
  const pdfBtn    = document.getElementById('btn-pdf');
  const rejectBox = document.getElementById('reject-box');
  const remarks   = document.getElementById('reject-remarks');

  verifyBtn.style.display = canAct ? 'inline-flex' : 'none';
  rejectSec.style.display = canAct ? 'flex' : 'none';
  if (rejectBox) rejectBox.style.display = 'none';
  if (remarks) remarks.value = '';

  // PDF button only for student achievements
  pdfBtn.style.display = (role === 'student') ? 'inline-flex' : 'none';

  // Store current achievement id and student user_id for action functions
  verifyBtn.dataset.achId   = a.id;
  pdfBtn.dataset.userId      = a.user_id;
  document.getElementById('reject-section').dataset.achId = a.id;

  document.getElementById('view-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeViewModal() {
  document.getElementById('view-modal').style.display = 'none';
  document.body.style.overflow = '';
}

// ── Verify / Reject functions ──
let _verifyTimeout = null;

async function verifyAchievement() {
  const id  = document.getElementById('btn-verify').dataset.achId;
  const btn = document.getElementById('btn-verify');
  btn.disabled = true;
  btn.textContent = 'Verifying…';
  try {
    await fetch(`${API_BASE}/api/achievements/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: JSON.stringify({ status: 'verified' })
    });
    // Update local data and re-render
    const ach = allAchievements.find(a => String(a.id) === String(id));
    if (ach) ach.status = 'verified';
    closeViewModal();
    renderDash();
    filterStudentAch();
    filterFacultyAch();
    renderCharts();
  } catch (e) {
    alert('Could not verify achievement: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '&#10003; Verify';
  }
}

function toggleRejectBox() {
  const box = document.getElementById('reject-box');
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

async function rejectAchievement() {
  const id      = document.getElementById('reject-section').dataset.achId;
  const remarks = document.getElementById('reject-remarks').value.trim();
  try {
    await fetch(`${API_BASE}/api/achievements/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: JSON.stringify({ status: 'rejected', remarks })
    });
    const ach = allAchievements.find(a => String(a.id) === String(id));
    if (ach) { ach.status = 'rejected'; ach.remarks = remarks; }
    closeViewModal();
    renderDash();
    filterStudentAch();
    filterFacultyAch();
    renderCharts();
  } catch (e) {
    alert('Could not reject achievement: ' + e.message);
  }
}

function downloadPDF() {
  const userId = document.getElementById('btn-pdf').dataset.userId;
  const token  = localStorage.getItem('token');
  const url    = `${API_BASE}/api/export/pdf/student/${userId}`;
  // Open in new tab — browser will download the PDF
  const a = document.createElement('a');
  a.href   = url;
  a.target = '_blank';
  a.setAttribute('download', '');
  // Attach auth via fetch then blob (because <a> can't set headers)
  fetch(url, { headers: { Authorization: 'Bearer ' + token } })
    .then(r => r.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.download = `achievements_${userId}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    })
    .catch(e => alert('PDF download failed: ' + e.message));
}

// ── Lightbox ──
function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
  document.body.style.overflow = '';
}

// ── Export — server-side Excel (matches active filters) ──
async function exportAll(role) {
  const params = new URLSearchParams({ role });
  if (role === 'student') {
    const ty   = document.getElementById('ftype-s')?.value      || '';
    const from = document.getElementById('fdate-from-s')?.value || '';
    const to   = document.getElementById('fdate-to-s')?.value   || '';
    const q    = document.getElementById('fsearch-s')?.value.trim() || '';
    if (ty)   params.set('event_type', ty);
    if (from) params.set('from', from);
    if (to)   params.set('to', to);
    if (q)    params.set('search', q);
  } else {
    const ty   = document.getElementById('ftype-f')?.value      || '';
    const from = document.getElementById('fdate-from-f')?.value || '';
    const to   = document.getElementById('fdate-to-f')?.value   || '';
    const q    = document.getElementById('fsearch-f')?.value.trim() || '';
    if (ty)   params.set('event_type', ty);
    if (from) params.set('from', from);
    if (to)   params.set('to', to);
    if (q)    params.set('search', q);
  }

  try {
    const btn = event?.currentTarget;
    if (btn) { btn.disabled = true; btn.textContent = 'Exporting…'; }
    const r = await fetch(API_BASE + '/api/export/all?' + params.toString(), {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
    });
    if (!r.ok) throw new Error('Export failed (' + r.status + ')');
    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = role + '_achievements_' + Date.now() + '.xlsx';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 3000);
    if (btn) { btn.disabled = false; btn.textContent = 'Export Excel'; }
  } catch (err) {
    alert('Export failed: ' + err.message);
    const btn = event?.currentTarget;
    if (btn) { btn.disabled = false; btn.textContent = 'Export Excel'; }
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}