/* ══════════════════════════════════════════
   CUSTOM CURSOR
   ══════════════════════════════════════════ */(function() {
  const cur = document.getElementById('cur');
  if (!cur) return;

  let mouseX = 0, mouseY = 0;
  let curX = 0, curY = 0;

  // Suivi et apparition
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cur.classList.add('active');
  });

  // Animation fluide (Lag technique)
  function animate() {
    curX += (mouseX - curX) * 0.15;
    curY += (mouseY - curY) * 0.15;
    cur.style.left = curX + 'px';
    cur.style.top  = curY + 'px';
    requestAnimationFrame(animate);
  }
  animate();

  // Survol dynamique (Délégation d'événements pour une réactivité totale)
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, .seg, .ic, button, .bio-link')) {
      cur.classList.add('hovered');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('a, .seg, .ic, button, .bio-link')) {
      cur.classList.remove('hovered');
    }
  });

  // Clic
  document.addEventListener('mousedown', () => cur.classList.add('clicked'));
  document.addEventListener('mouseup',   () => cur.classList.remove('clicked'));
})();

/* ══════════════════════════════════════════
   TYPEWRITER BIO
══════════════════════════════════════════ */
(function() {
  const el = document.getElementById('bio');
  if (!el) return;

  const text = "Etudiant en cyberSecurité a HECM\n[ CyberSec // GameDev // Artiste ]\n\nEn vrai j'ai trop cherché une phrase d'accroche mais bon Je balance juste ce qui me passe par la tête\nBref je suis Polymathe\nEt j'aime la perfection\nLe reste à vous de le découvrir...";
  const cursor = el.querySelector('.bio-cursor');
  let i = 0;

  function tick() {
    if (i < text.length) {
      el.insertBefore(document.createTextNode(text[i]), cursor);
      i++;
      const ch = text[i - 1];
      const delay = ch === '\n' ? 400 : (ch === '.' || ch === '—') ? 200 : 40;
      setTimeout(tick, delay);
    } else {
      // Une fois le typewriter terminé : injection des liens
      setTimeout(() => {
        el.innerHTML = el.innerHTML
          .replace(
            'HECM',
            '<a href="https://www.hecm-elearning.net" target="_blank" class="bio-link">HECM</a>'
          )
          .replace(
            'Polymathe',
            '<a href="https://www.google.com/search?q=polymathe+definition" target="_blank" class="bio-link">Polymathe</a>'
          );
      }, 500);
    }
  }
  setTimeout(tick, 1000);
})();

/* ══════════════════════════════════════════
   HUD ANNOTATIONS (DYNAMIC)
══════════════════════════════════════════ */
(function() {
  const segments = document.querySelectorAll('.seg');
  
  segments.forEach(segEl => {
    const targetId = segEl.getAttribute('data-target');
    const annEl    = document.getElementById(targetId);
    if (!annEl) return;

    let timer;
    const show = () => { clearTimeout(timer); annEl.classList.add('vis'); };
    const hide = () => { timer = setTimeout(() => annEl.classList.remove('vis'), 130); };

    segEl.addEventListener('mouseenter', show);
    segEl.addEventListener('mouseleave', hide);
    annEl.addEventListener('mouseenter', show);
    annEl.addEventListener('mouseleave', hide);
  });
})();

/* ══ NAVBAR GLITCH ══ */
(function() {
  const el = document.querySelector('.nav-glitch');
  if (!el) return;

  function triggerGlitch() {
    el.classList.remove('glitch-active');
    // Force reflow pour relancer l'animation
    void el.offsetWidth;
    el.classList.add('glitch-active');
    setTimeout(() => el.classList.remove('glitch-active'), 450);
  }

  // Toutes les 5 secondes
  setInterval(triggerGlitch, 5000);
  setTimeout(triggerGlitch, 800);
})();

/* ══ DYNAMIC NAV HEIGHT ══ */
(function() {
  const nav = document.getElementById('navbar');
  const root = document.documentElement;

  function syncHeight() {
    if (!nav) return;
    const height = nav.offsetHeight;
    root.style.setProperty('--nav-height', height + 'px');
  }

  window.addEventListener('resize', syncHeight);
  window.addEventListener('load', syncHeight);
  // Exécuter immédiatement
  syncHeight();
})();

/* ══════════════════════════════════════════
   SCROLL REVEAL SYSTEM (PERSISTENT)
══════════════════════════════════════════ */
(function() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      } else {
        // Supprime la classe pour rejouer l'animation quand on revient
        entry.target.classList.remove('is-visible');
      }
    });
  }, observerOptions);

  // Éléments à observer (Intro, Orb, Social)
  document.querySelectorAll('.orb-intro, .orb-section, .social-section').forEach(el => {
    observer.observe(el);
  });

  // Effet de parallaxe plus dynamique
  window.addEventListener('scroll', () => {
    const orb = document.querySelector('.ring');
    const nav = document.getElementById('navbar');
    const scrolled = window.pageYOffset;

    if (orb) {
      // Parallaxe simple sans rotation
      orb.style.transform = `translateY(${scrolled * 0.15}px)`;
    }

    if (nav) {
      if (scrolled > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
  });
})();

/* ══════════════════════════════════════════
   LIQUID TEXT EFFECT (TRAILING SILLAGE)
══════════════════════════════════════════ */
(function() {
  const el = document.querySelector('.intro-text');
  if (!el) return;

  let mouseX = 0, mouseY = 0; // Position réelle souris
  let pX = 0, pY = 0; // Point primaire (suivi fluide)
  let sX = 0, sY = 0; // Point secondaire (sillage / lag)
  
  let currentS = 0, targetS = 0;
  let timer;

  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // Calcul de la vitesse pour la taille de la vague
    const speed = Math.sqrt(Math.pow(e.movementX, 2) + Math.pow(e.movementY, 2));
    targetS = Math.min(180, 50 + speed * 3);

    clearTimeout(timer);
    timer = setTimeout(() => {
      targetS = 0;
    }, 100);
  });

  el.addEventListener('mouseleave', () => {
    targetS = 0;
  });

  function animate() {
    // Le point primaire suit la souris avec un peu de lissage
    pX += (mouseX - pX) * 0.2;
    pY += (mouseY - pY) * 0.2;

    // Le point secondaire (le sillage) suit le point primaire avec plus de retard
    sX += (pX - sX) * 0.12;
    sY += (pY - sY) * 0.12;

    // Lissage de la taille de la vague
    currentS += (targetS - currentS) * 0.1;

    // Mise à jour des variables CSS
    el.style.setProperty('--x1', `${pX}px`);
    el.style.setProperty('--y1', `${pY}px`);
    el.style.setProperty('--x2', `${sX}px`);
    el.style.setProperty('--y2', `${sY}px`);
    el.style.setProperty('--s', `${currentS}px`);

    requestAnimationFrame(animate);
  }
  animate();
})();

/* ══ HUD WAVE TYPEWRITER ══ */
(function() {

  // Stocke le texte original
  document.querySelectorAll('.hud-titre, .hud-desc').forEach(el => {
    el.dataset.text = el.textContent.trim();
    el.textContent = '';
  });

  // Prépare le SVG pour l'animation de tracé
  document.querySelectorAll('.hud-svg .hud-line').forEach(line => {
    const length = line.getTotalLength ? line.getTotalLength() : 300;
    line.style.strokeDasharray  = length;
    line.style.strokeDashoffset = length;
    line.style.transition = 'none';
  });

  function animateLine(ann) {
    const line = ann.querySelector('.hud-line');
    if (!line) return;
    const length = line.getTotalLength ? line.getTotalLength() : 300;
    line.style.strokeDasharray  = length;
    line.style.strokeDashoffset = length;
    // Force reflow
    void line.getBoundingClientRect();
    line.style.transition = 'stroke-dashoffset 0.3s ease';
    line.style.strokeDashoffset = '0';
  }

  function animateWave(el, delay) {
    const text = el.dataset.text || '';
    el.innerHTML = '';
    text.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.opacity = '0';
      span.style.transition = `opacity 0.15s ease ${delay + i * 0.03}s`;
      el.appendChild(span);
    });
    // Déclenche la vague
    requestAnimationFrame(() => {
      el.querySelectorAll('span').forEach(s => s.style.opacity = '1');
    });
  }

  document.querySelectorAll('.seg').forEach(seg => {
    seg.addEventListener('mouseenter', () => {
      const targetId = seg.getAttribute('data-target');
      const ann = document.getElementById(targetId);
      if (!ann) return;

      animateLine(ann);

      const titre = ann.querySelector('.hud-titre');
      const desc  = ann.querySelector('.hud-desc');

      if (titre) animateWave(titre, 0.1);
      if (desc)  animateWave(desc, 0.25);
    });
  });

})();

/* ══════════════════════════════════════════
   3D TILT EFFECT (PROFIL)
══════════════════════════════════════════ */
(function() {
  const cadre = document.querySelector('.cadre-3d');
  if (!cadre) return;

  const container = cadre.closest('.container-3d');

  container.addEventListener('mousemove', (e) => {
    const rect = cadre.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (mouseY / rect.height) * 15;
    const rotateY = (mouseX / rect.width) * -15;

    cadre.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  });

  container.addEventListener('mouseleave', () => {
    cadre.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
  });

  container.addEventListener('mouseenter', () => {
    cadre.style.transition = 'transform 0.1s ease-out';
  });
})();

