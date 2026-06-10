// Art Universe - Advanced Typewriter Effect (Improved Space Handling)
const texte    = (typeof dynamicArtText !== 'undefined') ? dynamicArtText : "Contenu en cours\nde conception...";
const balise   = document.getElementById("typewriter");
let index      = 0;

// Vitesse de base par type de caractère
function delai(lettre) {
    if (lettre === '.')  return 180 + Math.random() * 80;  // pause sur les points
    if (lettre === ',')  return 150 + Math.random() * 60;
    if (lettre === ' ')  return 60  + Math.random() * 40;
    if (lettre === '\n') return 400; // Pause plus longue sur le retour à la ligne
    // Légère variation aléatoire sur les lettres normales
    return 80 + Math.random() * 60;
}

function ecrire() {
    if (!balise) return;

    if (index >= texte.length) {
        // Écriture terminée → curseur disparaît doucement
        balise.classList.add('done');
        return;
    }

    const lettre = texte.charAt(index);

    if (lettre === '\n') {
        // Gestion du retour à la ligne forcé
        const br = document.createElement('br');
        balise.appendChild(br);
    } else {
        const span = document.createElement('span');
        span.className = 'lettre-flash';

        if (lettre === ' ') {
            // Espace explicite — assure que word-spacing CSS est respecté
            span.innerHTML = '&nbsp;';
            span.style.display = 'inline';
        } else {
            span.textContent = lettre;
        }
        balise.appendChild(span);
    }

    index++;
    setTimeout(ecrire, delai(lettre));
}

// Initialisation au chargement
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(ecrire, 400);
});
