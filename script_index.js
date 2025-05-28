// Scroll suave otimizado
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            // Adiciona classe ativa ao item do menu
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            this.classList.add('active');
            
            // Scroll suave
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Fecha o menu mobile se estiver aberto
            const navbarCollapse = document.querySelector('.navbar-collapse');
            if (navbarCollapse.classList.contains('show')) {
                new bootstrap.Collapse(navbarCollapse).hide();
            }
        }
    });
});

// Efeito navbar ao scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Inicializar carrossel com verificação de existência
function initCarousel() {
    const carouselElement = document.querySelector('#portfolioCarousel');
    if (carouselElement) {
        const carousel = new bootstrap.Carousel(carouselElement, {
            interval: 5000,
            wrap: true,
            pause: 'hover'
        });
        
        // Pausar carrossel quando estiver em hover (melhor para UX)
        carouselElement.addEventListener('mouseenter', () => {
            carousel.pause();
        });
        
        carouselElement.addEventListener('mouseleave', () => {
            carousel.cycle();
        });
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    initCarousel();
    
    // Ativar item ativo no menu baseado na posição de scroll
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
});

// Lazy loading para imagens
if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src;
    });
} else {
    // Carregar polyfill se necessário
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/loading-attribute-polyfill@2.0.1/dist/loading-attribute-polyfill.min.js';
    document.body.appendChild(script);
}