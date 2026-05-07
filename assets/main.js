/* ── Nav scroll behavior ── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ── Mobile menu ── */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

/* ── Scroll reveal ── */
const observer = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

/* ── Prefix input: lowercase + strip invalid chars on the fly ── */
const prefixInput = document.getElementById('prefix');
prefixInput.addEventListener('input', () => {
  const cursor = prefixInput.selectionStart;
  const cleaned = prefixInput.value.toLowerCase().replace(/[^a-z0-9._\-]/g, '');
  if (prefixInput.value !== cleaned) {
    prefixInput.value = cleaned;
    prefixInput.setSelectionRange(cursor - 1, cursor - 1);
  }
});

/* ── Email provisioning form ── */
const form = document.getElementById('provision-form');
const statusEl = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');
const btnText = submitBtn.querySelector('.btn-text');
const btnSpinner = submitBtn.querySelector('.btn-spinner');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const prefix = prefixInput.value.trim().toLowerCase();
  const gmail = document.getElementById('gmail').value.trim().toLowerCase();

  if (!prefix) return showStatus('Enter a prefix for your address.', 'error');
  if (!/^[a-z0-9._\-]+$/.test(prefix)) return showStatus('Prefix can only contain letters, numbers, dots, dashes, and underscores.', 'error');
  if (!gmail.endsWith('@gmail.com')) return showStatus('Must be a Gmail address (ending in @gmail.com).', 'error');

  setLoading(true);
  clearStatus();

  try {
    const res = await fetch('/api/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, gmail }),
    });
    const data = await res.json();
    if (data.success) {
      showStatus(`✓ ${data.email} is live — emails will forward to ${gmail}.`, 'success');
      form.reset();
    } else {
      showStatus(data.error || 'Something went wrong. Try a different prefix.', 'error');
    }
  } catch {
    showStatus('Network error — please try again.', 'error');
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  submitBtn.disabled = on;
  btnText.textContent = on ? 'Claiming…' : 'Claim Address';
  btnSpinner.hidden = !on;
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `form-status ${type}`;
  statusEl.hidden = false;
}

function clearStatus() {
  statusEl.hidden = true;
  statusEl.className = 'form-status';
}
