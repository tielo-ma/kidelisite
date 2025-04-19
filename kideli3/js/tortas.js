// tortas.js - Script para a página de Tortas Premium
document.addEventListener('DOMContentLoaded', function() {
    cleanDuplicateCartItems();
    function updateCartCount() {
        const cartItems = getCartItems();
        const count = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = count;
        });
    }
    // ========== CONFIGURAÇÃO INICIAL ==========
    const modalOverlay = document.querySelector('.premium-modal-overlay');
    const modalClose = document.querySelector('.premium-modal-close');
    const quickViewButtons = document.querySelectorAll('.premium-quick-view');
    
    // Dados dos produtos
    const products = {
        'pistache-black': {
            name: 'Pistache Black',
            images: [
                './assets/image/bl.jpeg',
                './assets/image/ninuts.jpeg',
                './assets/image/red2.png'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'pistache-frutas': {
            name: 'Pistache & Frutas',
            images: [
                './assets/image/bl.jpeg',
                './assets/image/ninuts.jpeg',
                './assets/image/red2.png'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'choco-black': {
            name: 'Choco Black',
            images: [
                './assets/image/bl.jpeg',
                './assets/image/ninuts.jpeg',
                './assets/image/red2.png'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'cen-choc': {
            name: 'Cenoura com Chocolate',
            images: [
                './assets/image/bl.jpeg',
                './assets/image/ninuts.jpeg',
                './assets/image/red2.png'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'red-vel': {
            name: 'Red Velvet',
            images: [
                './assets/image/bl.jpeg',
                './assets/image/ninuts.jpeg',
                './assets/image/red2.png'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'prest-choc': {
            name: 'Prestígio com Chocolate',
            images: [
                './assets/image/bl.jpeg',
                './assets/image/ninuts.jpeg',
                './assets/image/red2.png'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'dulce-noz': {
            name: 'Doce de Leite com Nozes',
            images: [
                './assets/image/bl.jpeg',
                './assets/image/ninuts.jpeg',
                './assets/image/red2.png'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'sen-sa': {
            name: 'Sensação',
            images: [
                './assets/image/bl.jpeg',
                './assets/image/ninuts.jpeg',
                './assets/image/red2.png'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'cere-choc': {
            name: 'Cereja com Chocolate',
            images: [
                './assets/image/bl.jpeg',
                './assets/image/ninuts.jpeg',
                './assets/image/red2.png'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        },
        'ninho-nuts': {
            name: 'Ninho com Nutella',
            images: [
                './assets/image/bl.jpeg',
                './assets/image/ninuts.jpeg',
                './assets/image/red2.png'
            ],
            prices: {
                'medio': '110,00',
                'grande': '240,00'
            }
        }
    };

    // ========== FUNÇÕES DO CARRINHO ==========
    function getCartItems() {
        return JSON.parse(localStorage.getItem('kideliCart')) || [];
    }

    function saveCartItems(items) {
        localStorage.setItem('kideliCart', JSON.stringify(items));
    }

    function cleanDuplicateCartItems() {
        const cartItems = getCartItems();
        const uniqueItems = [];
        const seenIds = new Set();
    
        cartItems.forEach(item => {
            if (item && item.id && !isNaN(item.price) && item.quantity > 0) {
                if (!seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    uniqueItems.push(item);
                } else {
                    console.log('Item duplicado removido:', item);
                }
            }
        });
    
        saveCartItems(uniqueItems);
        return uniqueItems;
    }

    

    // ========== FUNÇÃO PARA ADICIONAR AO CARRINHO ==========
    function addToCart(productData, fromModal = false) {
        let cartItems = getCartItems();
        const productId = productData.id;
        const product = products[productId] || productData;
    
        // Verificação do tamanho
        let selectedSize = 'medio';
        if (fromModal) {
            const sizeInput = document.querySelector('.premium-modal .premium-size-option.active input');
            selectedSize = sizeInput?.value || 'medio';
        } else {
            const sizeInput = document.querySelector(`.clickable-torta[data-id="${productId}"] .premium-size-option.active input`);
            selectedSize = sizeInput?.value || 'medio';
        }
    
        // CONVERSÃO CORRIGIDA DEFINITIVA DO PREÇO
        let price = 0;
        if (product.prices && product.prices[selectedSize]) {
            const priceStr = product.prices[selectedSize];
            // Método seguro para converter formato brasileiro para número
            price = parseFloat(
                priceStr.replace('R$', '')
                       .trim()
                       .replace(/\./g, '')  // Remove pontos de milhar
                       .replace(',', '.')   // Substitui vírgula por ponto
            );
        }
    
        // Verificação final do preço
        if (isNaN(price)) {
            console.error('Preço inválido:', product.prices[selectedSize]);
            price = 0;
        }
    
        // ID único baseado no produto e tamanho
        const uniqueId = `${productId}-${selectedSize}`;
    
        // Verifica se já existe no carrinho
        const existingItemIndex = cartItems.findIndex(item => item.id === uniqueId);
    
        if (existingItemIndex !== -1) {
            cartItems[existingItemIndex].quantity += 1;
        } else {
            cartItems.push({
                id: uniqueId,
                name: `${product.name} (${selectedSize})`,
                price: price, // Armazenado como número
                image: product.images?.[0] || './assets/image/red2.png',
                size: selectedSize,
                quantity: 1
            });
        }
    
        saveCartItems(cartItems);
        updateCartDisplay();
        showCartNotification(`${product.name} (${selectedSize})`);
        
        console.log('Item adicionado:', {
            name: product.name,
            size: selectedSize,
            price: price,
            quantity: existingItemIndex !== -1 ? cartItems[existingItemIndex].quantity : 1
        });
        
        return true;
    }
    
    // ========== FUNÇÃO PARA ATUALIZAR O CARRINHO ==========
    function updateCartDisplay() {
        const cartItems = getCartItems();
        const count = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const total = cartItems.reduce((sum, item) => {
            // Garante que o preço é um número
            const itemPrice = typeof item.price === 'string' 
                ? parseFloat(item.price.replace(',', '.')) 
                : item.price;
                
            return sum + (itemPrice * (item.quantity || 1));
        }, 0);
    
        // Atualiza contagem
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = count;
        });
        
        // Atualiza total (com formatação brasileira)
        const totalElement = document.querySelector('.cart-total');
        if (totalElement) {
            totalElement.textContent = formatCurrency(total);
        }
    
        console.log('Carrinho atualizado:', {
            itens: cartItems,
            total: total
        });
    }
    
    // ========== FUNÇÃO AUXILIAR PARA FORMATAÇÃO ==========
    function formatCurrency(value) {
        // Formatação segura para o padrão brasileiro
        return 'R$ ' + value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    // FUNÇÃO PARA CALCULAR E ATUALIZAR O CARRINHO COMPLETO
    function updateCartDisplay() {
        const cartItems = getCartItems();
        const count = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const total = cartItems.reduce((sum, item) => {
            // Garante que o preço é um número
            const price = typeof item.price === 'string' 
                ? parseFloat(item.price.replace('R$', '').replace(',', '.'))
                : item.price;
                
            return sum + (price * (item.quantity || 1));
        }, 0);
    
        // Atualiza contagem
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = count;
        });
        
        // Atualiza total (se o elemento existir)
        const totalElement = document.querySelector('.cart-total');
        if (totalElement) {
            // Formatação brasileira (R$ 1.234,56)
            totalElement.textContent = `R$ ${total.toFixed(2)
                .replace('.', ',')
                .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}`;
        }
    }

    // ========== NOTIFICAÇÃO DE CARRINHO ==========
    function showCartNotification(productName) {
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${productName} adicionado ao carrinho!
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove após 1.5 segundos (tempo para ver antes do redirecionamento)
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 1500);
    }

    // ========== EVENTO DE CLIQUE NOS CARDS ==========
    document.querySelectorAll('.clickable-torta').forEach(card => {
        card.addEventListener('click', function(e) {
            // Ignora cliques nos elementos filhos
            if (e.target.closest('.premium-size-option, .premium-quick-view')) {
                return;
            }
    
            const productId = this.dataset.id;
            const product = products[productId];
            if (!product) return;
    
            console.log('Clique no card - produto:', productId);
    
            // Adiciona apenas o produto básico (o tamanho será detectado na função addToCart)
            addToCart({
                id: productId,
                name: product.name,
                prices: product.prices,
                image: product.images[0]
            }, false);
    
            this.classList.add('torta-clicked');
            setTimeout(() => this.classList.remove('torta-clicked'), 500);
            localStorage.setItem('shouldOpenCart', 'true');
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
    // ========== FUNÇÕES DO MODAL ==========
    function openProductModal(productId) {
        const product = products[productId];
        if (!product) return;

        // Atualiza os dados do modal
        const modal = document.querySelector('.premium-modal');
        if (!modal) return; // Adicionada verificação de segurança
        
        const modalTitle = modal.querySelector('.premium-modal-title');
        const mainImage = modal.querySelector('.premium-main-image');
        const thumbnails = modal.querySelectorAll('.premium-thumb');
        const addToCartBtn = modal.querySelector('.premium-add-to-cart');

        // Verificação dos elementos essenciais
        if (!modalTitle || !mainImage || !addToCartBtn) return;

        // Atualiza conteúdo básico
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
        
        // Atualiza preços COM VERIFICAÇÃO DE SEGURANÇA
        const medioPriceElement = modal.querySelector('#size-medio + label .premium-size-price');
        const grandePriceElement = modal.querySelector('#size-grande + label .premium-size-price');
        
        if (medioPriceElement) medioPriceElement.textContent = `R$ ${product.prices.medio}`;
        if (grandePriceElement) grandePriceElement.textContent = `R$ ${product.prices.grande}`;
        
        // Atualiza preço no modal COM VERIFICAÇÃO
        const modalPrice = document.querySelector('.premium-modal-price');
        if (modalPrice) {
            modalPrice.textContent = `R$ ${product.prices.medio}`;
            
            // Seleciona médio por padrão
            const medioOption = modal.querySelector('#size-medio')?.parentElement;
            if (medioOption) {
                document.querySelectorAll('.premium-size-option').forEach(opt => opt.classList.remove('active'));
                medioOption.classList.add('active');
            }
        }
        
        // Mostra o modal
        modalOverlay.style.display = 'flex';
        setTimeout(() => modalOverlay.style.opacity = '1', 10);
    }

    // ========== EVENTO DE ADICIONAR DO MODAL ==========
    document.querySelector('.premium-add-to-cart').addEventListener('click', function(e) {
        e.stopPropagation(); // Impede a propagação para o card
        
        const modal = this.closest('.premium-modal');
        const productId = modal.querySelector('.premium-modal-title').dataset.productId;
        const product = products[productId];
        if (!product) return;
    
        console.log('Clique no modal - produto:', productId);
    
        // Adiciona com flag fromModal=true
        addToCart({
            id: productId,
            name: product.name,
            prices: product.prices,
            image: product.images[0]
        }, true);
    
        showCartNotification(`${product.name}`);
        setTimeout(() => {
            localStorage.setItem('shouldOpenCart', 'true');
            window.location.href = 'index.html';
        }, 1500);
    });
    

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
                let cartItems = JSON.parse(localStorage.getItem('kideliCart')) || []; // Usar kideliCart consistentemente
                const existingItem = cartItems.find(item => 
                    item.id === product.id && (!product.size || item.size === product.size)
                );
                
                if (existingItem) {
                    existingItem.quantity += 1;
                } else {
                    cartItems.push(product);
                }
                
                localStorage.setItem('kideliCart', JSON.stringify(cartItems)); // Sempre usar kideliCart
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
    document.querySelector('.footer-bottom p').innerHTML = `&copy; ${new Date().getFullYear()} KiDeli Arte & Sabor. Todos os direitos reservados.`;
});