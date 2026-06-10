// ══════════════════════════════════════════════════════════
//  CUSTOM BRUSH CURSOR MODULE - CODE ISOLÉ
//  Module autonome - À importer dans votre projet
// ══════════════════════════════════════════════════════════

const BrushCursor = (() => {
    'use strict';

    // ─────────────────────────────────────────────────────
    // CONFIGURATION
    // ─────────────────────────────────────────────────────
    const CONFIG = {
        // Dimensions et positionnement
        size: 106,                        // Taille du curseur en px
        tipX: 26,                         // Position X de la pointe
        tipY: 100,                        // Position Y de la pointe

        // Suivi et lissage
        smoothing: 0.18,                  // Fluidité du suivi (0-1)
        lerpClick: 0.25,                  // Vitesse des transitions au clic
        maxDeltaTime: 8,                  // Max deltaTime en frames

        // Effet SKEW (gauche-droite)
        maxSkew: 8,                       // Amplitude max du skew en degrés
        skewSmoothing: 0.20,              // Fluidité du skew

        // OSCILLATION
        oscillationMaxAmplitude: 6,       // Amplitude max de l'ondulation (px)
        oscillationSpeed: 0.08,           // Vitesse de l'oscillation
        velocityMultiplier: 0.05,         // Amplitude = vélocité × cette valeur
        velocityThreshold: 0.08,          // Seuil pour détecter le mouvement
        oscillationDecay: 0.92,           // Ralentissement à l'arrêt (0-1)

        // Échelle et rotation
        scale: { 
            normal: 1.00,                 // Échelle normale
            pressed: 0.82                 // Échelle au clic
        },
        tilt: { 
            normal: 0.0,                  // Rotation normale
            pressed: -6.0                 // Rotation au clic
        },

        // Particules au clic
        splashParticles: { 
            min: 6, 
            max: 10 
        },
        splashSize: { 
            min: 3, 
            max: 12 
        },
        splashDistance: 70                // Distance de dispersion des particules
    };

    // ─────────────────────────────────────────────────────
    // ÉTAT INTERNE
    // ─────────────────────────────────────────────────────
    const state = {
        mouseX: -400,
        mouseY: -400,
        cursorX: -400,
        cursorY: -400,
        prevX: -400,
        prevY: -400,
        lastTime: performance.now(),
        isReady: false,
        isPressed: false,
        curScale: CONFIG.scale.normal,
        curTilt: CONFIG.tilt.normal,
        curSkew: 0,
        velocity: 0,
        oscillationTime: 0,
        oscillationAmplitude: 0
    };

    // ─────────────────────────────────────────────────────
    // ÉLÉMENTS DOM
    // ─────────────────────────────────────────────────────
    const elements = {
        cursor: null,
        img: null,
        debugDot: null
    };

    const isDebugMode = location.search.includes('debug');

    // ─────────────────────────────────────────────────────
    // FONCTIONS PRIVÉES
    // ─────────────────────────────────────────────────────

    /**
     * Initialise les références aux éléments DOM
     */
    const initElements = () => {
        elements.cursor = document.getElementById('pinceau');
        elements.img = document.getElementById('img-pinceau');
        elements.debugDot = document.getElementById('debug-dot');

        if (!elements.cursor || !elements.img) {
            console.error('BrushCursor: Éléments DOM manquants (#pinceau ou #img-pinceau)');
            return false;
        }

        if (isDebugMode) {
            elements.debugDot.style.display = 'block';
        }

        return true;
    };

    /**
     * Gestionnaire de mouvement souris
     */
    const onMouseMove = (e) => {
        if (!state.isReady) {
            state.cursorX = state.prevX = e.clientX;
            state.cursorY = state.prevY = e.clientY;
            state.isReady = true;
        }
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;

        if (isDebugMode && elements.debugDot) {
            elements.debugDot.style.left = e.clientX + 'px';
            elements.debugDot.style.top = e.clientY + 'px';
        }
    };

    /**
     * Gestionnaire de clic souris
     */
    const onMouseDown = (e) => {
        if (e.button === 0) {
            state.isPressed = true;
            createSplash(e.clientX, e.clientY);
        }
    };

    /**
     * Gestionnaire de relâchement souris
     */
    const onMouseUp = () => {
        state.isPressed = false;
    };

    /**
     * Gestionnaire de sortie de fenêtre
     */
    const onMouseLeave = () => {
        state.isPressed = false;
    };

    /**
     * Crée des particules au clic
     */
    const createSplash = (x, y) => {
        const particleCount = CONFIG.splashParticles.min + 
                             Math.floor(Math.random() * (CONFIG.splashParticles.max - CONFIG.splashParticles.min));

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            const size = CONFIG.splashSize.min + Math.random() * (CONFIG.splashSize.max - CONFIG.splashSize.min);
            const grayValue = Math.floor(Math.random() * 50);

            particle.className = 'particule';
            particle.style.cssText = `
                left: ${x}px;
                top: ${y}px;
                width: ${size}px;
                height: ${size}px;
                background: rgb(${grayValue}, ${grayValue}, ${grayValue});
                margin: ${-size / 2}px 0 0 ${-size / 2}px;
                --tx: ${(Math.random() - 0.5) * CONFIG.splashDistance}px;
                --ty: ${(Math.random() - 0.5) * CONFIG.splashDistance}px;
            `;

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 650);
        }
    };

    /**
     * Boucle d'animation principale - 60fps
     * Gère:
     * - Suivi fluide du curseur
     * - Calcul de la vélocité
     * - Oscillation basée sur la vitesse
     * - Effet skew (gauche-droite)
     * - Transformations (scale, rotation)
     */
    const updateCursor = (now) => {
        let deltaTime = (now - state.lastTime) / 16.667;
        state.lastTime = now;

        // Clamp deltaTime pour éviter les sauts d'animation
        if (deltaTime > CONFIG.maxDeltaTime) deltaTime = 1;

        // ─ SUIVI DU CURSEUR (exponential smoothing) ─
        const smoothFactor = 1 - Math.pow(1 - CONFIG.smoothing, deltaTime);
        state.cursorX += (state.mouseX - state.cursorX) * smoothFactor;
        state.cursorY += (state.mouseY - state.cursorY) * smoothFactor;

        // ─ CALCUL DU MOUVEMENT & VÉLOCITÉ ─
        const dx = state.cursorX - state.prevX;
        const dy = state.cursorY - state.prevY;
        const currentVelocity = Math.sqrt(dx * dx + dy * dy);
        
        // Lissage de la vélocité
        state.velocity += (currentVelocity - state.velocity) * 0.3;
        
        // ─ OSCILLATION BASÉE SUR LA VÉLOCITÉ ─
        // L'amplitude varie avec la vitesse du curseur
        const targetAmplitude = Math.min(
            state.velocity * CONFIG.velocityMultiplier,
            CONFIG.oscillationMaxAmplitude
        );
        state.oscillationAmplitude += (targetAmplitude - state.oscillationAmplitude) * 0.2;
        
        // Decay quand le curseur s'arrête
        if (state.velocity < CONFIG.velocityThreshold) {
            state.oscillationAmplitude *= CONFIG.oscillationDecay;
        }
        
        // Oscillation sinusoïdale dans le temps
        state.oscillationTime += CONFIG.oscillationSpeed * deltaTime;
        const oscillationY = Math.sin(state.oscillationTime) * state.oscillationAmplitude;
        const oscillationX = Math.cos(state.oscillationTime * 0.7) * (state.oscillationAmplitude * 0.6);
        
        // ─ EFFET SKEW (gauche-droite) ─
        const targetSkew = (dx / 2) * CONFIG.maxSkew;
        const skewFactor = 1 - Math.pow(1 - CONFIG.skewSmoothing, deltaTime);
        state.curSkew += (targetSkew - state.curSkew) * skewFactor;
        state.curSkew = Math.max(-CONFIG.maxSkew, Math.min(CONFIG.maxSkew, state.curSkew));

        // ─ MISE À JOUR DES PROPRIÉTÉS D'ÉCHELLE ─
        const targetScale = state.isPressed ? CONFIG.scale.pressed : CONFIG.scale.normal;
        const targetTilt = state.isPressed ? CONFIG.tilt.pressed : CONFIG.tilt.normal;

        state.curScale += (targetScale - state.curScale) * CONFIG.lerpClick;
        state.curTilt += (targetTilt - state.curTilt) * CONFIG.lerpClick;

        // ─ RENDU EN UNE SEULE MISE À JOUR ─
        // Transform du curseur (position + oscillation)
        const cursorTransform = `translate3d(${Math.round(state.cursorX - CONFIG.tipX + oscillationX)}px, ${Math.round(state.cursorY - CONFIG.tipY + oscillationY)}px, 0)`;
        elements.cursor.style.transform = cursorTransform;

        // Transform de l'image (scale + rotation + skew + oscillation rotatoire)
        const rotationOscillation = Math.sin(state.oscillationTime * 0.5) * 1.2;
        const imgTransform = `scale(${state.curScale.toFixed(3)}) rotate(${(state.curTilt + rotationOscillation).toFixed(1)}deg) skewY(${state.curSkew.toFixed(1)}deg)`;
        elements.img.style.transform = imgTransform;

        // Sauvegarde position précédente
        state.prevX = state.cursorX;
        state.prevY = state.cursorY;

        requestAnimationFrame(updateCursor);
    };

    // ─────────────────────────────────────────────────────
    // API PUBLIQUE
    // ─────────────────────────────────────────────────────

    /**
     * Initialise le curseur personnalisé
     * À appeler une seule fois au chargement
     */
    const init = () => {
        if (!initElements()) return false;

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('mouseleave', onMouseLeave);

        requestAnimationFrame(updateCursor);
        return true;
    };

    /**
     * Met à jour la configuration à la volée
     * @param {Object} newConfig - Objet avec les propriétés à modifier
     */
    const updateConfig = (newConfig) => {
        Object.assign(CONFIG, newConfig);
    };

    /**
     * Retourne la configuration actuelle
     */
    const getConfig = () => ({ ...CONFIG });

    /**
     * Retourne l'état actuel du curseur
     */
    const getState = () => ({ ...state });

    /**
     * Détruit le curseur et nettoie les événements
     */
    const destroy = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mouseleave', onMouseLeave);
    };

    // ─────────────────────────────────────────────────────
    // EXPORT
    // ─────────────────────────────────────────────────────
    return {
        init,
        updateConfig,
        getConfig,
        getState,
        destroy
    };
})();

// ══════════════════════════════════════════════════════════
// UTILISATION
// ══════════════════════════════════════════════════════════
/*

// 1. Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
    BrushCursor.init();
});

// 2. Modifier la configuration (optionnel)
BrushCursor.updateConfig({
    oscillationMaxAmplitude: 8,
    smoothing: 0.2,
    splashDistance: 100
});

// 3. Récupérer la configuration
const currentConfig = BrushCursor.getConfig();
console.log('Configuration:', currentConfig);

// 4. Récupérer l'état (debug)
const currentState = BrushCursor.getState();
console.log('État:', currentState);

// 5. Détruire (si besoin)
// BrushCursor.destroy();

*/
