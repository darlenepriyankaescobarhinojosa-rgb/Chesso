document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('#nosotros .about-story, #nosotros .about-photo');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: .1 });
    elements.forEach(element => {
        element.classList.add('section-enter');
        observer.observe(element);
    });
});// Keep the compact navigation accessible when dismissed or resized.
document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('menuMobile');
    const nav = document.getElementById('mainNav');
    const closeMenu = () => {
        menu.classList.remove('active');
        nav.classList.remove('active');
        menu.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-label', 'Abrir menú');
    };
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && nav.classList.contains('active')) {
            closeMenu();
            menu.focus();
        }
    });
    document.addEventListener('click', event => {
        if (!nav.contains(event.target) && !menu.contains(event.target)) closeMenu();
    });
    window.matchMedia('(max-width: 1100px)').addEventListener('change', closeMenu);
});
