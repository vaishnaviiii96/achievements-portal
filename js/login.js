// js/login.js

const API = API_BASE;

let currentRole = 'student';

const placeholders = {
  student: 'Roll Number',
  faculty: 'Faculty ID',
  admin:   'Admin ID'
};

function switchRole(role, tabEl) {
  currentRole = role;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');
  document.getElementById('identifier').placeholder = placeholders[role];
  document.getElementById('identifier').value = '';
  document.getElementById('password').value   = '';
  clearAlert();
}

function showAlert(msg, type = 'err') {
  const el = document.getElementById('alert');
  el.textContent = msg;
  el.className = 'alert ' + type;
}

function clearAlert() {
  document.getElementById('alert').className = 'alert';
}

async function doLogin() {
  const identifier = document.getElementById('identifier').value.trim();
  const password   = document.getElementById('password').value;

  if (!identifier || !password) {
    showAlert('Please fill in all fields.');
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span>Signing in…';
  clearAlert();

  try {
    const res  = await fetch(`${API}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ identifier, role: currentRole, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(data.message || data.error || 'Login failed. Please try again.');
      btn.disabled  = false;
      btn.innerHTML = 'LOGIN';
      return;
    }

    // Validate the response has what we need before storing
    if (!data.token || !data.user || !data.user.role) {
      showAlert('Unexpected response from server. Please try again.');
      btn.disabled  = false;
      btn.innerHTML = 'LOGIN';
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user',  JSON.stringify(data.user));

    const redirects = {
      student: 'student.html',
      faculty: 'faculty.html',
      admin:   'admin.html'
    };

    const dest = redirects[data.user.role];
console.log('redirecting to:', dest, 'role:', data.user.role);
window.location.replace(dest);  // add this line explicitly right here too
    if (!dest) {
      showAlert('Unknown role "' + data.user.role + '". Contact admin.');
      btn.disabled  = false;
      btn.innerHTML = 'LOGIN';
      return;
    }

    showAlert('Login successful! Redirecting…', 'ok');
    // Use replace() so back button doesn't return to login
    setTimeout(() => window.location.replace(dest), 500);

  } catch (err) {
    showAlert('Cannot connect to server. Make sure the backend is running.');
    btn.disabled  = false;
    btn.innerHTML = 'LOGIN';
  }
}

document.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });