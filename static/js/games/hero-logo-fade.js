/**
 * Gestion du fondu du logo Hero au scroll
 */
document.addEventListener('DOMContentLoaded', () => {
    const heroLogo = document.getElementById('img-wrapper');
    const heroSpacer = document.getElementById('hero-spacer');

    if (heroLogo && heroSpacer) {
        window.addEventListener('scroll', () => {
            if (!heroLogo.classList.contains('deposited')) return;
            
            // Désactive la transition CSS pour que le scroll soit instantané et fluide
            heroLogo.style.transition = 'none';

            const scrollPos = window.scrollY;
            const spacerHeight = heroSpacer.offsetHeight;

            let opacity = 1 - (scrollPos / (spacerHeight * 0.8));

            if (opacity < 0) opacity = 0;
            if (opacity > 1) opacity = 1;

            heroLogo.style.opacity = opacity;

            const scale = 1 - (scrollPos / (spacerHeight * 5));
            heroLogo.style.transform = `translate(-50%, -50%) scale(${scale > 0.8 ? scale : 0.8})`;
        });
    }
});