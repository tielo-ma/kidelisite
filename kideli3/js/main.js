document.addEventListener('DOMContentLoaded', function() {
    // ========== CONFIGURAÇÃO MERCADO PAGO ==========
    const mp = new MercadoPago('SUA_CHAVE_PUBLICA', { // Substitua pela sua chave real
        locale: 'pt-BR'
    });
    let mercadoPagoCheckout; // Variável para controlar o fluxo de pagamento

    // ========== MENU MOBILE ==========
    const menuToggle = document.createElement('div');
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    document.querySelector('.header .container').appendChild(menuToggle);

    const menu = document.querySelector('.menu');
    menuToggle.addEventListener('click', function() {
        menu.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });

    // ========== CARRINHO COMPLETO ==========
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const headerCartCount = document.querySelector('.header .cart-count');
    const floatingCartBtn = document.getElementById('floatingCartBtn');
    const floatingCartCount = document.getElementById('floatingCartCount');
    const headerCartBtn = document.querySelector('.header .cart-btn');
    const cartModal = document.getElementById('cartModal');
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const emptyCartMessage = document.querySelector('.empty-cart-message');

    let cartItems = JSON.parse(localStorage.getItem('kideliCart')) || [];
    let cartItemsCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    let appliedCoupon = null;
    const deliveryFee = 15.00; // Valor fixo para exemplo

    // Cupons válidos (pode ser buscado do backend na implementação real)
    const validCoupons = {
        'KI10': { discount: 0.1, description: '10% de desconto' },
        'KI20': { discount: 0.2, description: '20% de desconto' },
        'FRETEKI': { discount: 0, description: 'Frete grátis', freeDelivery: true }
    };

    // Métodos de pagamento
    const paymentMethods = {
        pix: { name: "PIX", discount: 0.05, icon: "fa-qrcode" },
        creditCard: { name: "Cartão de Crédito", discount: 0, icon: "fa-credit-card" },
        debitCard: { name: "Cartão de Débito", discount: 0, icon: "fa-credit-card" }
    };

    // Inicialização do carrinho
    function initCart() {
        updateHeaderCartCount();
        addEventListeners();
        loadCart();
        
        // Verifica se deve abrir o carrinho automaticamente
        if (localStorage.getItem('shouldOpenCart') === 'true') {
            openCartModal();
            localStorage.removeItem('shouldOpenCart');
        }
    }

    // Adiciona todos os event listeners
    function addEventListeners() {
        // Botões de adicionar ao carrinho
        addToCartButtons.forEach(button => {
            button.addEventListener('click', function() {
                const productCard = this.closest('.product-card');
                const product = {
                    id: productCard.dataset.id || Date.now().toString(),
                    name: productCard.querySelector('h3').textContent,
                    description: productCard.querySelector('.product-description')?.textContent || '',
                    price: parseFloat(productCard.querySelector('.price').textContent.replace('R$', '').replace(',', '.').trim()),
                    image: productCard.querySelector('.product-img').src || './assets/image/default-product.jpg',
                    size: productCard.querySelector('.size-selector')?.value
                };
                
                if (addToCart(product)) {
                    // Feedback visual
                    this.textContent = '✓ Adicionado';
                    this.disabled = true;
                    
                    setTimeout(() => {
                        this.textContent = 'Adicionar';
                        this.disabled = false;
                    }, 1500);
                    
                    // Efeito no card
                    productCard.classList.add('added-to-cart');
                    setTimeout(() => {
                        productCard.classList.remove('added-to-cart');
                    }, 1000);
                }
            });
        });

        // Botões do carrinho
        headerCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openCartModal();
        });

        if (floatingCartBtn) {
            floatingCartBtn.addEventListener('click', openCartModal);
        }

        // Fechar modal
        document.querySelector('.cart-modal-close').addEventListener('click', closeCartModal);

        // Aplicar cupom
        document.getElementById('applyCoupon').addEventListener('click', applyCoupon);

        // Opções de entrega/retirada
        document.querySelectorAll('input[name="deliveryOption"]').forEach(radio => {
            radio.addEventListener('change', updateDeliveryOption);
        });

        // Métodos de pagamento
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', updatePaymentMethod);
        });

        // Finalizar compra
        document.getElementById('checkoutBtn').addEventListener('click', startCheckout);
    }

    // Funções do carrinho
    function openCartModal() {
        cartModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        updateCartDisplay();
        setMinimumDeliveryDate();
    }

    function closeCartModal() {
        cartModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    function loadCart() {
        const savedCart = localStorage.getItem('kideliCart');
        if (savedCart) {
            try {
                cartItems = JSON.parse(savedCart);
                cartItemsCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
                updateCartUI();
            } catch (e) {
                console.error("Erro ao carregar carrinho:", e);
                localStorage.removeItem('kideliCart');
                cartItems = [];
                cartItemsCount = 0;
            }
        }
    }

    function saveCart() {
        localStorage.setItem('kideliCart', JSON.stringify(cartItems));
    }

    function addToCart(product) {
        // Verifica se o produto já está no carrinho (comparando id e tamanho)
        const existingItem = cartItems.find(item => 
            item.id === product.id && 
            (!product.size || item.size === product.size)
        );
        
        if (existingItem) {
            existingItem.quantity += product.quantity || 1;
        } else {
            cartItems.push({
                ...product,
                quantity: product.quantity || 1
            });
        }
        
        saveCart();
        updateCartUI();
        return true;
    }

    function removeFromCart(itemId) {
        const itemIndex = cartItems.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return;

        const itemElement = document.querySelector(`.cart-item[data-id="${itemId}"]`);
        if (itemElement) {
            itemElement.classList.add('removing');
            setTimeout(() => {
                cartItems.splice(itemIndex, 1);
                updateCartUI();
                if (cartItems.length === 0) closeCartModal();
            }, 300);
        } else {
            cartItems.splice(itemIndex, 1);
            updateCartUI();
        }
    }

    function updateCartDisplay() {
        cartItemsContainer.innerHTML = '';
        
        if (cartItems.length === 0) {
            emptyCartMessage.style.display = 'block';
        } else {
            emptyCartMessage.style.display = 'none';
            
            cartItems.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.setAttribute('data-id', item.id);
                itemElement.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <h3 class="cart-item-title">${item.name}</h3>
                        ${item.size ? `<p class="cart-item-size">Tamanho: ${item.size}</p>` : ''}
                        <div class="cart-item-quantity-controls">
                            <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-btn increase" data-id="${item.id}">+</button>
                        </div>
                    </div>
                    <div class="cart-item-price">${formatPrice(item.price * item.quantity)}</div>
                    <button class="cart-item-remove" data-id="${item.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;
                cartItemsContainer.appendChild(itemElement);
            });

            // Adiciona eventos aos novos elementos
            document.querySelectorAll('.quantity-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const itemId = this.getAttribute('data-id');
                    const item = cartItems.find(item => item.id === itemId);
                    if (!item) return;

                    if (this.classList.contains('increase')) {
                        item.quantity += 1;
                    } else if (this.classList.contains('decrease') && item.quantity > 1) {
                        item.quantity -= 1;
                    }
                    
                    saveCart();
                    updateCartUI();
                });
            });

            document.querySelectorAll('.cart-item-remove').forEach(btn => {
                btn.addEventListener('click', function() {
                    removeFromCart(this.getAttribute('data-id'));
                });
            });
        }
        
        updateCartSummary();
    }

    function updateCartSummary() {
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discount = appliedCoupon ? appliedCoupon.discount * subtotal : 0;
        
        // Verifica se tem frete grátis pelo cupom
        const delivery = (appliedCoupon?.freeDelivery || !document.getElementById('delivery').checked) 
            ? 0 
            : deliveryFee;
        
        // Calcula desconto do método de pagamento
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'creditCard';
        const paymentDiscount = paymentMethods[paymentMethod].discount * subtotal;
        
        const total = subtotal - discount - paymentDiscount + delivery;
        
        // Atualiza a exibição
        document.getElementById('cartSubtotal').textContent = formatPrice(subtotal);
        document.getElementById('cartDiscount').textContent = formatPrice(discount);
        document.getElementById('paymentDiscount').textContent = formatPrice(paymentDiscount);
        document.getElementById('deliveryFee').textContent = formatPrice(delivery);
        document.getElementById('cartTotal').textContent = formatPrice(total);
        
        // Atualiza parcelamento se for cartão de crédito
        if (paymentMethod === 'creditCard') {
            updateInstallments(total);
        }
    }

    function updateInstallments(total) {
        const installmentsSelect = document.getElementById('cardInstallments');
        installmentsSelect.innerHTML = '';
        
        const maxInstallments = 12;
        const minInstallmentValue = 50; // Valor mínimo por parcela
        
        const possibleInstallments = Math.min(
            maxInstallments,
            Math.floor(total / minInstallmentValue)
        );
        
        for (let i = 1; i <= possibleInstallments; i++) {
            const installmentValue = total / i;
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}x de ${formatPrice(installmentValue)}`;
            installmentsSelect.appendChild(option);
        }
    }

    function updateCartUI() {
        updateCartDisplay();
        updateHeaderCartCount();
        
        // Atualiza o botão flutuante
        if (floatingCartBtn) {
            if (cartItems.length > 0) {
                floatingCartBtn.classList.add('visible');
            } else {
                floatingCartBtn.classList.remove('visible');
            }
        }
    }

    function updateHeaderCartCount() {
        cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = cartItemsCount;
        });
    }

    function formatPrice(price) {
        return 'R$ ' + price.toFixed(2).replace('.', ',');
    }

    function setMinimumDeliveryDate() {
        const today = new Date();
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 2);
        
        const formattedDate = minDate.toISOString().split('T')[0];
        document.getElementById('deliveryDate').min = formattedDate;
        document.getElementById('pickupDate').min = formattedDate;
    }

    function applyCoupon() {
        const couponCode = document.getElementById('coupon').value.trim();
        const couponMessage = document.getElementById('couponMessage');
        
        if (validCoupons[couponCode]) {
            appliedCoupon = validCoupons[couponCode];
            couponMessage.textContent = `Cupom aplicado: ${appliedCoupon.description}`;
            couponMessage.className = 'coupon-message valid';
        } else {
            appliedCoupon = null;
            couponMessage.textContent = 'Cupom inválido';
            couponMessage.className = 'coupon-message invalid';
        }
        
        updateCartSummary();
    }

    function updateDeliveryOption() {
        document.getElementById('deliveryDetails').style.display = 
            this.value === 'delivery' ? 'block' : 'none';
        document.getElementById('pickupDetails').style.display = 
            this.value === 'pickup' ? 'block' : 'none';
        updateCartSummary();
    }

    function updatePaymentMethod() {
        document.getElementById('cardForm').style.display = 
            (this.value === 'creditCard' || this.value === 'debitCard') ? 'block' : 'none';
        updateCartSummary();
    }

    function startCheckout() {
        if (cartItems.length === 0) {
            alert('Seu carrinho está vazio!');
            return;
        }

        // Prepara os dados do pedido
        const orderData = {
            items: cartItems,
            subtotal: parseFloat(document.getElementById('cartSubtotal').textContent.replace('R$', '').replace(',', '.')),
            discount: parseFloat(document.getElementById('cartDiscount').textContent.replace('R$', '').replace(',', '.')),
            delivery: parseFloat(document.getElementById('deliveryFee').textContent.replace('R$', '').replace(',', '.')),
            total: parseFloat(document.getElementById('cartTotal').textContent.replace('R$', '').replace(',', '.')),
            paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
            deliveryOption: document.querySelector('input[name="deliveryOption"]:checked').value
        };

        // Aqui você implementaria a integração com o gateway de pagamento
        console.log('Iniciando checkout:', orderData);
        // mercadoPagoCheckout.open({
        //     items: cartItems.map(item => ({
        //         title: item.name,
        //         quantity: item.quantity,
        //         currency_id: 'BRL',
        //         unit_price: item.price
        //     }))
        // });
    }

    // Inicializa o carrinho
    initCart();

    // Fechar o carrinho ao clicar fora
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.cart-modal-content') && !e.target.closest('.cart-btn') && !e.target.closest('#floatingCartBtn')) {
            closeCartModal();
        }
    });
});