document.addEventListener('DOMContentLoaded', () => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elements = document.querySelectorAll('#productos .products-heading, #productos .premium-product');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: .08 });
    elements.forEach(element => {
        element.classList.add('products-reveal');
        observer.observe(element);
    });
});
