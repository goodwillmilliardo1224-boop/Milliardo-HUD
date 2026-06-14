/**
 * Gestion de la galerie d'inspirations (Version avec Trailers)
 */
(function() {
    const dataInspirations = [
        {
            title: "Hollow Knight",
            studio: "Team Cherry",
            genre: "Metroidvania",
            desc: "La référence absolue en termes d'<b>exploration</b>. Un Level Design organique et une atmosphère inégalée.",
            bg: "/static/img/hollowkniht.webp",
            trailer: "https://youtu.be/UAO2urG23S4"
        },
        {
            title: "Nine Sols",
            studio: "Red Candle Games",
            genre: "Metroidvania",
            desc: "Inspiration majeure pour le <b>Combat Design</b>. Système de parade 2D extrêmement précis.",
            bg: "/static/img/ninesols.webp",
            trailer: "https://youtu.be/_JQ_XO9Acuc"
        },
        {
            title: "HK: Silksong",
            studio: "Team Cherry",
            genre: "Metroidvania",
            desc: "L'évolution du <b>Mouvement</b>. Rapidité et verticalité au service de la fluidité.",
            bg: "/static/img/silksong.webp",
            trailer: "https://youtu.be/pFAknD_9U7c"
        },
        {
            title: "MIO",
            studio: "Douze Dixièmes",
            genre: "Metroidvania",
            desc: "Focus sur la <b>Direction Artistique</b> et les transitions fluides sous Unity.",
            bg: "/static/img/7c122d9d96fd561cb7dca3ed40aa6f5b.webp",
            trailer: "https://youtu.be/itTbXBQ0JU0"
        }
    ];

    document.addEventListener('DOMContentLoaded', () => {
        const filtersEl = document.getElementById('filters-inspirations');
        const gridEl = document.getElementById('grid-inspirations');

        if (!filtersEl || !gridEl) return;

        let activeGenre = "Tous";
        const genres = ["Tous", ...new Set(dataInspirations.map(g => g.genre))];

        function render() {
            const list = activeGenre === "Tous" 
                ? dataInspirations 
                : dataInspirations.filter(g => g.genre === activeGenre);

            filtersEl.innerHTML = genres.map(g =>
                `<button class="filter-btn${g === activeGenre ? " active" : ""}" data-g="${g}">${g}</button>`
            ).join("");

            gridEl.innerHTML = list.map(g => `
                <div class="card-game">
                    <div class="card-bg">
                        <img src="${g.bg}" alt="${g.title}" loading="lazy" onerror="this.src='https://placehold.co/600x800/1a1a1e/white?text=${g.title}'">
                    </div>
                    <div class="card-overlay">
                        <div class="card-content">
                            <p class="card-title">${g.title}</p>
                            <p class="card-studio">${g.studio}</p>
                            <div class="card-divider"></div>
                            <div class="card-details">
                                <p class="card-desc">${g.desc}</p>
                                <div class="card-action" onclick="window.open('${g.trailer}', '_blank')" style="cursor: pointer;">
                                    VOIR_TRAILER
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join("");

            filtersEl.querySelectorAll('.filter-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation(); // Empêche le clic du bouton de déclencher le clic de la carte
                    activeGenre = btn.getAttribute('data-g');
                    render();
                };
            });
        }

        render();
    });
})();