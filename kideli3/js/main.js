document.addEventListener('DOMContentLoaded', function() {
    // Inicialize o Auth primeiro
    if (!window.Auth) {
        initializeAuth(); // Esta função já existe no auth.js
    }
    
    // Depois o ProfileModal
    if (!window.profileModal) {
        window.profileModal = new ProfileModal();
    }
    
    // Configura botão de perfil
    document.getElementById('authButton')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (isLoggedIn()) { // Função do auth.js
            window.profileModal.open();
        } else {
            openAuthModal('login'); // Função do auth.js
        }
    });
    // ========== CONFIGURAÇÕES GERAIS ==========
    const config = {
        deliveryFee: 15.00,
        validCoupons: {
            'KI10': { discount: 0.1, description: '10% de desconto' },
            'KI20': { discount: 0.2, description: '20% de desconto' },
            'FRETEKI': { discount: 0, description: 'Frete grátis', freeDelivery: true }
        },
        paymentMethods: {
            pix: { name: "PIX", discount: 0.05, icon: "fa-qrcode" },
            creditCard: { name: "Cartão de Crédito", discount: 0, icon: "fa-credit-card" },
            debitCard: { name: "Cartão de Débito", discount: 0, icon: "fa-credit-card" }
        }
    };

    // ========== ELEMENTOS DO DOM ==========
    const elements = {
        menuToggle: document.querySelector('.menu-toggle'),
        menu: document.querySelector('.menu'),
        addToCartButtons: document.querySelectorAll('.add-to-cart'),
        cartCounters: document.querySelectorAll('.cart-count'),
        floatingCartBtn: document.getElementById('floatingCartBtn'),
        headerCartBtn: document.querySelector('.header .cart-btn'),
        cartModal: document.getElementById('cartModal'),
        cartItemsContainer: document.getElementById('cartItemsContainer'),
        emptyCartMessage: document.querySelector('.empty-cart-message'),
        cartModalClose: document.querySelector('.cart-modal-close'),
        couponInput: document.getElementById('coupon'),
        couponMessage: document.getElementById('couponMessage'),
        applyCouponBtn: document.getElementById('applyCoupon'),
        deliveryOptions: document.querySelectorAll('input[name="deliveryOption"]'),
        paymentMethods: document.querySelectorAll('input[name="paymentMethod"]'),
        checkoutBtn: document.querySelector('.checkout-btn'), // Corrigido para classe
        cardForm: document.getElementById('cardForm'),
        deliveryDetails: document.getElementById('deliveryDetails'),
        pickupDetails: document.getElementById('pickupDetails'),
        cartSubtotal: document.getElementById('cartSubtotal'),
        cartDiscount: document.getElementById('cartDiscount'),
        deliveryFee: document.getElementById('deliveryFee'),
        cartTotal: document.getElementById('cartTotal'),
        cardInstallments: document.getElementById('cardInstallments'),
        deliveryDate: document.getElementById('deliveryDate'),
        pickupDate: document.getElementById('pickupDate')
    };

    // ========== ESTADO DO CARRINHO ==========
    const cartState = {
        items: JSON.parse(localStorage.getItem('kideliCart')) || [],
        appliedCoupon: null,
        get count() {
            return this.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        },
        get subtotal() {
            return this.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        }
    };

    // ========== FUNÇÕES UTILITÁRIAS ==========
    const utils = {
        formatPrice: (price) => 'R$ ' + price.toFixed(2).replace('.', ','),
        setMinimumDate: (element, daysToAdd) => {
            const today = new Date();
            const minDate = new Date(today);
            minDate.setDate(today.getDate() + daysToAdd);
            element.min = minDate.toISOString().split('T')[0];
        }
    };

    // ========== FUNÇÕES DO CARRINHO ==========
    const cart = {
        init: function() {
            // Verifica se há itens no carrinho com chave antiga
            const oldCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
            if (oldCartItems.length > 0) {
                localStorage.setItem('kideliCart', JSON.stringify(oldCartItems));
                localStorage.removeItem('cartItems');
            }
            
            this.clearDuplicates();
            this.updateCounters();
            this.setupEventListeners();
            this.loadCart();
            
            if (localStorage.getItem('shouldOpenCart') === 'true') {
                this.openModal();
                localStorage.removeItem('shouldOpenCart');
            }
        },

        setupEventListeners: function() {
            // Menu mobile
            if (elements.menuToggle) {
                elements.menuToggle.addEventListener('click', () => {
                    elements.menu.classList.toggle('active');
                    elements.menuToggle.classList.toggle('active');
                });
            }

            // Botões de adicionar ao carrinho
            elements.addToCartButtons.forEach(button => {
                button.addEventListener('click', () => this.handleAddToCart(button));
            });

            // Botões do carrinho
            elements.headerCartBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal();
            });

            elements.floatingCartBtn?.addEventListener('click', () => this.openModal());
            elements.cartModalClose?.addEventListener('click', () => this.closeModal());

            // Cupons e pagamento
            elements.applyCouponBtn?.addEventListener('click', () => this.applyCoupon());
            elements.deliveryOptions?.forEach(radio => {
                radio.addEventListener('change', () => this.updateDeliveryOption());
            });
            elements.paymentMethods?.forEach(radio => {
                radio.addEventListener('change', () => this.updatePaymentMethod());
            });
            elements.checkoutBtn?.addEventListener('click', () => this.startCheckout());

            // Fechar modal ao clicar fora
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.cart-modal-content') && 
                    !e.target.closest('.cart-btn') && 
                    !e.target.closest('#floatingCartBtn')) {
                    this.closeModal();
                }
            });
            window.addEventListener('beforeunload', () => {
                this.saveCart();
            });
        },

        clearDuplicates: function() {
            const uniqueItems = [];
            const ids = new Set();
            
            cartState.items.forEach(item => {
                const itemKey = `${item.id}-${item.size || 'medio'}`;
                if (!ids.has(itemKey)) {
                    ids.add(itemKey);
                    uniqueItems.push(item);
                }
            });
            
            cartState.items = uniqueItems;
            this.saveCart();
            this.updateUI();
        },

        handleAddToCart: function(button) {
            const productCard = button.closest('.product-card');
            const product = {
                id: productCard.dataset.id || Date.now().toString(),
                name: productCard.querySelector('h3').textContent,
                description: productCard.querySelector('.product-description')?.textContent || '',
                price: parseFloat(productCard.querySelector('.price').textContent.replace('R$', '').replace(',', '.').trim()),
                image: productCard.querySelector('.product-img').src || './assets/image/default-product.jpg',
                size: productCard.querySelector('.size-selector')?.value
            };
            
            if (this.addItem(product)) {
                // Feedback visual
                button.textContent = '✓ Adicionado';
                button.disabled = true;
                
                setTimeout(() => {
                    button.textContent = 'Adicionar';
                    button.disabled = false;
                }, 1500);
                
                // Efeito no card
                productCard.classList.add('added-to-cart');
                setTimeout(() => {
                    productCard.classList.remove('added-to-cart');
                }, 1000);
            }
        },

        loadCart: function() {
            try {
                const savedCart = localStorage.getItem('kideliCart');
                if (savedCart) {
                    const parsedCart = JSON.parse(savedCart);
                    
                    // Verifica se é um array válido
                    if (Array.isArray(parsedCart)) {
                        cartState.items = parsedCart;
                        console.log('Carrinho carregado:', cartState.items); // Debug
                    } else {
                        console.warn('Dados inválidos no carrinho, limpando...');
                        this.clearCart();
                    }
                }
            } catch (e) {
                console.error("Erro ao carregar carrinho:", e);
                this.clearCart();
            }
        },

        saveCart: function() {
            try {
                // Converte para JSON e depois analisa de volta para garantir que é válido
                const cartData = JSON.stringify(cartState.items);
                JSON.parse(cartData); // Testa se o JSON é válido
                
                localStorage.setItem('kideliCart', cartData);
                console.log('Carrinho salvo com sucesso:', cartState.items); // Debug
            } catch (e) {
                console.error('Erro ao salvar carrinho:', e);
                // Em caso de erro, tenta salvar um array vazio
                localStorage.setItem('kideliCart', JSON.stringify([]));
            }
        },

        addItem: function(product) {
            // Garante que o ID é único e consistente
            const productId = product.id || `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const size = product.size || 'medio';
            
            const existingItemIndex = cartState.items.findIndex(item => 
                item.id === productId && item.size === size
            );
            
            // Define uma imagem padrão se não houver
            const productWithImage = {
                ...product,
                id: productId,
                image: product.image || './assets/image/red2.png',
                size: size
            };
            
            if (existingItemIndex !== -1) {
                cartState.items[existingItemIndex].quantity += product.quantity || 1;
            } else {
                cartState.items.push({
                    ...productWithImage,
                    quantity: product.quantity || 1
                });
            }
            
            this.saveCart();
            this.updateUI();
            return true;
        },

        removeItem: function(itemId) {
            const itemIndex = cartState.items.findIndex(item => item.id === itemId);
            if (itemIndex === -1) return;
        
            const itemElement = document.querySelector(`.cart-item[data-id="${itemId}"]`);
            
            if (itemElement) {
                itemElement.classList.add('removing');
                setTimeout(() => {
                    cartState.items.splice(itemIndex, 1);
                    this.saveCart(); // Garante o salvamento
                    this.updateUI();
                    if (cartState.items.length === 0) this.closeModal();
                }, 300);
            } else {
                cartState.items.splice(itemIndex, 1);
                this.saveCart(); // Garante o salvamento
                this.updateUI();
            }
        },

        updateQuantity: function(itemId, change) {
            const item = cartState.items.find(item => item.id === itemId);
            if (!item) return;

            item.quantity += change;
            if (item.quantity < 1) item.quantity = 1;
            
            this.saveCart();
            this.updateUI();
        },

        
        openModal: function() {
            if (!elements.cartModal) return; // Verificação adicionada
            elements.cartModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.renderItems();
            utils.setMinimumDate(elements.deliveryDate, 2);
            utils.setMinimumDate(elements.pickupDate, 2);
        },
        
        closeModal: function() {
            if (!elements.cartModal) return; // Verificação adicionada
            elements.cartModal.style.display = 'none';
            document.body.style.overflow = '';
        },

        renderItems: function() {
            elements.cartItemsContainer.innerHTML = '';
            
            if (cartState.items.length === 0) {
                elements.emptyCartMessage.style.display = 'block';
                return;
            }
            
            elements.emptyCartMessage.style.display = 'none';
            
            cartState.items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.setAttribute('data-id', item.id);
                
                // Use a imagem do item ou uma imagem padrão
                const itemImage = item.image || './assets/image/red2.png';
                
                itemElement.innerHTML = `
                    <img src="${itemImage}" alt="${item.name}" class="cart-item-image" 
                         onerror="this.src='./assets/image/red2.png'">
                    <div class="cart-item-details">
                        <h3 class="cart-item-title">${item.name}</h3>
                        ${item.size ? `<p class="cart-item-size">Tamanho: ${item.size}</p>` : ''}
                        <div class="cart-item-quantity-controls">
                            <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-btn increase" data-id="${item.id}">+</button>
                        </div>
                    </div>
                    <div class="cart-item-price">${utils.formatPrice(item.price * item.quantity)}</div>
                    <button class="cart-item-remove" data-id="${item.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;
                elements.cartItemsContainer.appendChild(itemElement);
            });

            // Adiciona eventos aos novos elementos
            document.querySelectorAll('.quantity-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const change = btn.classList.contains('increase') ? 1 : -1;
                    this.updateQuantity(btn.getAttribute('data-id'), change);
                });
            });

            document.querySelectorAll('.cart-item-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.removeItem(btn.getAttribute('data-id'));
                });
            });
            
            this.updateSummary();
        },

        updateSummary: function() {
            // Verifica se os elementos críticos existem
            if (!elements.cartSubtotal || !elements.cartTotal) {
                console.error('Elementos do carrinho não encontrados!');
                return;
            }
        
            const discount = cartState.appliedCoupon ? 
                cartState.appliedCoupon.discount * cartState.subtotal : 0;
            
            const delivery = (cartState.appliedCoupon?.freeDelivery || 
                             !document.getElementById('delivery')?.checked) ? 
                0 : config.deliveryFee;
            
            const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'creditCard';
            const paymentDiscount = config.paymentMethods[paymentMethod].discount * cartState.subtotal;
            
            const total = cartState.subtotal - discount - paymentDiscount + delivery;
            
            // Atualiza a exibição com verificações
            if (elements.cartSubtotal) elements.cartSubtotal.textContent = utils.formatPrice(cartState.subtotal);
            if (elements.cartDiscount) elements.cartDiscount.textContent = utils.formatPrice(discount);
            if (elements.deliveryFee) elements.deliveryFee.textContent = utils.formatPrice(delivery);
            if (elements.cartTotal) elements.cartTotal.textContent = utils.formatPrice(total);
            
            // Atualiza parcelamento se for cartão de crédito
            if (paymentMethod === 'creditCard' && elements.cardInstallments) {
                this.updateInstallments(total);
            }
        },

        updateInstallments: function(total) {
            elements.cardInstallments.innerHTML = '';
            
            const maxInstallments = 12;
            const minInstallmentValue = 50;
            const possibleInstallments = Math.min(
                maxInstallments,
                Math.floor(total / minInstallmentValue)
            );
            
            for (let i = 1; i <= possibleInstallments; i++) {
                const installmentValue = total / i;
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i}x de ${utils.formatPrice(installmentValue)}`;
                elements.cardInstallments.appendChild(option);
            }
        },

        updateUI: function() {
            if (!elements.cartItemsContainer || !elements.emptyCartMessage) {
        console.error('Elementos do carrinho não encontrados!');
        return;
    }
            this.renderItems();
            this.updateCounters();
            
            if (elements.floatingCartBtn) {
                cartState.items.length > 0 ? 
                    elements.floatingCartBtn.classList.add('visible') : 
                    elements.floatingCartBtn.classList.remove('visible');
            }
        },

        updateCounters: function() {
            elements.cartCounters.forEach(el => {
                el.textContent = cartState.count;
            });
        },

        applyCoupon: function() {
            const couponCode = elements.couponInput.value.trim();
            
            if (config.validCoupons[couponCode]) {
                cartState.appliedCoupon = config.validCoupons[couponCode];
                elements.couponMessage.textContent = `Cupom aplicado: ${cartState.appliedCoupon.description}`;
                elements.couponMessage.className = 'coupon-message valid';
            } else {
                cartState.appliedCoupon = null;
                elements.couponMessage.textContent = 'Cupom inválido';
                elements.couponMessage.className = 'coupon-message invalid';
            }
            
            this.updateSummary();
        },

        updateDeliveryOption: function() {
            elements.deliveryDetails.style.display = 
                document.getElementById('delivery').checked ? 'block' : 'none';
            elements.pickupDetails.style.display = 
                document.getElementById('pickup').checked ? 'block' : 'none';
            this.updateSummary();
        },

        updatePaymentMethod: function() {
            elements.cardForm.style.display = 
                (document.querySelector('input[name="paymentMethod"]:checked').value === 'creditCard' || 
                 document.querySelector('input[name="paymentMethod"]:checked').value === 'debitCard') ? 
                'block' : 'none';
            this.updateSummary();
        },

        startCheckout: function() {
            if (cartState.items.length === 0) {
                alert('Seu carrinho está vazio!');
                return;
            }

            const orderData = {
                items: cartState.items,
                subtotal: parseFloat(elements.cartSubtotal.textContent.replace('R$', '').replace(',', '.')),
                discount: parseFloat(elements.cartDiscount.textContent.replace('R$', '').replace(',', '.')),
                delivery: parseFloat(elements.deliveryFee.textContent.replace('R$', '').replace(',', '.')),
                total: parseFloat(elements.cartTotal.textContent.replace('R$', '').replace(',', '.')),
                paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
                deliveryOption: document.querySelector('input[name="deliveryOption"]:checked').value
            };

            console.log('Iniciando checkout:', orderData);
            // Implemente aqui a integração com o gateway de pagamento
        }
    };

    
    // Inicializa o carrinho
    cart.init();
});