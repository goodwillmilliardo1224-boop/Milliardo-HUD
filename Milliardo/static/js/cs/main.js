(function() {
    const introScreen = document.getElementById('intro-screen');
    const terminalScreen = document.getElementById('terminal-screen');
    const terminalContent = document.getElementById('terminal-content');
    const heroContainer = document.getElementById('hero-title-container');
    const titlesWrapper = document.getElementById('titles-wrapper');
    const logsCanvas = document.getElementById('bg-logs-canvas');
    const ctxLogs = logsCanvas.getContext('2d');
    const terminalInput = document.getElementById('terminal-input');
    const chatArea = document.getElementById('chat-display-area');
    const cur = document.getElementById('cur');

    let isInitialized = false;
    let isStreaming = false;
    const commandHistory = [];
    let historyIndex = -1;

    // --- CURSEUR SOURIS ---
    let mx = 0, my = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    document.addEventListener('mousedown', () => cur.classList.add('clicked'));
    document.addEventListener('mouseup',   () => cur.classList.remove('clicked'));
    function animateCursor() {
        cx += (mx - cx) * 0.12; cy += (my - cy) * 0.12;
        cur.style.left = cx + 'px'; cur.style.top  = cy + 'px';
        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    window.focusInputField = function() {
        if(!isStreaming && terminalInput) terminalInput.focus();
    }

    window.handleTabClick = function(tabName) {
        if (isStreaming) return;
        if (tabName === 'next') tabName = "/projects";
        terminalInput.value = tabName;
        executeChatSequence(tabName);
    }

    window.insertSlash = function(e) {
        e.stopPropagation();
        if (isStreaming) return;
        terminalInput.value = "/";
        terminalInput.focus();
    }

    window.submitCommand = function(e) {
        if(e) e.stopPropagation();
        if (isStreaming) return;
        const cmd = terminalInput.value.trim();
        if (cmd !== "") {
            executeChatSequence(cmd);
        }
    }

    if(terminalInput) {
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !isStreaming) {
                submitCommand(e);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (commandHistory.length > 0) {
                    historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
                    terminalInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    terminalInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
                } else if (historyIndex === 0) {
                    historyIndex = -1;
                    terminalInput.value = "";
                }
            }
        });
    }

    async function executeChatSequence(command) {
        if (command.trim() !== "") {
            commandHistory.push(command);
            historyIndex = -1;
        }
        terminalInput.value = "";
        
        if (command.toLowerCase() === 'clear' || command.toLowerCase() === 'exit') {
            chatArea.innerHTML = "";
            chatArea.classList.add('hidden');
            if(titlesWrapper) titlesWrapper.classList.remove('shifted');
            setTimeout(() => { terminalInput.focus(); }, 400);
            return;
        }

        isStreaming = true;
        terminalInput.blur();
        terminalInput.disabled = true;

        if(titlesWrapper) titlesWrapper.classList.add('shifted');

        setTimeout(async () => {
            chatArea.classList.remove('hidden');

            const userLine = document.createElement('div');
            userLine.className = "chat-log-line chat-user-query";
            userLine.innerText = `will@milliardo:~$ ${command}`;
            chatArea.appendChild(userLine);
            chatArea.scrollTop = chatArea.scrollHeight;

            const aiLine = document.createElement('div');
            aiLine.className = "chat-log-line chat-ai-response";
            aiLine.innerHTML = `Lesly <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>`;
            chatArea.appendChild(aiLine);
            chatArea.scrollTop = chatArea.scrollHeight;

            // ── LOGIQUE DE RÉPONSE IA ──
            try {
                const res = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: command })
                });
                const data = await res.json();
                let fullResponse = data.response;

                // Détection du préfixe choisi par l'IA (ou défaut)
                let prefix = "Lesly ";
                if (fullResponse.includes("Goodwill")) {
                    prefix = "Goodwill ";
                }

                // Nettoyage agressif des préfixes si l'IA les répète (insensible à la casse)
                fullResponse = fullResponse.replace(/^Lesly[:~\$]*\s*/i, "");
                fullResponse = fullResponse.replace(/^Goodwill[:~\$]*\s*/i, "");
                fullResponse = fullResponse.replace(/^milli@rd0-os[:~\$]*\s*/i, "");

                // On remplace les points de chargement par le préfixe définitif
                aiLine.innerHTML = prefix;

                // Vérification du trigger HUD
                const hasHudTrigger = fullResponse.includes("[TRIGGER_HUD_PROJECTS]");
                const hasContactTrigger = fullResponse.includes("[TRIGGER_HUD_CONTACT]");
                // On remplace les triggers par rien, mais on NE FAIT PAS de .trim() au début pour garder le saut de ligne
                const cleanResponse = fullResponse
                    .replace("[TRIGGER_HUD_PROJECTS]", "")
                    .replace("[TRIGGER_HUD_CONTACT]", "")
                    .trimEnd();

                typeWriterStream(cleanResponse, aiLine, 0, () => {
                    if (hasHudTrigger) {
                        displayProjectsHUD(aiLine);
                    }
                    if (hasContactTrigger) {
                        displayContactHUD(aiLine);
                    }
                    isStreaming = false;
                    terminalInput.disabled = false;
                    terminalInput.focus();
                });

            } catch (err) {
                aiLine.innerHTML = `milli@rd0-os:~$ `;
                typeWriterStream("SYS_ERR: Connexion neural interrompue.", aiLine, 0, () => {
                    isStreaming = false;
                    terminalInput.disabled = false;
                    terminalInput.focus();
                });
            }
        }, 800); 
    }

    function displayProjectsHUD(container) {
        const liste = [
          { titre: "Script Contrôle Réseau" },
          { titre: "Transcription Visuelle" },
          { titre: "Milliardo HUD" }
        ];
      
        setTimeout(() => {
            const grid = document.createElement('div');
            grid.style.cssText = `
                display: flex; flex-wrap: nowrap; overflow-x: auto;
                gap: 20px; padding-bottom: 15px; scrollbar-width: none;
                margin-top: 20px; animation: fadeUpIn 0.5s ease forwards;
            `;
            grid.style.msOverflowStyle = 'none';
        
            liste.forEach(p => {
                const card = document.createElement('div');
                card.style.cssText = `
                    width: 220px; height: 240px; flex-shrink: 0;
                    border: 1px solid rgba(47, 140, 177, 0.15); background: rgba(255,255,255,0.05);
                    border-radius: 6px; 
                    cursor: pointer; transition: all 0.3s ease; overflow: hidden;
                    display: flex; flex-direction: column;
                `;
                card.innerHTML = `
                    <div style="width:100%;height:150px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <span style="font-size:12px;color:rgba(255,255,255,0.2);font-family:'Courier New',monospace;letter-spacing:3px;font-weight:bold;">[ VIEW_IMG ]</span>
                    </div>
                    <div style="padding:15px;border-top:1px solid rgba(255,255,255,0.1);flex:1;display:flex;flex-direction:column;justify-content:center;background:rgba(0,0,0,0.2);">
                        <div style="font-size:13px;color:#fff;font-family:'Courier New',monospace;letter-spacing:1px;line-height:1.3;font-weight:bold;">${p.titre}</div>
                    </div>
                `;
                card.addEventListener('mouseenter', () => { card.style.borderColor = 'rgba(255,255,255,0.6)'; card.style.transform = 'translateY(-5px)'; });
                card.addEventListener('mouseleave', () => { card.style.borderColor = 'rgba(255,255,255,0.15)'; card.style.transform = 'translateY(0)'; });
                grid.appendChild(card);
            });
            container.appendChild(grid);
            chatArea.scrollTop = chatArea.scrollHeight;
        }, 500);
    }

    function displayContactHUD(container) {
        setTimeout(() => {
            const card = document.createElement('div');
            card.style.cssText = `
                animation: fadeUpIn 0.5s ease forwards;
                margin-top: 20px;
                display: flex;
                flex-direction: column;
                width: 315px;
                height: 370px;
                flex-shrink: 0;
                flex-basis: 315px;
                overflow: hidden;
            `;

            card.innerHTML = `
                <div style="
                    width: 100%;
                    height: 100%;
                    background: rgba(255,255,255,0.08);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.6);
                    border-radius: 15px;
                    padding: 27px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    font-family: 'Oxanium', sans-serif;
                    overflow-y: auto;
                    box-sizing: border-box;
                ">
                    <div style="display:flex;flex-direction:column;gap:5px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:3px;flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:7px;">
                            <span class="material-symbols-outlined" style="color:#4285F4;font-size:12px">mail</span>
                            <span style="font-size:9px;font-weight:600;letter-spacing:1px;color:#4285F4;">EMAIL</span>
                            <span style="color:rgba(255,255,255,0.3);font-size:9px;">:</span>
                            <a href="mailto:goodwillmilliardo1224@gmail.com" style="font-size:9px;color:rgba(255,255,255,0.75);text-decoration:none;letter-spacing:0.5px;">goodwillmilliardo1224@gmail.com</a>
                        </div>
                        <div style="display:flex;align-items:center;gap:7px;">
                            <span class="material-symbols-outlined" style="color:#4285F4;font-size:12px">phone</span>
                            <span style="font-size:9px;font-weight:600;letter-spacing:1px;color:#4285F4;">CONTACT</span>
                            <span style="color:rgba(255,255,255,0.3);font-size:9px;">:</span>
                            <a href="tel:+2290153272843" style="font-size:9px;color:rgba(255,255,255,0.75);text-decoration:none;">+229 01 53 27 28 43</a>
                        </div>
                    </div>

                    <div style="font-size:18px;font-weight:700;color:#fff;text-align:center;margin-bottom:3px;">Me contacter</div>

                    <div style="display:flex;gap:9px;flex-shrink:0;">
                        <div style="position:relative;flex:1;min-width:0;">
                            <input type="text" placeholder="Votre nom" style="width:100%;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.6);border-radius:7px;color:#fff;font-size:10px;font-family:'Oxanium',sans-serif;padding:9px 33px 9px 12px;outline:none;box-sizing:border-box;"/>
                            <span class="material-symbols-outlined" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#4285F4;font-size:12px;pointer-events:none;">person</span>
                        </div>
                        <div style="position:relative;flex:1;min-width:0;">
                            <input type="email" placeholder="Votre email" style="width:100%;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.6);border-radius:7px;color:#fff;font-size:10px;font-family:'Oxanium',sans-serif;padding:9px 33px 9px 12px;outline:none;box-sizing:border-box;"/>
                            <span class="material-symbols-outlined" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#4285F4;font-size:12px;pointer-events:none;">mail</span>
                        </div>
                    </div>

                    <div style="position:relative;flex-shrink:0;">
                        <input type="text" placeholder="Objet du message" style="width:100%;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.6);border-radius:7px;color:#fff;font-size:10px;font-family:'Oxanium',sans-serif;padding:9px 33px 9px 12px;outline:none;box-sizing:border-box;"/>
                        <span class="material-symbols-outlined" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#4285F4;font-size:12px;pointer-events:none;">label</span>
                    </div>

                    <div style="position:relative;flex:1;min-width:0;">
                        <textarea placeholder="Comment puis-je vous aider ?" style="width:100%;height:100%;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.6);border-radius:7px;color:#fff;font-size:10px;font-family:'Oxanium',sans-serif;padding:9px 12px;outline:none;resize:none;box-sizing:border-box;"></textarea>
                    </div>

                    <button style="width:100%;background:rgba(12,54,194,0.9);border:none;border-radius:37px;color:#fff;font-size:10px;font-weight:700;font-family:'Oxanium',sans-serif;letter-spacing:2px;padding:10px;cursor:pointer;text-transform:uppercase;margin-top:3px;flex-shrink:0;">
                        Send
                    </button>
                </div>
            `;

            container.appendChild(card);
            chatArea.scrollTop = chatArea.scrollHeight;
        }, 500);
    }

    function typeWriterStream(text, element, charIndex, callback) {
        if (charIndex < text.length) {
            const existingCursor = element.querySelector('.stream-cursor');
            if (existingCursor) existingCursor.remove();

            // Support des balises HTML
            if (text.charAt(charIndex) === '<') {
                const closingIndex = text.indexOf('>', charIndex);
                if (closingIndex !== -1) {
                    const tag = text.substring(charIndex, closingIndex + 1);
                    element.insertAdjacentHTML('beforeend', tag);
                    charIndex = closingIndex + 1;
                    
                    // Si c'est une balise ouvrante (non fermante et non auto-fermante comme <br>)
                    const lastNode = element.lastChild;
                    if (lastNode && lastNode.nodeType === 1 && !tag.startsWith('</') && !tag.endsWith('/>')) {
                        typeWriterStreamInside(text, lastNode, charIndex, callback, element);
                        return;
                    }
                }
            } else {
                element.insertAdjacentText('beforeend', text.charAt(charIndex));
                charIndex++;
            }

            const cursor = document.createElement('span');
            cursor.className = 'stream-cursor';
            element.appendChild(cursor);
            chatArea.scrollTop = chatArea.scrollHeight;

            setTimeout(() => {
                typeWriterStream(text, element, charIndex, callback);
            }, 10); 
        } else {
            const finalCursor = element.querySelector('.stream-cursor');
            if (finalCursor) finalCursor.remove(); 
            if (callback) callback();
        }
    }

    function typeWriterStreamInside(text, target, charIndex, callback, originalElement) {
        if (charIndex < text.length) {
            // Si on rencontre une balise fermante correspondant à notre target
            const closingTag = '</' + target.tagName.toLowerCase() + '>';
            if (text.startsWith(closingTag, charIndex)) {
                charIndex += closingTag.length;
                typeWriterStream(text, originalElement, charIndex, callback);
                return;
            }
            
            // Si on rencontre une autre balise à l'intérieur (récursion)
            if (text.charAt(charIndex) === '<') {
                const nextClosingIndex = text.indexOf('>', charIndex);
                if (nextClosingIndex !== -1) {
                    const tag = text.substring(charIndex, nextClosingIndex + 1);
                    target.insertAdjacentHTML('beforeend', tag);
                    charIndex = nextClosingIndex + 1;
                    const lastNode = target.lastChild;
                    if (lastNode && lastNode.nodeType === 1 && !tag.startsWith('</') && !tag.endsWith('/>')) {
                        typeWriterStreamInside(text, lastNode, charIndex, callback, originalElement);
                        return;
                    }
                }
            } else {
                target.insertAdjacentText('beforeend', text.charAt(charIndex));
                charIndex++;
            }

            chatArea.scrollTop = chatArea.scrollHeight;
            setTimeout(() => {
                typeWriterStreamInside(text, target, charIndex, callback, originalElement);
            }, 10);
        } else {
            if (callback) callback();
        }
    }

    function getHardwareSpecs() {
        const cpu = navigator.hardwareConcurrency || "unknown";
        const ram = navigator.deviceMemory ? navigator.deviceMemory + " GB" : "8 GB";
        const os = navigator.platform || "Linux/Windows";
        const br = (function() {
            const ua = navigator.userAgent;
            if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
            if (ua.includes("Edg")) return "Edge";
            if (ua.includes("Chrome")) return "Chrome";
            if (ua.includes("Firefox")) return "Firefox";
            return "Generic Browser";
        })();
        const disp = `${window.screen.width}×${window.screen.height} @ ${window.devicePixelRatio}x`;
        
        let gpu = "Generic Integrated Graphics";
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }

        const net = navigator.connection ? navigator.connection.effectiveType : "encrypted";
        const lang = navigator.language || "fr-FR";

        return [
            { left: "nynteh bios v0.24.01 · identifying host", right: "" },
            { left: `copyright (c) 2026 goodwill · all rights reserved`, right: "", spacing: true },
            { left: `<span class="spec-label">cpu</span>  · ${cpu} logical cores`, right: '<span class="status-ok">[ok]</span>' },
            { left: `<span class="spec-label">mem</span>  · ${ram} ram`, right: '<span class="status-ok">[ok]</span>' },
            { left: `<span class="spec-label">os</span>   · ${os}`, right: '<span class="status-ok">[ok]</span>' },
            { left: `<span class="spec-label">br</span>   · ${br}`, right: '<span class="status-ok">[ok]</span>' },
            { left: `<span class="spec-label">disp</span> · ${disp}`, right: '<span class="status-ok">[ok]</span>' },
            { left: `<span class="spec-label">gpu</span>  · ${gpu.substring(0, 45)}...`, right: '<span class="status-ok">[ok]</span>' },
            { left: `<span class="spec-label">net</span>  · ${net}`, right: '<span class="status-ok">[ok]</span>' },
            { left: `<span class="spec-label">loc</span>  · ${lang}`, right: '<span class="status-ok">[ok]</span>', spacing: true },
            { left: "loading profile: goodwill@kali", right: "" },
            { left: "mounting /resume /projects /stack /hire ...", right: '<span class="status-ok">[done]</span>' }
        ];
    }

    function initializeSystem() {
        if (isInitialized) return;
        isInitialized = true;

        window.removeEventListener('keydown', initializeSystem);
        window.removeEventListener('click', initializeSystem);

        introScreen.classList.add('fade-out');
        terminalScreen.classList.remove('hidden');

        const bootLines = getHardwareSpecs();
        setTimeout(() => { startBootSequence(bootLines, 0); }, 200); 
    }

    function startBootSequence(lines, lineIndex) {
        if (lineIndex < lines.length) {
            const div = document.createElement('div');
            div.className = "bios-line" + (lines[lineIndex].spacing ? " spacing" : "");
            div.innerHTML = `<span class="left-part"></span><span class="right-part"></span>`;
            terminalContent.appendChild(div);

            const leftSpan = div.querySelector('.left-part');
            const rightSpan = div.querySelector('.right-part');

            typeWriter(lines[lineIndex].left, leftSpan, 0, () => {
                if(lines[lineIndex].right) rightSpan.innerHTML = lines[lineIndex].right;
                setTimeout(() => { startBootSequence(lines, lineIndex + 1); }, 40); 
            });
        } else {
            setTimeout(() => {
                terminalContent.classList.add('clear-logs');
                setTimeout(() => {
                    terminalContent.classList.add('hidden');
                    heroContainer.classList.add('show');
                    logsCanvas.classList.add('show');
                    initBackgroundGridStream(); 
                    
                    setTimeout(() => {
                        if(titlesWrapper) titlesWrapper.classList.add('ready');
                        setTimeout(() => {
                            const tabsWrapper = document.querySelector('.tabs-wrapper');
                            const cmdInput = document.querySelector('.cmd-input-container');
                            if(tabsWrapper) tabsWrapper.classList.add('reveal');
                            if(cmdInput) cmdInput.classList.add('reveal');
                            setTimeout(() => { if(terminalInput) terminalInput.focus(); }, 400);
                        }, 600);
                    }, 800);
                }, 500);
            }, 1200);
        }
    }

    function typeWriter(text, element, charIndex, callback) {
        if (charIndex < text.length) {
            if (text.charAt(charIndex) === '<') {
                const closingIndex = text.indexOf('>', charIndex);
                element.innerHTML += text.substring(charIndex, closingIndex + 1);
                charIndex = closingIndex + 1;
            } else {
                element.innerHTML += text.charAt(charIndex);
                charIndex++;
            }
            setTimeout(() => { typeWriter(text, element, charIndex, callback); }, 3); 
        } else if (callback) { callback(); }
    }

    function resizeLogsCanvas() {
        if(logsCanvas) {
            logsCanvas.width = window.innerWidth;
            logsCanvas.height = window.innerHeight - 45;
        }
    }
    window.addEventListener('resize', resizeLogsCanvas);
    resizeLogsCanvas();

    function initBackgroundGridStream() {
        const leftDataset = [
            { tag: "[db]", msg: "postgres: analyze users" },
            { tag: "[warn]", msg: "rate-limit near" },
            { tag: "[git]", msg: "git push origin main" },
            { tag: "[db]", msg: "prisma user.findMany() rows=11" },
            { tag: "[info]", msg: "GET /api/analytics" },
            { tag: "[ws]", msg: "ws: client connected" },
            { tag: "[db]", msg: "prisma user.findMany() rows=10" },
            { tag: "[ai]", msg: "groq: llama-3.3-70b" },
            { tag: "[db]", msg: "prisma user.findMany() rows=38" },
            { tag: "[ok]", msg: "health: uptime" },
            { tag: "[cache]", msg: "redis HIT session:cb277162" }
        ];

        const rightDataset = [
            { d1: "hit-rate=91%", d2: "redis://fra", d3: "-" },
            { d1: "queue=empty", d2: "worker-1", d3: "-" },
            { d1: "1237ms", d2: "turbopack", d3: "-" },
            { d1: "96s", d2: "edge", d3: "sfo1" },
            { d1: "gzip", d2: "no-buf", d3: "-" },
            { d1: "signed", d2: "ssh", d3: "-" },
            { d1: "2 commits", d2: "signed", d3: "ssh" },
            { d1: "active=82", d2: "io", d3: "dub1" },
            { d1: "n=11", d2: "queue=empty", d3: "worker-1" },
            { d1: "95%", d2: "191/min", d3: "api/chat" },
            { d1: "99.9%", d2: "users=268", d3: "cardz.lol" }
        ];

        let activeGridRows = [];
        const fontHeight = 12;
        const paddingLine = 12; 
        const totalLineSpacing = fontHeight + paddingLine; 
        const scrollSpeed = 0.4;

        const maxLinesOnScreen = Math.ceil(logsCanvas.height / totalLineSpacing) + 2;
        
        for (let i = 0; i < maxLinesOnScreen; i++) {
            const leftItem = leftDataset[Math.floor(Math.random() * leftDataset.length)];
            const rightItem = rightDataset[Math.floor(Math.random() * rightDataset.length)];
            const timeStr = new Date(Date.now() - (maxLinesOnScreen - i) * 3000).toTimeString().split(' ')[0];

            activeGridRows.push({
                time: timeStr,
                tag: leftItem.tag,
                msg: leftItem.msg,
                r1: rightItem.d1,
                r2: rightItem.d2,
                r3: rightItem.d3,
                y: i * totalLineSpacing
            });
        }

        let lastTime = 0;
        const fpsInterval = 1000 / 30; 

        function runLogsEngine(timestamp) {
            requestAnimationFrame(runLogsEngine);

            const elapsed = timestamp - lastTime;
            if (elapsed < fpsInterval) return;
            lastTime = timestamp - (elapsed % fpsInterval);

            ctxLogs.clearRect(0, 0, logsCanvas.width, logsCanvas.height);
            ctxLogs.font = "12px 'Courier New', Courier, monospace";
            ctxLogs.fillStyle = "rgba(255, 255, 255, 0.45)"; 

            const xTime = 20;
            const xTag = 100;
            const xMsg = 165;

            const screenWidth = logsCanvas.width;
            const xR1 = screenWidth - 360;
            const xR2 = screenWidth - 220;
            const xR3 = screenWidth - 80;

            for (let i = 0; i < activeGridRows.length; i++) {
                let row = activeGridRows[i];
                row.y -= scrollSpeed;

                ctxLogs.fillText(row.time, xTime, row.y);
                ctxLogs.fillText(row.tag, xTag, row.y);
                ctxLogs.fillText(row.msg, xMsg, row.y);

                ctxLogs.fillText(row.r1, xR1, row.y);
                ctxLogs.fillText(row.r2, xR2, row.y);
                ctxLogs.fillText(row.r3, xR3, row.y);

                if (row.y < -fontHeight) {
                    let lowestY = -1;
                    for (let j = 0; j < activeGridRows.length; j++) {
                        if (activeGridRows[j].y > lowestY) lowestY = activeGridRows[j].y;
                    }

                    const newLeft = leftDataset[Math.floor(Math.random() * leftDataset.length)];
                    const newRight = rightDataset[Math.floor(Math.random() * rightDataset.length)];
                    
                    row.time = new Date().toTimeString().split(' ')[0];
                    row.tag = newLeft.tag;
                    row.msg = newLeft.msg;
                    row.r1 = newRight.d1;
                    row.r2 = newRight.d2;
                    row.r3 = newRight.d3;
                    row.y = lowestY + totalLineSpacing;
                }
            }
        }
        requestAnimationFrame(runLogsEngine);
    }

    window.addEventListener('keydown', initializeSystem);
    window.addEventListener('click', initializeSystem);

    const tabsScroll = document.getElementById('tabs-scroll');
    const btnRight = document.getElementById('tabs-right');

    if (btnRight && tabsScroll) {
        btnRight.addEventListener('click', (e) => {
            e.stopPropagation();
            tabsScroll.scrollBy({ left: 150, behavior: 'smooth' });
        });
    }

})();
