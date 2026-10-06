// Only the photograph changes; the existing hero composition stays fixed.
document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-hero-carousel]');
    if (!root) return;
    const photos = [...root.querySelectorAll('.hero-photo')];
    const dots = [...root.querySelectorAll('[data-hero-photo]')];
    const pauseButton = root.querySelector('[data-hero-pause]');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0, timer, request = 0, visible = true, hovered = false, focused = false, paused = false;
    function schedule() {
        clearInterval(timer);
        if (visible && !paused && !hovered && !focused && !document.hidden && !motion.matches) timer = setInterval(() => show(index + 1), 2000);
    }
    async function show(next) {
        const candidate = (next + photos.length) % photos.length, token = ++request;
        try { await photos[candidate].decode(); } catch { if (!photos[candidate].naturalWidth) return; }
        if (token !== request) return;
        index = candidate;
        photos.forEach((photo, i) => { photo.classList.toggle('is-active', i === index); photo.setAttribute('aria-hidden', String(i !== index)); });
        dots.forEach((dot, i) => { dot.classList.toggle('is-active', i === index); dot.setAttribute('aria-pressed', String(i === index)); });
        schedule();
    }
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
    pauseButton.addEventListener('click', () => {
        paused = !paused;
        pauseButton.setAttribute('aria-pressed', String(paused));
        pauseButton.setAttribute('aria-label', paused ? 'Reanudar imágenes de Inicio' : 'Pausar imágenes de Inicio');
        pauseButton.querySelector('[data-hero-play-icon]').toggleAttribute('hidden', !paused);
        pauseButton.querySelector('[data-hero-pause-icon]').toggleAttribute('hidden', paused);
        schedule();
    });
    root.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
    root.addEventListener('pointerleave', () => { hovered = false; schedule(); });
    root.addEventListener('focusin', () => { focused = true; schedule(); });
    root.addEventListener('focusout', () => { setTimeout(() => { focused = root.contains(document.activeElement); schedule(); }, 0); });
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', schedule);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, { threshold: .15 }).observe(root);
    schedule();
});
