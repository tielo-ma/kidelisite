// Menu Hamburguer
document.getElementById('hamburger').addEventListener('click', function() {
    document.getElementById('navLinks').classList.toggle('active');
});

// Swiper (Slideshow)
const swiper = new Swiper('.swiper-container', {
    loop: true,
    autoplay: {
        delay: 5000,
    },
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    },
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },
});

// Animações (AOS - Animate On Scroll)
AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true,
});