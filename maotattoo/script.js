// Sistema de Tema Dark/Light
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

// Verificar tema preferido do sistema
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Verificar tema salvo no localStorage
const currentTheme = localStorage.getItem('theme') || (prefersDarkScheme.matches ? 'dark' : 'light');
html.setAttribute('data-theme', currentTheme);

// Atualizar ícone do botão
const updateThemeIcon = () => {
    const theme = html.getAttribute('data-theme');
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
};

updateThemeIcon();

// Alternar tema
themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
});

// Menu Mobile
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navbarMenu = document.querySelector('.navbar-menu');

mobileMenuToggle.addEventListener('click', () => {
    navbarMenu.classList.toggle('active');
    mobileMenuToggle.innerHTML = navbarMenu.classList.contains('active') 
        ? '<i class="fas fa-times"></i>' 
        : '<i class="fas fa-bars"></i>';
});

// Fechar menu ao clicar em um link
document.querySelectorAll('.navbar-menu a').forEach(link => {
    link.addEventListener('click', () => {
        navbarMenu.classList.remove('active');
        mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    });
});

// Filtro do Portfólio
const filterButtons = document.querySelectorAll('.filter-btn');
const gallery = document.querySelector('.gallery');

// Carregar imagens do portfólio
const portfolioImages = [ 
    { src: 'assets/buss.jpg', category: 'realism', title: 'Realismo - Retrato' },
    { src: 'assets/violador.jpg', category: 'blackwork', title: 'Blackwork - Braço' },
    { src: 'assets/ferra.jpg', category: 'bio', title: 'Bio Orgânico - Costas' },
    { src: 'assets/tiger.jpg', category: 'realism', title: 'Realismo - Animal' },
    { src: 'assets/dooll', category: 'blackwork', title: 'Blackwork - Perna' },
    { src: 'assets/warrior.jpg', category: 'bio', title: 'Bio Orgânico - Torso' },
    { src: 'assets/rosto.jpg', category: 'realism', title: 'Realismo - Manga' },
    { src: 'assets/portfolio/8.jpg', category: 'blackwork', title: 'Blackwork - Costas' },
    { src: 'assets/portfolio/9.jpg', category: 'bio', title: 'Bio Orgânico - Braço' },
];

// Gerar galeria
portfolioImages.forEach(image => {
    const item = document.createElement('div');
    item.className = `gallery-item ${image.category}`;
    item.innerHTML = `
        <img src="${image.src}" alt="${image.title}" loading="lazy">
        <div class="gallery-overlay">
            <h3>${image.title}</h3>
        </div>
    `;
    gallery.appendChild(item);
});

// Ativar filtros
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remover classe active de todos os botões
        filterButtons.forEach(btn => btn.classList.remove('active'));
        // Adicionar classe active ao botão clicado
        button.classList.add('active');
        
        const filterValue = button.getAttribute('data-filter');
        const galleryItems = document.querySelectorAll('.gallery-item');
        
        galleryItems.forEach(item => {
            if (filterValue === 'all' || item.classList.contains(filterValue)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

// Formulário de Agendamento
const bookingForm = document.getElementById('booking-form');

bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validar formulário
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const date = document.getElementById('date').value;
    const location = document.getElementById('location').value;
    const description = document.getElementById('description').value;
    
    if (!name || !email || !phone || !date || !location || !description) {
        showAlert('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }
    
    // Simular envio
    showAlert('Solicitação enviada com sucesso! Entraremos em contato em breve para confirmar seu agendamento.', 'success');
    bookingForm.reset();
    
    // Aqui você pode adicionar uma chamada AJAX para enviar os dados para o servidor
});

// Mostrar alerta
function showAlert(message, type) {
    const alertBox = document.createElement('div');
    alertBox.className = `alert-box ${type}`;
    alertBox.textContent = message;
    
    document.body.appendChild(alertBox);
    
    setTimeout(() => {
        alertBox.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        alertBox.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(alertBox);
        }, 300);
    }, 5000);
}

// Sistema de Fidelidade Avançado
class FidelitySystem {
    constructor() {
        this.tiers = [
            { 
                name: "Iniciante", 
                minPoints: 0, 
                maxPoints: 50, 
                benefits: ["5% de desconto", "Acesso a pré-lançamentos", "Sketch digital"],
                rewards: ["Sketch digital exclusivo"]
            },
            { 
                name: "Colecionador", 
                minPoints: 51, 
                maxPoints: 150, 
                benefits: ["10% de desconto", "Kit de cuidados premium", "Prioridade no agendamento", "Sessão fotográfica"],
                rewards: ["Produtos de cuidados", "Sessão fotográfica"]
            },
            { 
                name: "VIP", 
                minPoints: 151, 
                maxPoints: 300, 
                benefits: ["15% de desconto", "Brinde de luxo", "Sessão privativa", "Convites para eventos"],
                rewards: ["Obra de arte exclusiva", "Experiência VIP"]
            },
            { 
                name: "Black Card", 
                minPoints: 301, 
                maxPoints: Infinity, 
                benefits: ["20% de desconto", "Obra de arte exclusiva", "Experiência VIP completa", "Consultoria personalizada"],
                rewards: ["Obra de arte original", "Experiência premium"]
            }
        ];
        this.pointsExpirationDays = 365; // Pontos expiram após 1 ano de inatividade
    }
    
    calculateTier(points) {
        return this.tiers.find(tier => points >= tier.minPoints && points <= tier.maxPoints);
    }
    
    addPoints(user, hours, isCompleted = false) {
        const now = new Date();
        const lastActivity = user.lastActivity ? new Date(user.lastActivity) : now;
        
        // Verificar expiração de pontos
        if ((now - lastActivity) > (this.pointsExpirationDays * 24 * 60 * 60 * 1000)) {
            user.points = 0; // Resetar pontos se inativo por muito tempo
        }
        
        // Adicionar pontos (1 ponto por hora + bônus por sessão completa)
        let pointsToAdd = hours;
        if (isCompleted && hours >= 3) {
            pointsToAdd += Math.floor(hours / 3); // Bônus para sessões longas
        }
        
        user.points += pointsToAdd;
        user.lastActivity = now.toISOString();
        
        // Verificar se mudou de nível
        const newTier = this.calculateTier(user.points);
        if (newTier.name !== user.tier) {
            user.tier = newTier.name;
            this.notifyTierUpgrade(user);
        }
        
        return user;
    }
    
    notifyTierUpgrade(user) {
        // Aqui você pode implementar notificações por e-mail ou no site
        console.log(`Parabéns! Você alcançou o nível ${user.tier}`);
    }
    
    getNextTier(points) {
        const currentTier = this.calculateTier(points);
        const currentIndex = this.tiers.findIndex(t => t.name === currentTier.name);
        
        if (currentIndex < this.tiers.length - 1) {
            return this.tiers[currentIndex + 1];
        }
        return null;
    }
    
    getProgressToNextTier(points) {
        const currentTier = this.calculateTier(points);
        const nextTier = this.getNextTier(points);
        
        if (!nextTier) return null;
        
        const progress = (points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints);
        return Math.min(Math.round(progress * 100), 100);
    }
    
    getRewardsForTier(tierName) {
        const tier = this.tiers.find(t => t.name === tierName);
        return tier ? tier.rewards : [];
    }
}

// Exemplo de uso do sistema de fidelidade
const fidelitySystem = new FidelitySystem();

// Simular usuário
const user = {
    id: 1,
    name: "Cliente VIP",
    points: 120,
    tier: "Colecionador",
    lastActivity: "2023-05-01",
    tattoos: [
        { date: "2023-05-15", hours: 4, pointsEarned: 6 },
        { date: "2023-07-20", hours: 3, pointsEarned: 5 }
    ]
};

// Atualizar interface com dados do usuário
function updateFidelityUI(user) {
    const currentTier = fidelitySystem.calculateTier(user.points);
    const nextTier = fidelitySystem.getNextTier(user.points);
    const progress = fidelitySystem.getProgressToNextTier(user.points);
    
    // Mapear posições dos marcadores
    const tierPositions = {
        "Iniciante": 0,
        "Colecionador": 33,
        "VIP": 66,
        "Black Card": 100
    };
    
    // Calcular posição atual
    let leftPosition;
    if (nextTier) {
        const currentPosition = tierPositions[currentTier.name];
        const nextPosition = tierPositions[nextTier.name];
        const positionProgress = (progress / 100);
        leftPosition = currentPosition + ((nextPosition - currentPosition) * positionProgress);
    } else {
        leftPosition = 100;
    }
    
    // Atualizar barra de progresso
    document.querySelector('.progress-fill').style.width = `${progress}%`;
    
    // Posicionar card de status
    const statusElement = document.querySelector('.current-status');
    statusElement.style.left = `${leftPosition}%`;
    
    // Atualizar informações do status
    document.querySelector('.status-level').textContent = currentTier.name;
    document.querySelector('.status-points').textContent = nextTier 
        ? `${user.points}/${nextTier.minPoints} pontos` 
        : `${user.points} pontos`;
    document.querySelector('.status-next').textContent = nextTier 
        ? `Próximo nível em ${nextTier.minPoints - user.points} pontos` 
        : 'Nível máximo alcançado';
    
    // Destacar card do nível atual
    document.querySelectorAll('.tier-card').forEach(card => {
        card.classList.remove('highlighted');
        if (card.querySelector('h3').textContent === currentTier.name) {
            card.classList.add('highlighted');
        }
    });
}

// Inicializar interface
updateFidelityUI(user);

// Suavizar rolagem para âncoras
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Animação ao rolar
const animateOnScroll = () => {
    const elements = document.querySelectorAll('.about, .fidelity, .booking, .contact, .portfolio');
    
    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.2;
        
        if (elementPosition < screenPosition) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
};

// Adicionar estilos iniciais para animação
document.querySelectorAll('.about, .fidelity, .booking, .contact, .portfolio').forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
});

window.addEventListener('scroll', animateOnScroll);
window.addEventListener('load', animateOnScroll);

// Carregar vídeo do hero (simulado)
document.addEventListener('DOMContentLoaded', () => {
    // Simular carregamento de vídeo
    setTimeout(() => {
        const heroVideo = document.querySelector('.hero-video');
        heroVideo.innerHTML = `
            <video autoplay muted loop playsinline>
                <source src="assets/hero-video.mp4" type="video/mp4">
            </video>
            <div class="video-overlay"></div>
        `;
    }, 300);
});