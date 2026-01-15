// ============================================
// script.js - CHESO Website (Versión Unificada)
// Versión: 2.0.0
// Autor: CHESO Team
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('%c🧀 CHESO Website Iniciando...', 'color: #8B4513; font-weight: bold; font-size: 16px');
    
    // ==============================
    // CONFIGURACIÓN GLOBAL
    // ==============================
    const CONFIG = {
        // Slider
        autoPlay: true,
        interval: 5000,
        transitionSpeed: 1000,
        pauseOnHover: true,
        
        // WhatsApp
        whatsappNumber: '51913297090', // REEMPLAZAR CON TU NÚMERO
        defaultMessage: '¡Hola CHESO! Me gustaría información sobre sus productos.',
        
        // Menú
        mobileBreakpoint: 768,
        
        // Depuración
        debug: false
    };
    
    // ==============================
    // ELEMENTOS DEL DOM
    // ==============================
    const elements = {
        // Slider
        slides: document.querySelectorAll('.slide'),
        indicators: document.querySelectorAll('.indicator'),
        prevBtn: document.querySelector('.slide-btn.prev'),
        nextBtn: document.querySelector('.slide-btn.next'),
        slider: document.querySelector('.slider'),
        
        // Menú
        menuMobile: document.getElementById('menuMobile'),
        mainNav: document.querySelector('.main-nav-refinado'),
        
        // Botones venta
        btnVenta: document.querySelectorAll('.btn-venta'),
        
        // Botones WhatsApp
        whatsappButtons: document.querySelectorAll('[onclick*="abrirWhatsApp"]')
    };
    
    // ==============================
    // VARIABLES DE ESTADO
    // ==============================
    let currentSlide = 0;
    let slideInterval = null;
    let isAnimating = false;
    let totalSlides = elements.slides.length;
    let isMenuOpen = false;
    
    // ==============================
    // FUNCIONES DE WHATSAPP
    // ==============================
    
    /**
     * Abre WhatsApp con mensaje personalizado
     * @param {string} producto - Nombre del producto o consulta
     */
    window.abrirWhatsApp = function(producto) {
        let mensaje = CONFIG.defaultMessage;
        
        if (producto && producto !== 'Consulta general') {
            mensaje = `¡Hola CHESO! Estoy interesado en: ${producto}. ¿Podrían darme más información?`;
        }
        
        const mensajeCodificado = encodeURIComponent(mensaje);
        const urlWhatsApp = `https://wa.me/${CONFIG.whatsappNumber}?text=${mensajeCodificado}`;
        
        if (CONFIG.debug) {
            console.log(`📱 WhatsApp: ${producto}`);
            console.log(`URL: ${urlWhatsApp}`);
        }
        
        window.open(urlWhatsApp, '_blank');
    };
    
    /**
     * Configura todos los botones de WhatsApp
     */
    function setupWhatsAppButtons() {
        // Quitar onclick original
        elements.whatsappButtons.forEach(btn => {
            const originalOnClick = btn.getAttribute('onclick');
            if (originalOnClick) {
                btn.removeAttribute('onclick');
                
                // Extraer el parámetro del producto
                const match = originalOnClick.match(/abrirWhatsApp\('([^']+)'\)/);
                if (match) {
                    const producto = match[1];
                    btn.addEventListener('click', () => abrirWhatsApp(producto));
                }
            }
        });
        
        // Botón de llamada
        const btnLlamada = document.querySelector('.btn-llamada');
        if (btnLlamada) {
            btnLlamada.addEventListener('click', function(e) {
                if (!this.getAttribute('href').startsWith('tel:')) {
                    e.preventDefault();
                    abrirWhatsApp('Llamada solicitada');
                }
            });
        }
    }
    
    // ==============================
    // FUNCIONES DEL SLIDER (TU CÓDIGO MEJORADO)
    // ==============================
    
    /**
     * Cambia al slide especificado
     */
    function goToSlide(n) {
        if (isAnimating || totalSlides === 0) return;
        isAnimating = true;
        
        // Validar índice
        if (n < 0) n = totalSlides - 1;
        if (n >= totalSlides) n = 0;
        
        // Remover clases activas
        elements.slides[currentSlide]?.classList?.remove('active');
        elements.indicators[currentSlide]?.classList?.remove('active');
        
        // Actualizar índice
        currentSlide = n;
        
        // Agregar clases activas
        elements.slides[currentSlide]?.classList?.add('active');
        elements.indicators[currentSlide]?.classList?.add('active');
        
        if (CONFIG.debug) {
            console.log(`▶ Slide ${currentSlide + 1}/${totalSlides}`);
        }
        
        // Resetear flag de animación
        setTimeout(() => {
            isAnimating = false;
        }, CONFIG.transitionSpeed);
    }
    
    /**
     * Avanza al siguiente slide
     */
    function nextSlide() {
        if (isAnimating) return;
        goToSlide(currentSlide + 1);
    }
    
    /**
     * Retrocede al slide anterior
     */
    function prevSlide() {
        if (isAnimating) return;
        goToSlide(currentSlide - 1);
    }
    
    /**
     * Inicia el slider automático
     */
    function startAutoPlay() {
        if (!CONFIG.autoPlay || totalSlides <= 1) return;
        
        stopAutoPlay();
        
        slideInterval = setInterval(() => {
            nextSlide();
        }, CONFIG.interval);
        
        if (CONFIG.debug) {
            console.log('▶ AutoPlay iniciado');
        }
    }
    
    /**
     * Detiene el slider automático
     */
    function stopAutoPlay() {
        if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
            
            if (CONFIG.debug) {
                console.log('⏸ AutoPlay detenido');
            }
        }
    }
    
    /**
     * Reinicia el slider automático
     */
    function restartAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }
    
    /**
     * Configura eventos del slider
     */
    function setupSlider() {
        if (totalSlides === 0) {
            if (CONFIG.debug) {
                console.warn('⚠ No se encontraron slides');
            }
            return;
        }
        
        // Botón Siguiente
        if (elements.nextBtn) {
            elements.nextBtn.addEventListener('click', function(e) {
                e.preventDefault();
                nextSlide();
                restartAutoPlay();
            });
        }
        
        // Botón Anterior
        if (elements.prevBtn) {
            elements.prevBtn.addEventListener('click', function(e) {
                e.preventDefault();
                prevSlide();
                restartAutoPlay();
            });
        }
        
        // Indicadores
        elements.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', function(e) {
                e.preventDefault();
                goToSlide(index);
                restartAutoPlay();
            });
        });
        
        // Pausar al hacer hover
        if (CONFIG.pauseOnHover && elements.slider) {
            elements.slider.addEventListener('mouseenter', stopAutoPlay);
            elements.slider.addEventListener('mouseleave', startAutoPlay);
        }
        
        // Navegación con teclado
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight') {
                nextSlide();
                restartAutoPlay();
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
                restartAutoPlay();
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                if (slideInterval) {
                    stopAutoPlay();
                } else {
                    startAutoPlay();
                }
            }
        });
        
        // Iniciar
        startAutoPlay();
    }
    
    // ==============================
    // FUNCIONES DEL MENÚ
    // ==============================
    
    /**
     * Toggle del menú móvil
     */
    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
        
        if (elements.menuMobile) {
            elements.menuMobile.classList.toggle('active', isMenuOpen);
        }
        
        if (elements.mainNav) {
            elements.mainNav.classList.toggle('active', isMenuOpen);
        }
        
        // Bloquear scroll cuando el menú está abierto
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        
        if (CONFIG.debug) {
            console.log(`🍔 Menú ${isMenuOpen ? 'abierto' : 'cerrado'}`);
        }
    }
    
    /**
     * Cierra el menú móvil
     */
    function closeMenu() {
        if (isMenuOpen) {
            isMenuOpen = false;
            
            if (elements.menuMobile) {
                elements.menuMobile.classList.remove('active');
            }
            
            if (elements.mainNav) {
                elements.mainNav.classList.remove('active');
            }
            
            document.body.style.overflow = '';
        }
    }
    
    /**
     * Configura el menú móvil
     */
    function setupMenu() {
        if (elements.menuMobile) {
            elements.menuMobile.addEventListener('click', toggleMenu);
        }
        
        // Cerrar menú al hacer click en enlace
        const navLinks = document.querySelectorAll('.nav-link-elegante');
        navLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });
        
        // Cerrar menú al redimensionar ventana
        window.addEventListener('resize', function() {
            if (window.innerWidth > CONFIG.mobileBreakpoint) {
                closeMenu();
            }
        });
    }
    
    // ==============================
    // FUNCIONES DE NAVEGACIÓN SUAVE
    // ==============================
    
    /**
     * Configura navegación suave
     */
    function setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                
                if (targetId === '#' || !targetId.startsWith('#')) return;
                
                e.preventDefault();
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop - 100;
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                    
                    // Cerrar menú si está abierto
                    closeMenu();
                }
            });
        });
    }
    
    // ==============================
    // FUNCIONES DE PRODUCTOS
    // ==============================
    
    /**
     * Configura selector Por Molde/Por Kilo
     */
    function setupProductSelector() {
        if (!elements.btnVenta.length) return;
        
        elements.btnVenta.forEach(boton => {
            boton.addEventListener('click', function() {
                // Remover clase active de todos
                elements.btnVenta.forEach(btn => btn.classList.remove('active'));
                // Agregar clase active al clickeado
                this.classList.add('active');
                
                const tipoVenta = this.getAttribute('data-tipo');
                
                // Aquí puedes cambiar precios dinámicamente
                if (CONFIG.debug) {
                    console.log(`⚖️ Tipo de venta: ${tipoVenta}`);
                }
            });
        });
    }
    
    // ==============================
    // FUNCIONES DE SCROLL ANIMATIONS
    // ==============================
    
    /**
     * Efectos al hacer scroll
     */
    function setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    
                    if (CONFIG.debug) {
                        console.log(`👁️ Elemento visible: ${entry.target.id || entry.target.className}`);
                    }
                }
            });
        }, observerOptions);
        
        // Observar elementos importantes
        const elementsToObserve = document.querySelectorAll(
            '.card-producto, .card-compromiso, .servicio-item'
        );
        
        elementsToObserve.forEach(el => {
            el.classList.add('fade-in');
            observer.observe(el);
        });
    }
    
    // ==============================
    // INICIALIZACIÓN
    // ==============================
    
    /**
     * Inicializa todo el sitio
     */
    function init() {
        // Configurar módulos
        setupSlider();
        setupMenu();
        setupSmoothScroll();
        setupProductSelector();
        setupWhatsAppButtons();
        setupScrollAnimations();
        
        // Marcar enlace activo en navegación
        const currentSection = window.location.hash || '#inicio';
        const activeLink = document.querySelector(`.nav-link-elegante[href="${currentSection}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Log de inicialización
        console.log('%c🎉 CHESO Website Inicializado Correctamente!', 'color: #25D366; font-weight: bold; font-size: 16px');
        console.log('%c📊 Estado:', 'color: #8B4513');
        console.log(`- Slides: ${totalSlides}`);
        console.log(`- Menú móvil: ${elements.menuMobile ? 'Sí' : 'No'}`);
        console.log(`- Botones WhatsApp: ${elements.whatsappButtons.length}`);
        console.log(`- Selector productos: ${elements.btnVenta.length}`);
        console.log('='.repeat(50));
    }
    
    // ==============================
    // API PÚBLICA (para depuración)
    // ==============================
    window.CHESO = {
        // Slider
        slider: {
            next: nextSlide,
            prev: prevSlide,
            goTo: goToSlide,
            start: startAutoPlay,
            stop: stopAutoPlay,
            restart: restartAutoPlay,
            current: () => currentSlide + 1,
            total: () => totalSlides
        },
        
        // WhatsApp
        whatsapp: (producto) => abrirWhatsApp(producto),
        
        // Menú
        menu: {
            toggle: toggleMenu,
            close: closeMenu,
            isOpen: () => isMenuOpen
        },
        
        // Config
        config: CONFIG,
        
        // Info
        version: '2.0.0'
    };
    
    // Iniciar
    init();
});

// ==============================
// ESTILOS DINÁMICOS (opcional)
// ==============================
const style = document.createElement('style');
style.textContent = `
    /* Animaciones */
    .fade-in {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    .fade-in.visible {
        opacity: 1;
        transform: translateY(0);
    }
    
    /* Menú móvil activo */
    .menu-mobile.active span:nth-child(1) {
        transform: rotate(45deg) translate(6px, 6px);
    }
    
    .menu-mobile.active span:nth-child(2) {
        opacity: 0;
    }
    
    .menu-mobile.active span:nth-child(3) {
        transform: rotate(-45deg) translate(6px, -6px);
    }
    
    /* Transición suave para menú */
    .main-nav-refinado {
        transition: right 0.3s ease;
    }
    
    /* Estilo activo para enlaces */
    .nav-link-elegante.active {
        color: #8B4513 !important;
    }
    
    .nav-link-elegante.active::after {
        width: 100% !important;
    }
`;

document.head.appendChild(style);