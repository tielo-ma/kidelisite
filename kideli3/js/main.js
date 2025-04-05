// Menu Mobile (para telas pequenas)
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.createElement('div');
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    document.querySelector('.header .container').appendChild(menuToggle);

    menuToggle.addEventListener('click', function() {
        document.querySelector('.menu').classList.toggle('active');
    });

    // Carrinho (exemplo simplificado)
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const cartCount = document.querySelector('.cart-count');
    let count = 0;

    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            count++;
            cartCount.textContent = count;
            // Adicionaria lógica de carrinho real aqui
        });
    });
});