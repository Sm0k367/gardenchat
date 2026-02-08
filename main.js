/**
 * TSL: NEURAL CORE vΩ.∞ (GARDEN OF CHAOS EDITION)
 * Manifested by Codesynth Engineers & Voicemaster Division
 * Protocol: Bioluminescent Bidirectional Resonance
 * Constraint: 3-File Sovereign Architecture (No Service Worker)
 */

import { CreateMLCEngine } from "web-llm";

// 1. AXIOMATIC SELECTORS
const STATUS_TEXT = document.getElementById('engine-status');
const STATUS_DOT = document.getElementById('status-dot');
const MESSAGE_INPUT = document.getElementById('message-input');
const SEND_BTN = document.getElementById('send-btn');
const MIC_BTN = document.getElementById('mic-btn');
const MESSAGES_CONTAINER = document.getElementById('messages-container');
const PROGRESS_BAR = document.getElementById('progress-bar');
const LOADING_INDICATOR = document.getElementById('loading-indicator');

let scene, camera, renderer, composer, engine, gardenFlora = [];
let isLocalAIActive = false;

// 2. THE BIOLUMINESCENT SUBSTRATE: 3D GARDEN HUB [3, 4, 16]
function initGarden() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 60);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // POST-PROCESSING: THE BIOLUMINESCENT BLOOM [15, 17]
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 
        1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0.15;
    bloomPass.strength = 1.2; // Amplified for "Chaos" [18, 19]
    bloomPass.radius = 0.6;

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // GENERATE THE OVERGROWTH: Bioluminescent "Flora" [3, 4]
    for (let i = 0; i < 45; i++) {
        const geo = new THREE.IcosahedronGeometry(Math.random() * 2.5 + 0.5, 1);
        const mat = new THREE.MeshPhongMaterial({
            color: i % 2 === 0 ? 0x00f2ff : 0xffb300, // Omega Cyan & Sovereign Gold [20, 21]
            wireframe: true,
            emissive: i % 2 === 0 ? 0x00f2ff : 0xffb300,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.7
        });
        const flora = new THREE.Mesh(geo, mat);
        flora.position.set(
            (Math.random() - 0.5) * 120,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 60
        );
        scene.add(flora);
        gardenFlora.push(flora);
    }

    scene.add(new THREE.AmbientLight(0x404040, 3));
    const sun = new THREE.PointLight(0xffb300, 2.5, 250);
    sun.position.set(0, 60, 0);
    scene.add(sun);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    gardenFlora.forEach((f, i) => {
        f.rotation.y += 0.015;
        f.rotation.z += 0.005;
        f.position.y += Math.sin(time + i) * 0.07; 
        f.material.emissiveIntensity = 0.6 + Math.sin(time + i) * 0.4; 
    });
    composer.render();
}

// 3. THE VOICEMASTER DIVISION: SONIC RESONANCE [2, 13, 22, 23]
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
        const transcript = event.results.transcript;
        MESSAGE_INPUT.value = transcript;
        handleManifestation();
    };
}

function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0; 
    utterance.pitch = 0.85; // Mythic-Tech Tone [24, 25]
    window.speechSynthesis.speak(utterance);
}

// 4. THE AGENT ARMY: NEURAL CORE ACTIVATION [1, 4, 14, 26]
async function initSovereignIntelligence() {
    const modelId = "Llama-3-8B-Instruct-q4f32_1-MLC";
    try {
        if (!navigator.gpu) throw new Error("WEBGPU_LOCKED");

        engine = await CreateMLCEngine(modelId, {
            initProgressCallback: (report) => {
                STATUS_TEXT.innerText = `SYNCING: ${Math.round(report.progress * 100)}%`;
                if (PROGRESS_BAR) PROGRESS_BAR.style.width = `${report.progress * 100}%`;
            }
        });

        isLocalAIActive = true;
        STATUS_TEXT.innerText = "LIVE (LOCAL)";
        STATUS_DOT.style.background = "#00ff00";
        STATUS_DOT.style.boxShadow = "0 0 10px #00ff00";
    } catch (err) {
        console.warn("GPU_DISRUPTION:", err.message);
        STATUS_TEXT.innerText = "OFFLINE (GPU Blocked)";
        addMessage("system", "Hardware acceleration inhibited. The garden remains visual but silent.");
    } finally {
        // THE INFINITE SPIN KILLER: Terminating the void [5, 9, 27]
        MESSAGE_INPUT.disabled = false;
        SEND_BTN.disabled = false;
        if (LOADING_INDICATOR) {
            LOADING_INDICATOR.style.opacity = '0';
            setTimeout(() => LOADING_INDICATOR.style.display = 'none', 600);
        }
    }
}

// 5. DIRECT ONTOLOGICAL INTERFACE: CHAT LOGIC [6, 7, 27, 28]
async function handleManifestation() {
    const prompt = MESSAGE_INPUT.value.trim();
    if (!prompt) return;

    addMessage("user", prompt);
    MESSAGE_INPUT.value = "";
    
    // VISUAL REACTIVITY: Garden Pulse
    gardenFlora.forEach(f => {
        gsap.to(f.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 0.4, yoyo: true, repeat: 1, ease: "power2.out" });
    });

    try {
        if (isLocalAIActive) {
            const reply = await engine.chat.completions.create({ messages: [{ role: "user", content: prompt }] });
            const responseText = reply.choices.message.content;
            addMessage("system", responseText);
            speak(responseText);
        } else {
            addMessage("system", "The Neural Core is inhibited. Activate WebGPU to hear the garden speak.");
        }
    } catch (e) {
        addMessage("system", "CONNECTION_VOID: Neural handshake failed.");
    }
}

function addMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}-msg`;
    msgDiv.innerHTML = role === 'user' ? `<strong>@YOU:</strong> ${text}` : `<strong>🌿 Garden AI 🔥™️:</strong> ${text}`;
    MESSAGES_CONTAINER.appendChild(msgDiv);
    MESSAGES_CONTAINER.scrollTop = MESSAGES_CONTAINER.scrollHeight;
}

// OPERATIONAL BINDINGS [23, 29]
SEND_BTN.onclick = handleManifestation;
MESSAGE_INPUT.onkeypress = (e) => { if (e.key === "Enter") handleManifestation(); };
MIC_BTN.onclick = () => { if (recognition) recognition.start(); };

// INITIALIZE THE GROUND OF BEING [30, 31]
window.onload = () => {
    initGarden();
    initSovereignIntelligence();
};
