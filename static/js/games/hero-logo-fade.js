/**
 * Gestion du fondu du logo Hero au scroll
 */
document.addEventListener('DOMContentLoaded', () => {
    const heroLogo = document.getElementById('hero-logo');
    const heroSpacer = document.getElementById('hero-spacer');

    if (heroLogo && heroSpacer) {
        window.addEventListener('scroll', () => {
            const scrollPos = window.scrollY;
            const spacerHeight = heroSpacer.offsetHeight;
            
            // Calcule l'opacité (1 au top, 0 à la fin du spacer)
            // On accélère un peu le fondu (multiplié par 1.2)
            let opacity = 1 - (scrollPos / (spacerHeight * 0.8));
            
            // Clamp les valeurs entre 0 et 1
            if (opacity < 0) opacity = 0;
            if (opacity > 1) opacity = 1;

            heroLogo.style.opacity = opacity;
            
            // Optionnel : un léger zoom arrière pendant le fondu pour l'effet "cinématique"
            const scale = 1 - (scrollPos / (spacerHeight * 5));
            heroLogo.style.transform = `translate(-50%, -50%) scale(${scale > 0.8 ? scale : 0.8})`;
        });
    }
});