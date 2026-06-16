let term;
let fitAddon;
let donjonModule;

async function startDonjon() {
    const modal = document.getElementById('donjon-modal');
    modal.style.display = 'flex';

    if (!term) {
        term = new Terminal({
            cursorBlink: true,
            fontFamily: 'Courier New, monospace',
            fontSize: 14,
            theme: {
                background: '#000000',
                foreground: '#00F5FF'
            }
        });
        fitAddon = new FitAddon.FitAddon();
        term.loadAddon(fitAddon);
        term.open(document.getElementById('donjon-terminal-container'));
        fitAddon.fit();
    }

    term.clear();
    term.writeln('Initialisation du module WebAssembly...');

    // Simulation ou chargement réel si présent
    if (typeof createDonjonModule === 'undefined') {
        term.writeln('\x1b[31mERREUR: Module WebAssembly non détecté.\x1b[0m');
        term.writeln('Note pour Goodwill: Tu dois compiler donjon.c avec Emscripten :');
        term.writeln('emcc donjon.c -o static/js/cyber/donjon_wasm.js -s WASM=1');
        return;
    }

    try {
        donjonModule = await createDonjonModule({
            print: (text) => term.writeln(text),
            printErr: (text) => term.writeln('\x1b[31m' + text + '\x1b[0m'),
            onRuntimeInitialized: () => {
                term.writeln('Système prêt. Lancement du donjon...');
            }
        });
    } catch (e) {
        term.writeln('\x1b[31mErreur de chargement: ' + e.message + '\x1b[0m');
    }
}

function closeDonjon() {
    document.getElementById('donjon-modal').style.display = 'none';
    if (donjonModule && donjonModule._exit) {
        // Optionnel: forcer l'arrêt si nécessaire
    }
}

function restartDonjon() {
    if (term) term.clear();
    startDonjon();
}

// Export pour main.js
window.startDonjon = startDonjon;
window.closeDonjon = closeDonjon;
window.restartDonjon = restartDonjon;
