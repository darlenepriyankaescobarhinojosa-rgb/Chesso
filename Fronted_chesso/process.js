/* Scoped carousel: photographs remain the original project files. */
document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-process-carousel]');
    if (!root) return;
    const slides = [...root.querySelectorAll('.process-slide')];
    const dots = [...root.querySelectorAll('[data-process-dot]')];
    const pauseButton = root.querySelector('[data-process-pause]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0, timer, hovered = false, focused = false, visible = false, paused = motion.matches;
    const status = root.querySelector('.process-status');
    function schedule() {
        clearInterval(timer);
        if (!paused && !hovered && !focused && visible && !document.hidden && !motion.matches) timer = setInterval(() => show(current + 1, false), 4000);
    }
    function show(index, manual = true) {
        current = (index + slides.length) % slides.length;
        slides.forEach((slide, i) => {
            let position = (i - current + slides.length) % slides.length;
            if (position > slides.length / 2) position -= slides.length;
            slide.style.setProperty('--position', position);
            slide.classList.toggle('is-active', i === current);
            slide.classList.toggle('is-neighbor', Math.abs(position) === 1);
            slide.setAttribute('aria-hidden', String(i !== current));
            slide.inert = i !== current;
        });
        dots.forEach((dot, i) => {
            dot.classList.toggle('is-active', i === current);
            dot.setAttribute('aria-pressed', String(i === current));
        });
        if (manual) status.textContent = `${current + 1} de ${slides.length}: ${slides[current].querySelector('h3').textContent}`;
        schedule();
    }
    root.querySelector('[data-process-prev]').addEventListener('click', () => show(current - 1));
    root.querySelector('[data-process-next]').addEventListener('click', () => show(current + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
    root.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); show(current + (event.key === 'ArrowRight' ? 1 : -1)); }
    });
    root.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
    root.addEventListener('pointerleave', () => { hovered = false; schedule(); });
    root.addEventListener('focusin', () => { focused = true; schedule(); });
    root.addEventListener('focusout', () => { setTimeout(() => { focused = root.contains(document.activeElement); schedule(); }, 0); });
    let touchStart;
    const stage = root.querySelector('.process-stage');
    stage.addEventListener('touchstart', event => { touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY }; clearInterval(timer); }, { passive: true });
    stage.addEventListener('touchend', event => {
        if (!touchStart) return;
        const dx = event.changedTouches[0].clientX - touchStart.x, dy = event.changedTouches[0].clientY - touchStart.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
        touchStart = null; schedule();
    }, { passive: true });
    stage.addEventListener('touchcancel', () => { touchStart = null; schedule(); }, { passive: true });
    function updatePause() {
        pauseButton.setAttribute('aria-pressed', String(paused));
        pauseButton.setAttribute('aria-label', paused ? 'Reanudar reproducción automática' : 'Pausar reproducción automática');
        pauseButton.querySelector('span').textContent = paused ? 'Reanudar' : 'Pausar';
        pauseButton.querySelector('[data-pause-icon]').toggleAttribute('hidden', paused);
        pauseButton.querySelector('[data-play-icon]').toggleAttribute('hidden', !paused);
        schedule();
    }
    pauseButton.addEventListener('click', () => { paused = !paused; updatePause(); });
    motion.addEventListener('change', () => { paused = motion.matches; updatePause(); });
    document.addEventListener('visibilitychange', schedule);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, { threshold: .15 }).observe(root);
    else visible = true;
    show(0, false); updatePause();
});
