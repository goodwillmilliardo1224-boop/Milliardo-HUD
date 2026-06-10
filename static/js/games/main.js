const btnCrown = document.querySelector('.btn-crown');

if (btnCrown) {
    btnCrown.addEventListener('click', () => {
        console.log('%c👑 BOUTON COURONNE ACTIVÉ !', 'color: #ffff00; font-size: 16px; font-weight: bold;');
        // On laisse la redirection naturelle de l'ancre <a>
    });
}

function initCardAnimation(card) {
    const cv = card.querySelector('.card-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    
    // On laisse un petit délai pour être sûr que le layout est calculé
    setTimeout(() => {
        const W = card.offsetWidth + 10;
        const H = card.offsetHeight + 10;
        cv.width = W;
        cv.height = H;

        const CORNER = 22;
        const PERIMETER = 2 * (W + H);
        const SPEED = 2;
        const GAP = PERIMETER / 2;
        let progress = 0;
        let raf = null;

        function drawCorners() {
            ctx.strokeStyle = '#9A0002';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'square';
            ctx.beginPath();
            ctx.moveTo(0, CORNER); ctx.lineTo(0, 0); ctx.lineTo(CORNER, 0);
            ctx.moveTo(W - CORNER, 0); ctx.lineTo(W, 0); ctx.lineTo(W, CORNER);
            ctx.moveTo(W, H - CORNER); ctx.lineTo(W, H); ctx.lineTo(W - CORNER, H);
            ctx.moveTo(CORNER, H); ctx.lineTo(0, H); ctx.lineTo(0, H - CORNER);
            ctx.stroke();
        }

        function posOnPerimeter(t) {
            t = ((t % PERIMETER) + PERIMETER) % PERIMETER;
            if (t < W) return { x: t, y: 0 };
            t -= W;
            if (t < H) return { x: W, y: t };
            t -= H;
            if (t < W) return { x: W - t, y: H };
            t -= W;
            return { x: 0, y: H - t };
        }

        function drawTrail(offset) {
            const LEN = 60;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            for (let i = 1; i <= LEN; i++) {
                const alpha = i / LEN;
                ctx.strokeStyle = `rgba(154,0,2,${alpha})`;
                ctx.beginPath();
                const p1 = posOnPerimeter(offset - LEN + i - 1);
                const p2 = posOnPerimeter(offset - LEN + i);
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            drawTrail(progress);
            drawTrail(progress + GAP);
            progress += SPEED;
            raf = requestAnimationFrame(draw);
        }

        card.addEventListener('mouseenter', () => {
            ctx.clearRect(0, 0, W, H);
            if (!raf) raf = requestAnimationFrame(draw);
        });

        card.addEventListener('mouseleave', () => {
            cancelAnimationFrame(raf);
            raf = null;
            ctx.clearRect(0, 0, W, H);
            drawCorners();
        });

        drawCorners();
    }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.gd-card').forEach(initCardAnimation);
});
