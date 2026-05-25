/* ── Toast notification system ───────────────────────────────── */

window.Toast = (() => {
  const container = document.getElementById('toast-container');

  function show(msg, level = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${level}`;
    toast.innerHTML = `
      <span class="toast-dot">&#x25CF;</span>
      <span class="toast-msg">${msg}</span>
      <button class="toast-close" title="Dismiss">&#x2715;</button>
    `;

    const close = toast.querySelector('.toast-close');
    close.onclick = () => dismiss(toast);

    container.appendChild(toast);

    const timer = setTimeout(() => dismiss(toast), duration);
    toast._timer = timer;
  }

  function dismiss(toast) {
    clearTimeout(toast._timer);
    toast.classList.add('dismissing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  return { show };
})();
