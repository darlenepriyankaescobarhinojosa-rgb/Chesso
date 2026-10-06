document.addEventListener('DOMContentLoaded', () => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: .08 });
    document.querySelectorAll('#pedido .order-heading, #pedido .order-phone-area, #pedido .order-option, #pedido .order-cheese, #pedido .order-steps li').forEach(node => {
        node.classList.add('order-reveal');
        observer.observe(node);
    });
});
