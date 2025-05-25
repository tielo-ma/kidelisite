document.addEventListener('DOMContentLoaded', function() {
    // Detectar touch devices e ajustar comportamentos
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    
    if (isTouchDevice) {
        document.body.classList.add('touch-device');
        
        // Desativar cursor personalizado em dispositivos touch
        const cursor = document.querySelector('.cursor');
        const cursorFollower = document.querySelector('.cursor-follower');
        if (cursor) cursor.style.display = 'none';
        if (cursorFollower) cursorFollower.style.display = 'none';
    }

    // =============================================
    // Preloader
    // =============================================
    const preloader = document.querySelector('.preloader');
    
    function hidePreloader() {
        gsap.to(preloader, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.inOut',
            onComplete: () => {
                preloader.style.display = 'none';
            }
        });
    }

    window.addEventListener('load', hidePreloader);
    setTimeout(hidePreloader, 3000);

    // =============================================
    // Cursor Personalizado
    // =============================================
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    
    if (cursor && cursorFollower && !isTouchDevice) {
        let posX = 0, posY = 0;
        let mouseX = 0, mouseY = 0;
        const cursorSpeed = 0.15;

        function updateCursorPosition(e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            const cursorHalf = cursor.offsetWidth / 2;
            const followerHalf = cursorFollower.offsetWidth / 2;
            
            cursor.style.left = `${mouseX - cursorHalf}px`;
            cursor.style.top = `${mouseY - cursorHalf}px`;
        }

        function animateCursor() {
            posX += (mouseX - posX - (cursorFollower.offsetWidth / 2)) * cursorSpeed;
            posY += (mouseY - posY - (cursorFollower.offsetHeight / 2)) * cursorSpeed;
            
            cursorFollower.style.left = `${posX}px`;
            cursorFollower.style.top = `${posY}px`;
            
            requestAnimationFrame(animateCursor);
        }

        document.addEventListener('mousemove', updateCursorPosition);
        animateCursor();

        const hoverElements = document.querySelectorAll(
            'a, button, [data-cursor="hover"], .nav-link, .project-card, .btn, .tab, .project-link'
        );

        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
                cursor.style.backgroundColor = 'var(--accent-color)';
                cursorFollower.style.transform = 'translate(-50%, -50%) scale(0.8)';
                cursorFollower.style.borderColor = 'var(--accent-color)';
                
                if (el.classList.contains('btn')) {
                    cursorFollower.style.transform = 'translate(-50%, -50%) scale(2.5)';
                    cursorFollower.style.opacity = '0.3';
                }
            });
            
            el.addEventListener('mouseleave', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                cursor.style.backgroundColor = 'var(--primary-color)';
                cursorFollower.style.transform = 'translate(-50%, -50%) scale(1)';
                cursorFollower.style.borderColor = 'var(--primary-color)';
                cursorFollower.style.opacity = '1';
            });
        });
    }

    // =============================================
    // Menu Mobile
    // =============================================
    const menuToggle = document.querySelector('.menu-toggle');
    const navList = document.querySelector('.nav-list');
    
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navList.classList.toggle('active');
            
            if (navList.classList.contains('active')) {
                gsap.from(navList.querySelectorAll('.nav-item'), {
                    opacity: 0,
                    y: 20,
                    duration: 0.3,
                    stagger: 0.1,
                    ease: 'power2.out'
                });
            }
        });
    }

    // =============================================
    // Navegação Suave e Ativação de Links
    // =============================================
    const navLinks = document.querySelectorAll('.nav-link');

    function scrollToSection(sectionId, offset = 80) {
        const section = document.querySelector(sectionId);
        if (section) {
            if (typeof gsap !== 'undefined') {
                gsap.to(window, {
                    scrollTo: {
                        y: section,
                        offsetY: offset
                    },
                    duration: 1,
                    ease: 'power2.inOut'
                });
            } else {
                // Fallback para browsers sem GSAP
                window.scrollTo({
                    top: section.offsetTop - offset,
                    behavior: 'smooth'
                });
            }
        }
    }

    function setActiveLink(activeLink) {
        navLinks.forEach(link => link.classList.remove('active'));
        if (activeLink) activeLink.classList.add('active');
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            setActiveLink(this);
            
            if (window.innerWidth <= 768 && menuToggle && navList) {
                menuToggle.classList.remove('active');
                navList.classList.remove('active');
            }

            scrollToSection(targetId);
        });
    });

    // =============================================
    // Tema Escuro/Claro
    // =============================================
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        const themeIcon = themeToggle.querySelector('i');
        
        // Verificar preferência do sistema
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Verificar tema salvo no localStorage
        const savedTheme = localStorage.getItem('theme');
        
        // Aplicar tema inicial
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        }
        
        // Alternar tema
        themeToggle.addEventListener('click', function() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                themeIcon.classList.replace('fa-sun', 'fa-moon');
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeIcon.classList.replace('fa-moon', 'fa-sun');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // =============================================
    // Atualizar Link Ativo Durante o Scroll
    // =============================================
    function updateActiveLink() {
        const scrollPosition = window.scrollY + 100;
        
        document.querySelectorAll('section').forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink();

    // =============================================
    // Header Scroll
    // =============================================
    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 100);
        });
    }

    // =============================================
    // Back to Top
    // =============================================
    const backToTop = document.querySelector('.back-to-top');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            backToTop.classList.toggle('active', window.scrollY > 500);
        });
        
        backToTop.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof gsap !== 'undefined') {
                gsap.to(window, {
                    scrollTo: 0,
                    duration: 1,
                    ease: 'power2.inOut'
                });
            } else {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    }

    // =============================================
    // Tabs (About Section)
    // =============================================
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (tabs.length && tabContents.length) {
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                const targetContent = document.querySelector(`[data-tab-content="${tabId}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                    if (typeof gsap !== 'undefined') {
                        gsap.from(targetContent, {
                            opacity: 0,
                            y: 20,
                            duration: 0.5,
                            ease: 'power2.out'
                        });
                    }
                }
            });
        });
        
        tabs[0]?.click();
    }

    // =============================================
    // Formulário de Contato
    // =============================================
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalContent = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<span>Enviando...</span><i class="fas fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
            
            try {
                await new Promise(resolve => setTimeout(resolve, 1500));
                submitBtn.innerHTML = '<span>Mensagem Enviada!</span><i class="fas fa-check"></i>';
                showNotification('Mensagem enviada com sucesso!', 'success');
                
                setTimeout(() => {
                    contactForm.reset();
                    submitBtn.innerHTML = originalContent;
                    submitBtn.disabled = false;
                }, 2000);
            } catch (error) {
                submitBtn.innerHTML = '<span>Erro ao Enviar</span><i class="fas fa-exclamation-circle"></i>';
                showNotification('Erro ao enviar mensagem. Tente novamente.', 'error');
                
                setTimeout(() => {
                    submitBtn.innerHTML = originalContent;
                    submitBtn.disabled = false;
                }, 2000);
            }
        });
    }

    // =============================================
    // Botão Download CV
    // =============================================
    const downloadCV = document.getElementById('downloadCV');
    if (downloadCV) {
        downloadCV.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Preparando download do CV...', 'info');
            setTimeout(() => {
                showNotification('Download iniciado!', 'success');
            }, 1000);
        });
    }

    // =============================================
    // Botão Ver Todos Projetos
    // =============================================
    const viewAllProjects = document.getElementById('viewAllProjects');
    if (viewAllProjects) {
        viewAllProjects.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Carregando todos os projetos...', 'info');
            setTimeout(() => {
                showNotification('Redirecionando para todos os projetos...', 'success');
            }, 1500);
        });
    }

    // =============================================
    // Política de Privacidade
    // =============================================
    const privacyPolicy = document.getElementById('privacyPolicy');
    if (privacyPolicy) {
        privacyPolicy.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Abrindo política de privacidade...', 'info');
        });
    }

    // =============================================
    // Links de Projetos
    // =============================================
    const projectLinks = document.querySelectorAll('.project-link');
    projectLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const icon = this.querySelector('i');
            let message = 'Abrindo projeto';
            
            if (icon.classList.contains('fa-link')) {
                message = 'Abrindo demonstração do projeto';
            } else if (icon.classList.contains('fa-github')) {
                message = 'Abrindo código no GitHub';
            }
            
            showNotification(`${message}...`, 'info');
        });
    });

    // =============================================
    // Notificações
    // =============================================
    function showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (typeof gsap !== 'undefined') {
                gsap.to(notification, {
                    opacity: 0,
                    y: -20,
                    duration: 0.2,
                    onComplete: () => notification.remove()
                });
            } else {
                notification.remove();
            }
        });
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'
                }"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        if (typeof gsap !== 'undefined') {
            gsap.from(notification, {
                y: 20,
                opacity: 0,
                duration: 0.3,
                ease: 'power2.out'
            });
        } else {
            notification.style.opacity = 0;
            setTimeout(() => {
                notification.style.opacity = 1;
                notification.style.transform = 'translateY(0)';
            }, 10);
        }
        
        setTimeout(() => {
            if (typeof gsap !== 'undefined') {
                gsap.to(notification, {
                    y: -20,
                    opacity: 0,
                    duration: 0.3,
                    ease: 'power2.in',
                    onComplete: () => notification.remove()
                });
            } else {
                notification.style.opacity = 0;
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }

    // =============================================
    // AOS (Animate On Scroll)
    // =============================================
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100
        });
    }

    // =============================================
    // Atualizar ano no footer
    // =============================================
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // =============================================
    // Fallback para GSAP
    // =============================================
    if (!window.gsap) {
        console.warn('GSAP não carregado - algumas animações não funcionarão');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId.startsWith('#')) {
                    e.preventDefault();
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    }
});