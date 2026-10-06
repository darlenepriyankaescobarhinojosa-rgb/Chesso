// Official profiles: edit only this configuration when a contact changes.
(() => {
    const phone = '51929828271';
    const defaultMessage = 'Hola CHEESO  Quisiera informaci\u00f3n sobre sus quesos.';
    const orderMessage = 'Hola CHEESO  Quisiera hacer un pedido de queso.';
    const largeMoldMessage = 'Hola CHEESO, quisiera consultar por un molde grande de queso. ¿Podrían indicarme el peso aproximado, disponibilidad y precio final?';
    const whatsappUrl = (message = defaultMessage) => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    const SOCIAL_LINKS = Object.freeze({
        instagram: 'https://www.instagram.com/cheeso_pe?utm_source=qr&stkn=anFvcHZ5cTQzNHFq',
        tiktok: 'https://www.tiktok.com/@cheeso.pe?_r=1&_t=ZS-9AK1pcH8JxR',
        facebook: 'https://www.facebook.com/profile.php?id=61588321024211',
        whatsapp: whatsappUrl()
    });
    window.CHEESO_SOCIAL = Object.freeze({ SOCIAL_LINKS, phone, defaultMessage, orderMessage, largeMoldMessage, whatsappUrl });
    document.addEventListener('DOMContentLoaded', () => {
        const labels = { instagram: 'Instagram de CHEESO', tiktok: 'TikTok de CHEESO', facebook: 'Facebook de CHEESO', whatsapp: 'Contactar a CHEESO por WhatsApp' };
        document.querySelectorAll('[data-display-phone]').forEach(node => {
            node.textContent = '+51 ' + phone.slice(2).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
        });
        document.querySelectorAll('[data-cheeso-phone]').forEach(node => {
            node.href = `tel:+${phone}`;
            if (node.classList.contains('numero-telefono')) node.textContent = '+51 ' + phone.slice(2).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
        });
        document.querySelectorAll('[data-whatsapp]').forEach(node => { node.dataset.social = 'whatsapp'; });
        document.querySelectorAll('[data-social]').forEach(node => {
            const network = node.dataset.social;
            const purposeMessage = { order: orderMessage, 'large-mold': largeMoldMessage }[node.dataset.whatsappPurpose];
            const url = network === 'whatsapp' && purposeMessage ? whatsappUrl(purposeMessage) : SOCIAL_LINKS[network];
            if (!url) {
                node.removeAttribute('href');
                node.setAttribute('aria-label', `${labels[network]}: enlace oficial pendiente`);
                return;
            }
            if (node.tagName === 'BUTTON') {
                const anchor = document.createElement('a');
                [...node.attributes].forEach(attribute => {
                    if (!['type', 'disabled'].includes(attribute.name)) anchor.setAttribute(attribute.name, attribute.value);
                });
                anchor.innerHTML = node.innerHTML;
                node.replaceWith(anchor);
                node = anchor;
                node.style.textDecoration = "none";
            }
            node.href = url;
            node.target = '_blank';
            node.rel = 'noopener noreferrer';
            node.setAttribute('aria-label', labels[network]);
            node.classList.remove('social-pending');
            node.removeAttribute('title');
            node.style.cursor = 'pointer';
        });
    });
})();
