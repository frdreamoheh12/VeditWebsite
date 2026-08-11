// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  }

  // scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  revealEls.forEach((el) => io.observe(el));

  // build waveform bars wherever .waveform is empty
  document.querySelectorAll('.waveform').forEach((wf) => {
    if (wf.children.length) return;
    const bars = 40;
    for (let i = 0; i < bars; i++) {
      const span = document.createElement('span');
      const h = 6 + Math.round(Math.random() * 34);
      span.style.height = h + 'px';
      span.style.animationDelay = (Math.random() * 2).toFixed(2) + 's';
      wf.appendChild(span);
    }
  });

  // active nav link highlight
  const links = document.querySelectorAll('[data-nav-link]');
  links.forEach((l) => { if (l.getAttribute('href') === window.location.pathname.split('/').pop()) l.classList.add('gradient-text'); });
});

function statusBadgeClass(status) {
  const map = {
    Pending: 'badge-pending', 'Under Review': 'badge-review', Accepted: 'badge-accepted',
    Rejected: 'badge-rejected', Completed: 'badge-completed',
  };
  return map[status] || 'badge-pending';
}

function setButtonLoading(btn, loading, label) {
  if (loading) {
    btn.dataset.label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${label || 'Submitting...'}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.label || label || 'Submit';
  }
}

function showFormResult(container, ok, message) {
  container.classList.remove('hidden');
  container.className = `mt-6 rounded-xl p-4 border text-sm ${ok ? 'border-green-400/40 bg-green-400/10 text-green-300' : 'border-red-400/40 bg-red-400/10 text-red-300'}`;
  container.innerHTML = message;
}
