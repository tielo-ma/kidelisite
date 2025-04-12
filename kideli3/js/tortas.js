// tortas.js - Script para a página de Tortas Premium
document.addEventListener('DOMContentLoaded', function() {
    // ========== CONFIGURAÇÃO INICIAL ==========
    const modalOverlay = document.querySelector('.premium-modal-overlay');
    const modalClose = document.querySelector('.premium-modal-close');
    const quickViewButtons = document.querySelectorAll('.premium-quick-view');
    
    // Dados dos produtos
    const products = {
        'pistache-black': {
            name: 'Pistache Black',
            images: [
                'assets/pistache-black-detail.jpg',
                'assets/pistache-black-slice.jpg',
                'assets/pistache-black-box.jpg'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'pistache-frutas': {
            name: 'Pistache & Frutas',
            images: [
                'assets/pistache-frutas-detail.jpg',
                'assets/pistache-frutas-slice.jpg',
                'assets/pistache-frutas-box.jpg'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'choco-black': {
            name: 'Choco Black',
            images: [
                'assets/choco-black-detail.jpg',
                'assets/choco-black-slice.jpg',
                'assets/choco-black-box.jpg'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'cen-choc': {
            name: 'Cenoura com Chocolate',
            images: [
                'assets/pistache-black-detail.jpg',
                'assets/pistache-black-slice.jpg',
                'assets/pistache-black-box.jpg'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'red-vel': {
            name: 'Red Velvet',
            images: [
                'assets/pistache-black-detail.jpg',
                'assets/pistache-black-slice.jpg',
                'assets/pistache-black-box.jpg'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'prest-choc': {
            name: 'Prestígio com Chocolate',
            images: [
                'assets/pistache-black-detail.jpg',
                'assets/pistache-black-slice.jpg',
                'assets/pistache-black-box.jpg'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'dulce-noz': {
            name: 'Doce de Leite com Nozes',
            images: [
                'assets/pistache-black-detail.jpg',
                'assets/pistache-black-slice.jpg',
                'assets/pistache-black-box.jpg'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'sen-sa': {
            name: 'Sensação',
            images: [
                'assets/pistache-black-detail.jpg',
                'assets/pistache-black-slice.jpg',
                'assets/pistache-black-box.jpg'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'cere-choc': {
            name: 'Cereja com Chocolate',
            images: [
                'assets/pistache-black-detail.jpg',
                'assets/pistache-black-slice.jpg',
                'assets/pistache-black-box.jpg'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'ninho-nuts': {
            name: 'Ninho com Nutella',
            images: [
                'assets/pistache-black-detail.jpg',
                'assets/pistache-black-slice.jpg',
                'assets/pistache-black-box.jpg'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        }
    };

    // ========== EVENTO DE CLIQUE NOS CARDS ==========
    document.querySelectorAll('.clickable-torta').forEach(card => {
        card.addEventListener('click', function(e) {
            // Se clicou em um tamanho ou no botão "Ver Detalhes", não faz nada
            if (e.target.closest('.premium-size-option, .premium-quick-view')) {
                return;
            }
            
            // Adiciona ao carrinho se clicou em qualquer outra área do card
            const productData = JSON.parse(this.dataset.product);
            if (typeof window.addToCart === 'function') {
                window.addToCart(productData);
                this.classList.add('torta-clicked');
                setTimeout(() => this.classList.remove('torta-clicked'), 500);
            }
        });
    });

    // ========== BOTÃO VER DETALHES ==========
    document.querySelectorAll('.premium-quick-view').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = this.closest('.clickable-torta').dataset.id;
            openProductModal(productId);
        });
    });


    document.querySelectorAll('.premium-size-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation(); // Impede a propagação para o card
            const modalPrice = document.querySelector('.premium-modal-price');
            if (modalPrice && this.querySelector('.premium-size-price')) {
                modalPrice.textContent = this.querySelector('.premium-size-price').textContent;
            }

            // Remove a classe 'active' de todas as opções
            document.querySelectorAll('.premium-size-option').forEach(opt => {
                opt.classList.remove('active');
            });
            
            // Adiciona a classe 'active' apenas na opção clicada
            this.classList.add('active');
            
            // Marca o radio button correspondente
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                
                // Atualiza o preço no modal se necessário
                const priceElement = this.querySelector('.premium-size-price');
                if (priceElement && document.querySelector('.premium-modal-price')) {
                    document.querySelector('.premium-modal-price').textContent = priceElement.textContent;
                }
            }
        });
    });

    document.querySelectorAll('.premium-quick-view').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = this.closest('.clickable-torta').dataset.id;
            openProductModal(productId);
        });
    });
    
    // ========== FUNÇÕES DO MODAL ==========
    function openProductModal(productId) {
        const product = products[productId];
        if (!product) return;

        // Atualiza os dados do modal
        const modal = document.querySelector('.premium-modal');
        const modalTitle = modal.querySelector('.premium-modal-title');
        const mainImage = modal.querySelector('.premium-main-image');
        const thumbnails = modal.querySelectorAll('.premium-thumb');
        const addToCartBtn = modal.querySelector('.premium-add-to-cart');

        modalTitle.textContent = product.name;
        modalTitle.setAttribute('data-product-id', productId);
        addToCartBtn.setAttribute('data-product-id', productId);
        mainImage.style.backgroundImage = `url('${product.images[0]}')`;
        
        // Atualiza miniaturas
        thumbnails.forEach((thumb, index) => {
            if (product.images[index]) {
                thumb.style.backgroundImage = `url('${product.images[index]}')`;
                thumb.classList.toggle('active', index === 0);
            }
        });
        
        // Atualiza preços
        modal.querySelector('#size-medio + label .premium-size-price').textContent = `R$ ${product.prices.medio}`;
        modal.querySelector('#size-grande + label .premium-size-price').textContent = `R$ ${product.prices.grande}`;
        
        // Mostra o modal
        modalOverlay.style.display = 'flex';
        setTimeout(() => modalOverlay.style.opacity = '1', 10);
    }

    function closeModal() {
        modalOverlay.style.opacity = '0';
        setTimeout(() => modalOverlay.style.display = 'none', 300);
    }

    // Eventos do modal
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function(e) {
        if(e.target === modalOverlay) closeModal();
    });

    // Trocar imagem principal (agora dentro do contexto do modal)
    modalOverlay.addEventListener('click', function(e) {
        const thumb = e.target.closest('.premium-thumb');
        if (thumb) {
            const modal = this.querySelector('.premium-modal');
            const mainImage = modal.querySelector('.premium-main-image');
            const thumbnails = modal.querySelectorAll('.premium-thumb');
            
            thumbnails.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            mainImage.style.backgroundImage = thumb.style.backgroundImage;
        }
    });

    // ========== ADICIONAR AO CARRINHO ==========
    modalOverlay.addEventListener('click', function(e) {
        if (e.target.closest('.premium-add-to-cart')) {
            const modal = this.querySelector('.premium-modal');
            const productId = modal.querySelector('.premium-modal-title').getAttribute('data-product-id');
            const selectedSize = modal.querySelector('.premium-size-option.active input')?.value;
            
            if (!selectedSize) {
                alert('Por favor, selecione um tamanho antes de adicionar ao carrinho.');
                return;
            }
            
            const product = products[productId];
            if (!product) return;
            
            const productToAdd = {
                id: productId,
                name: product.name,
                price: product.prices[selectedSize],
                size: selectedSize,
                image: product.images[0],
                quantity: 1
            };
            
            // 1. Função para adicionar ao carrinho
            function addToCart(product) {
                let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
                const existingItem = cartItems.find(item => 
                    item.id === product.id && item.size === product.size);
                
                if (existingItem) {
                    existingItem.quantity += 1;
                } else {
                    cartItems.push(product);
                }
                
                localStorage.setItem('cartItems', JSON.stringify(cartItems));
                return true;
            }
            
            // 2. Adiciona ao carrinho
            if (addToCart(productToAdd)) {
                showCartNotification(productToAdd.name);
                closeModal();
                
                // 3. Prepara para abrir o carrinho no index.html
                localStorage.setItem('shouldOpenCart', 'true');
                
                // 4. Redireciona para o index.html
                window.location.href = 'index.html';
            } else {
                alert('Ocorreu um erro ao adicionar ao carrinho.');
            }
        }
    });


    function showCartNotification(productName) {
        const notification = document.createElement('div');
        notification.className = 'cart-notification show';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${productName} adicionado ao carrinho! Redirecionando...
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    // ========== FUNÇÕES AUXILIARES ==========
    function showCartNotification(productName) {
        const notification = document.createElement('div');
        notification.className = 'cart-notification show';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${productName} adicionado ao carrinho!
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    // ========== SISTEMA DE AVALIAÇÕES ==========
    const ratingStars = document.querySelectorAll('.premium-stars i');
    const reviewForm = document.querySelector('.premium-review-form');
    let selectedRating = 0;

    ratingStars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.getAttribute('data-rating'));
            updateStars();
        });
        
        star.addEventListener('mouseover', function() {
            const hoverRating = parseInt(this.getAttribute('data-rating'));
            updateStars(hoverRating);
        });
        
        star.addEventListener('mouseout', function() {
            updateStars(selectedRating);
        });
    });

    function updateStars(rating = selectedRating) {
        ratingStars.forEach((s, index) => {
            s.classList.toggle('fas', index < rating);
            s.classList.toggle('far', index >= rating);
        });
    }

    reviewForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const reviewText = this.querySelector('.premium-review-textarea').value;
        
        if(selectedRating === 0) {
            alert('Por favor, selecione uma avaliação com as estrelas.');
            return;
        }
        
        if(!reviewText.trim()) {
            alert('Por favor, escreva sua avaliação.');
            return;
        }
        
        alert('Avaliação enviada com sucesso! Obrigado por seu feedback.');
        this.reset();
        selectedRating = 0;
        updateStars();
    });

    // ========== EFEITOS VISUAIS ==========
    document.querySelectorAll('.premium-torta-card').forEach(card => {
        card.addEventListener('mousemove', function(e) {
            const x = e.pageX - this.offsetLeft;
            const y = e.pageY - this.offsetTop;
            this.style.transform = `perspective(1000px) rotateX(${(y - this.offsetHeight/2) / 20}deg) rotateY(${-(x - this.offsetWidth/2) / 20}deg)`;
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        });
    });

    // Atualizar ano no footer
    document.querySelector('.premium-footer-bottom p').innerHTML = `&copy; ${new Date().getFullYear()} KiDeli Premium. Todos os direitos reservados.`;
});