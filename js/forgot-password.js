// js/forgot-password.js
// Assumes API_BASE is defined in config.js (matches your existing pattern)

let userEmail = '';
let resetToken = '';

document.getElementById('sendOtpBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const msg = document.getElementById('emailMsg');
  if (!email) return (msg.textContent = 'Enter an email.');

  try {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    msg.textContent = data.message;

    if (res.ok) {
      userEmail = email;
      document.getElementById('step-email').style.display = 'none';
      document.getElementById('step-otp').style.display = 'block';
    }
  } catch {
    msg.textContent = 'Network error. Please try again.';
  }
});

document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
  const otp = document.getElementById('otp').value.trim();
  const msg = document.getElementById('otpMsg');
  if (!otp) return (msg.textContent = 'Enter the code.');

  try {
    const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, otp }),
    });
    const data = await res.json();
    msg.textContent = data.message;

    if (res.ok) {
      resetToken = data.resetToken;
      document.getElementById('step-otp').style.display = 'none';
      document.getElementById('step-reset').style.display = 'block';
    }
  } catch {
    msg.textContent = 'Network error. Please try again.';
  }
});

document.getElementById('resetBtn').addEventListener('click', async () => {
  const newPassword = document.getElementById('newPassword').value;
  const msg = document.getElementById('resetMsg');
  if (!newPassword || newPassword.length < 8) {
    return (msg.textContent = 'Password must be at least 8 characters.');
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newPassword }),
    });
    const data = await res.json();
    msg.textContent = data.message;

    if (res.ok) {
      setTimeout(() => (window.location.href = 'login.html'), 1500);
    }
  } catch {
    msg.textContent = 'Network error. Please try again.';
  }
});