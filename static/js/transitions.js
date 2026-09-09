/**
 * ══════════════════════════════════════════
 * TRANSITION ENGINE
 * Art uniquement — cercle expand/reverse depuis point de clic
 * GameDev et Cyber → navigation directe
 * ══════════════════════════════════════════
 */

window.TransitionEngine = (function () {

    let artCircle;

    function init() {
        artCircle = document.getElementById('art-transition-circle');
    }

    function calcScale(ox, oy) {
        const dx = Math.max(ox, window.innerWidth  - ox);
        const dy = Math.max(oy, window.innerHeight - oy);
        return Math.ceil(Math.sqrt(dx * dx + dy * dy) / 2 * 1.2);
    }

    /* ─────────────────────────────────────
       ART — COVER
    ───────────────────────────────────── */
    function artCover(href, originEl, color) {
        if (!artCircle) { window.location.href = href; return; }

        let ox, oy;
        if (originEl) {
            const r = originEl.getBoundingClientRect();
            ox = Math.round(r.left + r.width  / 2);
            oy = Math.round(r.top  + r.height / 2);
        } else {
            ox = Math.round(window.innerWidth  / 2);
            oy = Math.round(window.innerHeight / 2);
        }

        sessionStorage.setItem('artTransition', JSON.stringify({ x: ox, y: oy, color }));

        const scale = calcScale(ox, oy);

        artCircle.style.transition    = 'none';
        artCircle.style.left          = ox + 'px';
        artCircle.style.top           = oy + 'px';
        artCircle.style.background    = color;
        artCircle.style.transform     = 'translate(-50%, -50%) scale(0)';
        artCircle.style.opacity       = '1';
        artCircle.style.pointerEvents = 'all';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                artCircle.style.transition = 'transform 0.9s cubic-bezier(0.77, 0, 0.175, 1)';
                artCircle.style.transform  = `translate(-50%, -50%) scale(${scale})`;
                setTimeout(() => { window.location.href = href; }, 880);
            });
        });
    }

    /* ─────────────────────────────────────
       ART — REVEAL
    ───────────────────────────────────── */
    function artReveal() {
        if (!artCircle) return;

        const raw    = sessionStorage.getItem('artTransition');
        sessionStorage.removeItem('artTransition');
        const origin = raw ? JSON.parse(raw) : null;

        const ox    = origin ? origin.x     : Math.round(window.innerWidth  / 2);
        const oy    = origin ? origin.y     : Math.round(window.innerHeight / 2);
        const color = origin ? origin.color : '#ffffff';
        const scale = calcScale(ox, oy);

        artCircle.style.transition    = 'none';
        artCircle.style.left          = ox + 'px';
        artCircle.style.top           = oy + 'px';
        artCircle.style.background    = color;
        artCircle.style.transform     = `translate(-50%, -50%) scale(${scale})`;
        artCircle.style.opacity       = '1';
        artCircle.style.pointerEvents = 'none';

        void artCircle.getBoundingClientRect();

        document.documentElement.style.visibility = '';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                artCircle.style.transition = 'transform 0.9s cubic-bezier(0.23, 1, 0.32, 1)';
                artCircle.style.transform  = 'translate(-50%, -50%) scale(0)';
                setTimeout(() => {
                    artCircle.style.cssText = '';
                    dispatchDone();
                }, 950);
            });
        });
    }

    /* ─────────────────────────────────────
       Signal fin de transition
    ───────────────────────────────────── */
    function dispatchDone() {
        window.TRANSITION_ACTIVE = false;
        window.dispatchEvent(new CustomEvent('transitionDone'));
    }

    /* ─────────────────────────────────────
       REVEAL — au chargement de la page
    ───────────────────────────────────── */
    function revealPage() {
        init();
        if (sessionStorage.getItem('artTransition')) {
            artReveal();
        }
        // GameDev et Cyber : pas de transition, juste s'assurer que la page est visible
        // (au cas où un résidu de sessionStorage traînerait)
        sessionStorage.removeItem('fromGameDev');
        sessionStorage.removeItem('gdLoading');
        sessionStorage.removeItem('fromCyber');
    }

    /* ─────────────────────────────────────
       COVER — au clic
    ───────────────────────────────────── */
    function coverPage(href, triggerEl) {
        init();

        // Accueil → Art
        if (href.includes('/projet/art')) {
            artCover(href, triggerEl, '#ffffff');
        }
        // Art → Accueil
        else if (
            document.body.classList.contains('universe-art') &&
            (href === window.location.origin + '/' || href.endsWith('/'))
        ) {
            artCover(href, triggerEl, '#000000');
        }
        // Tout le reste → navigation directe
        else {
            window.location.href = href;
        }
    }

    /* ─────────────────────────────────────
       Écouteur de clics global
    ───────────────────────────────────── */
    document.addEventListener('click', function (e) {
        const target = e.target.closest('a, .seg');
        if (!target) return;

        const href = target.getAttribute('href');
        if (!href) return;
        if (
            href.startsWith('#')       ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:')    ||
            target.getAttribute('target') === '_blank'
        ) return;

        try {
            const url = new URL(href, window.location.origin);
            if (url.hostname !== window.location.hostname) return;
            e.preventDefault();
            coverPage(url.href, target);
        } catch (_) {}
    });

    /* ─────────────────────────────────────
       Démarrage
    ───────────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', revealPage);
    } else {
        revealPage();
    }

    window.addEventListener('pageshow', function (e) {
        if (e.persisted) revealPage();
    });

    return { revealPage, coverPage };

})();
