// A small, deterministic FAQ. No chatbot service or private conversations.
window.CHEESO_FAQ = {
    init() {
        const panel = document.getElementById('faqPanel');
        const messages = document.getElementById('faqMessages');
        const triggers = [document.getElementById('faqToggle'), document.getElementById('faqFloatToggle')].filter(Boolean);
        const closeButton = document.getElementById('closeFaq');
        let returnFocus;
        const welcome = 'Hola, somos CHEESO. Elige una opción para ayudarte.';
        const answers = {
            tipos: 'Tenemos dos presentaciones: Molde de 1 kg y Molde grande. El de 1 kg se compra en el carrito; el molde grande se coordina por WhatsApp.',
            precios: 'Molde de 1 kg: S/ 18. Molde grande: S/ 18 por kg, con precio final según su peso real. Precio mayorista: S/ 17 para 1 kg y S/ 17 por kg para molde grande, sujeto a cantidad mínima. Consulta por WhatsApp.',
            entrega: 'Coordinamos contigo los detalles y el costo de entrega según tu ubicación. Escríbenos por WhatsApp para consultar.',
            contacto: 'Puedes contactarnos por WhatsApp o mediante nuestras redes oficiales.',
            grande: 'El peso de cada molde puede variar, por eso el precio final se confirma según su peso real. Para realizar un pedido, comunícate con nosotros por WhatsApp.'
        };
        function bot(text) { const node = document.createElement('div'); node.className = 'bot-msg'; node.textContent = text; return node; }
        function setOpen(open, trigger) {
            if (open) returnFocus = trigger || document.activeElement;
            panel.inert = !open;
            panel.classList.toggle('open', open);
            panel.setAttribute('aria-hidden', String(!open));
            triggers.forEach(button => { button.setAttribute('aria-expanded', String(open)); button.setAttribute('aria-controls', 'faqPanel'); });
            if (open) closeButton.focus({ preventScroll: true }); else returnFocus?.focus({ preventScroll: true });
        }
        messages.replaceChildren(bot(welcome));
        triggers.forEach(button => button.addEventListener('click', () => setOpen(!panel.classList.contains('open'), button)));
        closeButton.addEventListener('click', () => setOpen(false));
        document.addEventListener('keydown', event => { if (event.key === 'Escape' && panel.classList.contains('open')) { event.preventDefault(); setOpen(false); } });
        panel.querySelectorAll('[data-faq]').forEach(button => button.addEventListener('click', () => {
            const choice = button.dataset.faq;
            if (choice === 'reset') { messages.replaceChildren(bot(welcome)); return; }
            const question = document.createElement('div'); question.className = 'user-msg'; question.textContent = button.textContent;
            const answer = bot(answers[choice]);
            if (['grande', 'contacto', 'entrega', 'precios'].includes(choice)) {
                const link = document.createElement('a'); link.className = 'faq-whatsapp'; link.textContent = 'Consultar por WhatsApp';
                link.href = window.CHEESO_SOCIAL.whatsappUrl(choice === 'grande' ? window.CHEESO_SOCIAL.largeMoldMessage : undefined);
                link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', 'Consultar a CHEESO por WhatsApp'); answer.append(link);
            }
            messages.replaceChildren(question, answer);
        }));
        panel.inert = true;
        triggers.forEach(button => { button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'faqPanel'); });
    }
};
