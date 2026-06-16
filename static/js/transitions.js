/**
 * ══════════════════════════════════════════
 * UNIFIED TRANSITION ENGINE
 * Handles: Art (Circle), GameDev (Panels), Cyber (CRT)
 * ══════════════════════════════════════════
 */

// On expose les fonctions globalement au cas où d'autres scripts en auraient besoin
window.TransitionEngine = (function() {
    
    // On attend que le DOM soit prêt pour récupérer les éléments
    let gdVeil, artCircle, cyberVeil;

    function initElements() {
        gdVeil = document.getElementById('gd-transition');
        artCircle = document.getElementById('art-transition-circle');
        cyberVeil = document.getElementById('cyber-transition-overlay');
    }
/**
 * Révèle la page lors du chargement ou du retour (pageshow)
 */
function revealPage() {
    if (!artCircle) initElements();
    if (!artCircle) return;

    console.log("TransitionEngine: revealPage triggered");

    // 1. Retour d'Art
    if (sessionStorage.getItem('fromArt')) {
        console.log("TransitionEngine: playing Art Reveal");
        if (artCircle) {
// ... rest of logic

                artCircle.classList.add('active'); 
                artCircle.style.opacity = '1';
                setTimeout(() => {
                    artCircle.style.transition = 'transform 1.2s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.8s ease';
                    artCircle.style.opacity = '0';
                    artCircle.classList.remove('active');
                    setTimeout(() => {
                        artCircle.style.opacity = '';
                        artCircle.style.transition = '';
                        sessionStorage.removeItem('fromArt');
                    }, 1200);
                }, 50);
            }
        } 
        // 2. Retour de GameDev
        else if (sessionStorage.getItem('fromGameDev')) {
            if (gdVeil) {
                gdVeil.style.visibility = 'visible';
                gdVeil.classList.add('gd-transition-active');
                
                setTimeout(() => {
                    const loader = gdVeil.querySelector('.gd-loader');
                    if(loader) loader.style.opacity = '0';
                    setTimeout(() => {
                        gdVeil.classList.remove('gd-transition-active');
                        gdVeil.classList.add('gd-transition-opening');
                        setTimeout(() => {
                            gdVeil.style.visibility = 'hidden';
                            gdVeil.classList.remove('gd-transition-opening');
                            sessionStorage.removeItem('fromGameDev');
                        }, 700);
                    }, 300);
                }, 100);
            }
        }
        // 3. Retour de Cyber
        else if (sessionStorage.getItem('fromCyber')) {
            if (cyberVeil) {
                cyberVeil.classList.add('cyber-reveal');
                setTimeout(() => {
                    cyberVeil.classList.remove('cyber-reveal');
                    sessionStorage.removeItem('fromCyber');
                }, 800);
            }
        }
    }

    /**
     * Couvre la page avant la navigation
     */
    function coverPage(href, triggerEl = null) {
        if (!artCircle) initElements();

        // 🎯 TRANSITION ART
        if (href.includes('/projet/art')) {
            sessionStorage.setItem('fromArt', 'true');
            if (artCircle && triggerEl) {
                const rect = triggerEl.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                artCircle.style.left = centerX + 'px';
                artCircle.style.top = centerY + 'px';
            }
            if (artCircle) artCircle.classList.add('active');
            setTimeout(() => { window.location.href = href; }, 1000);
        }
        // 🎯 TRANSITION GAMEDEV
        else if (href.includes('/projet/games') || href.includes('/projet/gamedev')) {
            sessionStorage.setItem('fromGameDev', 'true');
            if (gdVeil) {
                gdVeil.style.visibility = 'visible';
                gdVeil.classList.add('gd-transition-active');
            }
            setTimeout(() => { window.location.href = href; }, 1300);
        }
        // 🎯 TRANSITION CYBER
        else if (href.includes('/projet/cyber')) {
            sessionStorage.setItem('fromCyber', 'true');
            if (cyberVeil) {
                cyberVeil.classList.add('cyber-cover');
            }
            setTimeout(() => { window.location.href = href; }, 850);
        }
        // 🎯 AUCUNE TRANSITION (DISSOLUTION DE LA STANDARD)
        else {
            window.location.href = href;
        }
    }

    // Écouteur de clics
    document.addEventListener('click', function(e) {
        const target = e.target.closest('a, .seg');
        if (!target) return;

        const href = target.getAttribute('href') || (target.classList.contains('seg-art') ? '/projet/art' : null);
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || target.getAttribute('target') === '_blank') return;

        try {
            const targetUrl = new URL(href, window.location.origin);
            if (targetUrl.hostname !== window.location.hostname) return;

            e.preventDefault();
            coverPage(targetUrl.href, target);
        } catch (err) {}
    });

    // Initialisation immédiate et sur les événements système
    window.addEventListener('pageshow', revealPage);
    
    // Si le DOM est déjà chargé, on lance revealPage
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        revealPage();
    } else {
        window.addEventListener('DOMContentLoaded', revealPage);
    }

    return { revealPage, coverPage };
})();
