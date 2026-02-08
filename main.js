/**
 * TSL: NEURAL CORE vΩ.∞ (GARDEN OF CHAOS EDITION)
 * Manifested by Codesynth Engineers & Voicemaster Division
 * Substrate: Three.js / WebLLM / Web Speech API
 * Protocol: Bioluminescent Bidirectional Resonance
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

// 2. THE BIOLUMINESCENT SUBSTRATE: 3D GARDEN
function initGarden() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 60);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // POST-PROCESSING: THE BIOLUMINESCENT BLOOM
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 
        1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0.15;
    bloomPass.strength = 1.0;
    bloomPass.radius = 0.5;

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // GENERATE THE OVERGROWTH: Bioluminescent "Flora"
    for (let i = 0; i < 40; i++) {
        const geo = new THREE.IcosahedronGeometry(Math.random() * 2 + 0.5, 1);
        const mat = new THREE.MeshPhongMaterial({
            color: i % 2 === 0 ? 0x00f2ff : 0xffb300, // Omega Cyan & Sovereign Gold
            wireframe: true,
            emissive: i % 2 === 0 ? 0x00f2ff : 0xffb300,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.6
        });
        const flora = new THREE.Mesh(geo, mat);
        flora.position.set(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 50
        );
        scene.add(flora);
        gardenFlora.push(flora);
    }

    scene.add(new THREE.AmbientLight(0x404040, 2));
    const sun = new THREE.PointLight(0xffb300, 2, 200);
    sun.position.set(0, 50, 0);
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
        f.rotation.y += 0.01;
        f.position.y += Math.sin(time + i) * 0.05; // Floating animation
        f.material.emissiveIntensity = 0.5 + Math.sin(time + i) * 0.3; // Pulsing light
    });
    composer.render();
}

// 3. THE VOICEMASTER DIVISION: SONIC INTERFACE
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
    recognition.continuous = false;
    recognition.onresult = (event) => {
        MESSAGE_INPUT.value = event.results.transcript;
        handleManifestation();
    };
}

function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Deep, calm garden tone
    utterance.pitch = 0.8; 
    window.speechSynthesis.speak(utterance);
}

// 4. THE AGENT ARMY: LOCAL INTELLIGENCE INITIALIZATION
async function initSovereignIntelligence() {
    const modelId = "Llama-3-8B-Instruct-q4f32_1-MLC";
    try {
        if (!navigator.gpu) throw new Error("WebGPU_NOT_SUPPORTED");
        engine = await CreateMLCEngine(modelId, {
            initProgressCallback: (report) => {
                STATUS_TEXT.innerText = `SYNCING: ${Math.round(report.progress * 100)}%`;
                if (PROGRESS_BAR) PROGRESS_BAR.style.width = `${report.progress * 100}%`;
            }
        });
        isLocalAIActive = true;
        STATUS_TEXT.innerText = "LIVE (LOCAL)";
        STATUS_DOT.style.background = "#00ff00";
    } catch (err) {
        console.warn("GPU_OFFLINE: Reverting to Silent Growth.");
        STATUS_TEXT.innerText = "OFFLINE (WebGPU Required)";
    } finally {
        // THE INFINITE SPIN KILLER
        MESSAGE_INPUT.disabled = false;
        SEND_BTN.disabled = false;
        if (LOADING_INDICATOR) {
            LOADING_INDICATOR.style.opacity = '0';
            setTimeout(() => LOADING_INDICATOR.style.display = 'none', 500);
        }
    }
}

// 5. DIRECT ONTOLOGICAL INTERFACE: CHAT LOGIC
async function handleManifestation() {
    const prompt = MESSAGE_INPUT.value.trim();
    if (!prompt) return;

    addMessage("user", prompt);
    MESSAGE_INPUT.value = "";
    
    // VISUAL FEEDBACK: Bloom pulse on message
    gardenFlora.forEach(f => {
        gsap.to(f.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.3, yoyo: true, repeat: 1 });
    });

    try {
        const reply = isLocalAIActive 
            ? (await engine.chat.completions.create({ messages: [{ role: "user", content: prompt }] })).choices.message.content
            : "The garden is silent. Enable WebGPU to manifest my voice.";
        
        addMessage("system", reply);
        speak(reply);
    } catch (e) {
        addMessage("system", "VOICE_OF_THE_VOID: Neural handshake disrupted.");
    }
}

function addMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}-msg`;
    msgDiv.innerHTML = role === 'user' ? `<strong>@YOU:</strong> ${text}` : `<strong>🌿 Garden AI 🔥™️:</strong> ${text}`;
    MESSAGES_CONTAINER.appendChild(msgDiv);
    MESSAGES_CONTAINER.scrollTop = MESSAGES_CONTAINER.scrollHeight;
}

// OPERATIONAL ACTIVATION
SEND_BTN.onclick = handleManifestation;
MESSAGE_INPUT.onkeypress = (e) => { if (e.key === "Enter") handleManifestation(); };
MIC_BTN.onclick = () => { if (recognition) recognition.start(); };

window.onload = () => {
    initGarden();
    initSovereignIntelligence();
};
