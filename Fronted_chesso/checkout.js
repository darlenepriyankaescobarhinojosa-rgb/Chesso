/* Three-step checkout; cart storage and product prices are supplied by the existing page. */
(() => {
    let adapter, step = 1, previousFocus, submitting = false, lastOrder = null;
    let submissionId = null;
    const $ = selector => document.querySelector(selector);
    const all = selector => [...document.querySelectorAll(selector)];
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const money = value => `S/ ${Number(value).toLocaleString('es-PE', { maximumFractionDigits: 2 })}`;
    const uuid = () => globalThis.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
    const catalog = () => window.CHEESO_UBIGEO || [];
    const totals = () => ({ known: adapter.getCart().reduce((sum, item) => sum + item.price * item.qty, 0) });
    function summaryTotals() {
        const { known } = totals();
        return `<div class="checkout-summary-line"><span>Productos</span><strong>${money(known)}</strong></div><div class="checkout-summary-line"><span>Env\u00edo</span><span>Se calcula seg\u00fan tu ubicaci\u00f3n</span></div><div class="checkout-estimate"><strong>Total estimado</strong><strong>${money(known)} + env\u00edo</strong></div>`;
    }
    function render() {
        if (!adapter) return;
        const cart = adapter.getCart();
        $('#cartCount').textContent = cart.reduce((sum, item) => sum + item.qty, 0);
        $('#cartButton').setAttribute('aria-label', `Abrir carrito: ${$('#cartCount').textContent} productos`);
        $('#cartItems').innerHTML = cart.length ? cart.map(item => `<article class="cart-item" data-id="${escape(item.id)}"><img class="cart-item-image" src="${escape(adapter.productImage(item))}" alt="${escape(item.name)}"><div class="cart-item-info"><h3>${escape(item.name)}</h3><p>${item.price === null ? 'Queso fresco' : 'Queso fresco y delicioso'}</p><strong class="cart-unit-price">${item.price === null ? 'S/ 20 por kg' : 'S/ 20 por molde'}</strong>${item.price === null ? '<p class="checkout-weight-tag">El peso y total final se confirman antes del env\u00edo.</p>' : ''}<div class="cart-item-bottom"><div class="qty-control" role="group" aria-label="Cantidad de ${escape(item.name)}"><button type="button" data-cart-action="minus" aria-label="Disminuir cantidad" ${item.qty === 1 ? 'disabled' : ''}>&minus;</button><strong>${item.qty}</strong><button type="button" data-cart-action="plus" aria-label="Aumentar cantidad">+</button></div><div class="cart-subtotal"><small>Subtotal</small><strong>${item.price === null ? 'Por confirmar' : money(item.price * item.qty)}</strong></div></div></div><button class="cart-remove" type="button" data-cart-action="remove" aria-label="Eliminar ${escape(item.name)}"><i class="fa-regular fa-trash-can" aria-hidden="true"></i><span>Eliminar</span></button></article>`).join('') : '<div class="checkout-empty"><i class="fa-solid fa-basket-shopping" aria-hidden="true"></i><h3>Tu carrito est\u00e1 vac\u00edo</h3><p>Elige el molde de 1 kg para comenzar.</p><button class="checkout-secondary" type="button" id="checkoutChooseProducts">Ver nuestros quesos</button></div>';
        $('#cartTotals').innerHTML = summaryTotals();
        $('#continueOrder').disabled = !cart.length;
        $('#confirmOrderButton').disabled = !cart.length || submitting;
        $('#checkoutSummary').innerHTML = cart.map(item => `<div class="checkout-order-item"><img src="${escape(adapter.productImage(item))}" alt="${escape(item.name)}"><div><h4>${escape(item.name)}</h4><p>${item.price === null ? 'S/ 20 por kg' : 'S/ 20 por molde'}</p><p>Cantidad: ${item.qty}</p>${item.price === null ? '<small>El peso y total final se confirman antes del env\u00edo.</small>' : ''}</div><strong>${item.price === null ? 'Por confirmar' : money(item.price * item.qty)}</strong></div>`).join('');
        $('#checkoutFinalTotals').innerHTML = summaryTotals();
        $('#checkoutChooseProducts')?.addEventListener('click', () => { close(); $('#productos').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); });
    }
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function setStep(next) {
        if (submitting) return;
        step = next;
        all('[data-checkout-step]').forEach(panel => { panel.hidden = Number(panel.dataset.checkoutStep) !== next; });
        all('[data-progress]').forEach(node => {
            const n = Number(node.dataset.progress);
            node.classList.toggle('active', n === next);
            node.classList.toggle('complete', n < next);
            node.querySelector('span').innerHTML = n < next ? '<i class="fa-solid fa-check" aria-hidden="true"></i>' : String(n);
            if (n === next) node.setAttribute('aria-current', 'step'); else node.removeAttribute('aria-current');
        });
        const headings = ['Tu carrito', 'Datos de entrega', 'Pago y confirmaci\u00f3n', 'Tu pedido CHEESO'];
        const descriptions = ['Revisa tus productos antes de continuar.', 'Completa la informaci\u00f3n para la entrega de tu pedido. Realizamos env\u00edos solo dentro de Per\u00fa.', 'Revisa tu pedido y elige el m\u00e9todo de pago.', 'Tu pedido est\u00e1 listo para coordinar.'];
        $('#cartTitle').textContent = headings[next - 1];
        $('#checkoutSubtitle').textContent = descriptions[next - 1];
        $('#cartDrawer').scrollTop = 0;
        $('#cartTitle').focus({ preventScroll: true });
    }
    function open() {
        previousFocus = document.activeElement;
        $('#cartDrawer').inert = false;
        $('#cartDrawer').setAttribute('aria-hidden', 'false');
        $('#cartDrawer').classList.add('open');
        $('#cartOverlay').classList.add('open');
        document.body.classList.add('cart-open');
        render();
        setStep(lastOrder && !adapter.getCart().length ? 4 : 1);
    }
    function close() {
        if (submitting) return;
        $('#cartDrawer').classList.remove('open');
        $('#cartOverlay').classList.remove('open');
        document.body.classList.remove('cart-open');
        previousFocus?.focus();
        $('#cartDrawer').setAttribute('aria-hidden', 'true');
        $('#cartDrawer').inert = true;
    }
    function regionSelection() {
        const department = catalog().find(d => d.code === $('#checkoutDepartment').value);
        const province = department?.provinces.find(p => p.code === $('#checkoutProvince').value);
        const district = province?.districts.find(d => d.code === $('#checkoutDistrict').value);
        return { department, province, district };
    }
    function fillOptions(select, items) {
        select.replaceChildren(new Option('Selecciona', ''));
        items.forEach(item => select.add(new Option(item.name, item.code)));
        select.disabled = !items.length;
    }
    function normalizePhone() {
        const input = $('#checkoutForm [name="phone"]');
        input.value = input.value.replace(/[\s()-]/g, '').replace(/^\+?51/, '');
    }
    function validateDelivery() {
        const form = $('#checkoutForm');
        normalizePhone();
        for (const name of ['name', 'email', 'address', 'reference']) form.elements.namedItem(name).value = form.elements.namedItem(name).value.trim();
        form.elements.namedItem('name').setCustomValidity(form.elements.namedItem('name').value.length >= 3 ? '' : 'Ingresa tu nombre completo.');
        form.elements.namedItem('address').setCustomValidity(form.elements.namedItem('address').value.length >= 5 ? '' : 'Completa tu direcci\u00f3n exacta.');
        form.elements.namedItem('reference').setCustomValidity(form.elements.namedItem('reference').value.length >= 3 ? '' : 'Agrega una referencia para la entrega.');
        form.elements.namedItem('email').setCustomValidity(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.namedItem('email').value) ? '' : 'Ingresa un correo electr\u00f3nico v\u00e1lido.');
        const { department, province, district } = regionSelection();
        const valid = form.checkValidity() && department && province && district;
        $('#checkoutFormError').textContent = valid ? '' : 'Completa los campos obligatorios y revisa tus datos.';
        if (!valid) { if (step !== 2) setStep(2); form.reportValidity(); }
        return Boolean(valid);
    }
    function deliveryData() {
        const { department, province, district } = regionSelection();
        const form = $('#checkoutForm').elements;
        return { customer: { name: form.namedItem('name').value.trim(), phone: form.namedItem('phone').value, email: form.namedItem('email').value.trim() }, delivery: { country: 'PE', departmentCode: department.code, department: department.name, provinceCode: province.code, province: province.name, districtCode: district.code, district: district.name, address: form.namedItem('address').value.trim(), reference: form.namedItem('reference').value.trim() } };
    }
    function reviewDelivery() {
        const { customer, delivery } = deliveryData();
        $('#checkoutDeliveryReview').innerHTML = `<p><strong>${escape(customer.name)}</strong></p><p>+51 ${escape(customer.phone)} \u00b7 ${escape(customer.email)}</p><p>${escape(delivery.address)}</p><p>${escape(delivery.district)}, ${escape(delivery.province)}, ${escape(delivery.department)}, Per\u00fa</p><p>Referencia: ${escape(delivery.reference)}</p>`;
    }
    function whatsappMessage(order) {
        const products = order.items.map(item => `${item.name} — S/ 20 por molde\nCantidad: ${item.qty}\nSubtotal: ${money(item.price * item.qty)}`).join('\n\n');
        return `Hola CHEESO, acabo de realizar el pedido #${order.id}.\n\nNombre: ${order.customer.name}\nCelular: +51 ${order.customer.phone}\nCorreo: ${order.customer.email}\n\nProductos:\n${products}\n\nDirección: ${order.delivery.address}\nDistrito: ${order.delivery.district}\nProvincia: ${order.delivery.province}\nDepartamento: ${order.delivery.department}\nReferencia: ${order.delivery.reference}\nMétodo de pago: Contraentrega\nProductos: ${money(order.totals.knownProductsSubtotal)}\nEnvío: por confirmar\n\nQuisiera coordinar mi entrega.`;
    }
    async function confirm() {
        if (submitting || !adapter.getCart().length || !validateDelivery()) return;
        const data = deliveryData();
        submissionId ||= uuid();
        const payload = { ...data, submissionId, items: adapter.getCart().map(item => ({ productId: item.productId, qty: item.qty })), payment: 'contraentrega' };
        const button = $('#confirmOrderButton');
        const previousContent = button.innerHTML;
        submitting = true;
        button.disabled = true;
        button.textContent = 'Guardando tu pedido...';
        $('#closeCart').disabled = true;
        all('#cartPayment button').forEach(node => { node.disabled = true; });
        $('#checkoutSubmitError').textContent = '';
        try {
            const base = window.CHEESO_CHECKOUT_API || (location.protocol === 'file:' ? 'http://127.0.0.1:3000' : '');
            const response = await fetch(`${base}/api/checkout-orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
            const result = await response.json();
            if (!response.ok || !result.order?.id) throw new Error(result.error || 'No se pudo registrar el pedido.');
            lastOrder = result.order;
            adapter.saveCart([]);
            render();
            $('#checkoutOrderCode').textContent = `Pedido #${lastOrder.id}`;
            $('#checkoutWhatsApp').href = window.CHEESO_SOCIAL.whatsappUrl(whatsappMessage(lastOrder));
            submitting = false;
            setStep(4);
            submissionId = null;
            $('#checkoutForm').reset();
            fillOptions($('#checkoutProvince'), []); fillOptions($('#checkoutDistrict'), []);
        } catch (error) {
            $('#checkoutSubmitError').textContent = error instanceof TypeError || error.name === 'TimeoutError' ? 'No pudimos conectar para guardar tu pedido. Tus datos y productos se conservan. Intenta nuevamente.' : error.message;
        } finally {
            submitting = false;
            button.innerHTML = previousContent;
            $('#closeCart').disabled = false;
            all('#cartPayment button').forEach(node => { node.disabled = false; });
            render();
        }
    }
    function init(existing) {
        adapter = existing;
        fillOptions($('#checkoutDepartment'), catalog());
        $('#checkoutDepartment').addEventListener('change', () => {
            fillOptions($('#checkoutProvince'), regionSelection().department?.provinces || []);
            fillOptions($('#checkoutDistrict'), []);
        });
        $('#checkoutProvince').addEventListener('change', () => fillOptions($('#checkoutDistrict'), regionSelection().province?.districts || []));
        $('#checkoutForm').addEventListener('input', event => { event.target.setCustomValidity?.(''); submissionId = null; });
        $('#checkoutForm [name="phone"]').addEventListener('blur', normalizePhone);
        $('#cartButton').addEventListener('click', open);
        $('#cartNavButton')?.addEventListener('click', open);
        $('#closeCart').addEventListener('click', close);
        $('#cartOverlay').addEventListener('click', close);
        document.querySelector('.header-elegante').addEventListener('click', event => { if (event.target.closest('a[href^="#"]')) close(); });
        $('#continueOrder').addEventListener('click', () => { if (adapter.getCart().length) setStep(2); });
        $('#backToCart').addEventListener('click', () => setStep(1));
        $('#checkoutForm').addEventListener('submit', event => { event.preventDefault(); if (validateDelivery() && adapter.getCart().length) { reviewDelivery(); render(); setStep(3); } });
        $('#backToDelivery').addEventListener('click', () => setStep(2));
        $('#editCheckoutDelivery').addEventListener('click', () => setStep(2));
        $('#confirmOrderButton').addEventListener('click', confirm);
        $('#finishCheckout').addEventListener('click', () => { close(); $('#productos').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); });
        $('#cartItems').addEventListener('click', event => {
            const button = event.target.closest('[data-cart-action]'); if (!button) return;
            const id = button.closest('.cart-item').dataset.id;
            let cart = adapter.getCart().map(item => ({ ...item }));
            const item = cart.find(entry => entry.id === id); if (!item) return;
            const action = button.dataset.cartAction;
            if (action === 'plus' && Number.isSafeInteger((item.qty + 1) * 18)) item.qty++;
            if (action === 'minus') item.qty = Math.max(1, item.qty - 1);
            if (action === 'remove') cart = cart.filter(entry => entry.id !== id);
            submissionId = null;
            adapter.saveCart(cart); render();
            const row = all('#cartItems .cart-item').find(node => node.dataset.id === id);
            const target = row?.querySelector(`[data-cart-action="${action}"]`);
            (target && !target.disabled ? target : row?.querySelector('[data-cart-action="plus"]') || $('#closeCart')).focus();
        });
        $('#cartDrawer').addEventListener('keydown', event => {
            if (event.key === 'Escape') { event.preventDefault(); close(); }
            if (event.key !== 'Tab') return;
            const nodes = all('#cartDrawer button:not(:disabled), #cartDrawer input:not(:disabled), #cartDrawer select:not(:disabled), #cartDrawer textarea, #cartDrawer a[href]').filter(node => node.getClientRects().length);
            if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus(); }
            else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
        });
        render();
    }
    window.CHEESO_CHECKOUT = { init, open, close, render };
})();
