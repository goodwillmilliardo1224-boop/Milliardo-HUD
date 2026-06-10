/**
 * PARTICLES BACKGROUND - PLEXUS EFFECT
 * Inspired by particles.js (Neural Network style)
 */

(function() {
    console.log("Milliardo Particles System: Initializing...");

    const canvas = document.getElementById('particles-canvas');
    if (!canvas) {
        console.error("Milliardo Particles System: Canvas element not found!");
        return;
    }
    const ctx = canvas.getContext('2d');

    let particles = [];
    let particleCount = 0;
    const connectionDistance = 150;
    const mouseRadius = 150;

    let mouse = {
        x: null,
        y: null
    };

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    class Particle {
        constructor() {
            this.init();
        }

        init() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 1.5 + 1;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Rebondir sur les bords
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;

            // Interaction souris
            if (mouse.x != null && mouse.y != null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouseRadius) {
                    let force = (mouseRadius - dist) / mouseRadius;
                    this.x -= dx * force * 0.02;
                    this.y -= dy * force * 0.02;
                }
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
        }
    }

    function createParticles() {
        particles = [];
        // Densité adaptée à l'écran
        particleCount = Math.floor((canvas.width * canvas.height) / 15000);
        if (particleCount > 150) particleCount = 150; // Cap pour la performance
        
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
        console.log(`Milliardo Particles System: Created ${particleCount} particles.`);
    }

    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                let dx = particles[i].x - particles[j].x;
                let dy = particles[i].y - particles[j].y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectionDistance) {
                    let opacity = 1 - (dist / connectionDistance);
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 245, 255, ${opacity * 0.3})`;
                    ctx.lineWidth = 0.8;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        createParticles();
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        
        drawLines();
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);

    resize();
    animate();
    console.log("Milliardo Particles System: Animation loop started.");
})();
