document.addEventListener('DOMContentLoaded', () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ('IntersectionObserver' in window && !reduced) {
        const observer = new IntersectionObserver(entries => entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        }), { threshold: .08 });
        document.querySelectorAll('#nosotros .story-collage, #nosotros .story-heading, #nosotros .story-cheese, #nosotros .story-value').forEach(node => {
            node.classList.add('story-reveal');
            observer.observe(node);
        });
    }
    // Update the existing navbar on scroll; keep its markup and visual styles.
    const sections = ['inicio', 'nosotros', 'productos', 'pedido', 'contacto'].map(id => document.getElementById(id));
    const links = [...document.querySelectorAll('#mainNav .nav-link-elegante')];
    let scheduled = false;
    const updateActive = () => {
        scheduled = false;
        const line = Math.min(window.innerHeight * .4, 260);
        let active = sections[0];
        sections.forEach(section => { if (section.getBoundingClientRect().top <= line) active = section; });
        const matching = links.find(link => link.getAttribute('href') === `#${active.id}`);
        links.forEach(link => {
            link.classList.toggle('active', link === matching);
            if (link === matching) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    };
    window.addEventListener('scroll', () => {
        if (!scheduled) { scheduled = true; requestAnimationFrame(updateActive); }
    }, { passive: true });
    updateActive();
});
