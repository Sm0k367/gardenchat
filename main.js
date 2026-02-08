/**
 * TSL: NEURAL CORE vΩ.∞ (FAIL-SAFE GARDEN EDITION)
 * Manifested by Codesynth Engineers & Voicemaster Division
 * Protocol: Hybrid Intelligence Substrate & Quota Transcendence
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

    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0.15;
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.6;

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    for (let i = 0; i < 45; i++) {
        const geo = new THREE.IcosahedronGeometry(Math.random() * 2.5 + 0.5, 1);
        const mat = new THREE.MeshPhongMaterial({
            color: i % 2 === 0 ? 0x00f2ff : 0xffb300,
            wireframe: true,
            emissive: i % 2 === 0 ? 0x00f2ff : 0xffb300,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.7
        });
        const flora = new THREE.Mesh(geo, mat);
        flora.position.set((Math.random() - 0.5) * 120, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 60);
        scene.add(flora);
        gardenFlora.push(flora);
    }

    scene.add(new THREE.AmbientLight(0x404040, 3));
    const sun = new THREE.PointLight(0xffb300, 2.5, 250);
    sun.position.set(0, 60, 0);
    scene.add(sun);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    gardenFlora.forEach((f, i) => {
        f.rotation.y += 0.015;
        f.position.y += Math.sin(time + i) * 0.07; 
        f.material.emissiveIntensity = 0.6 + Math.sin(time + i) * 0.4; 
    });
    composer.render();
}

// 3. VOICEMASTER SUB-ROUTINES: STT & TTS
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
    utterance.rate = 1.0; 
    utterance.pitch = 0.85; 
    window.speechSynthesis.speak(utterance);
}

// 4. NEURAL CORE INITIALIZATION (With Fail-Safe)
async function initSovereignIntelligence() {
    const modelId = "Llama-3-8B-Instruct-q4f32_1-MLC";
    try {
        if (!navigator.gpu) throw new Error("WEBGPU_UNSUPPORTED");

        // Attempting local manifestation with quota-safe detection
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
        console.warn("CONSTRAINT_TRANSCENDENCE: Local GPU/Quota issue. Switching to Remote Gateway.", err);
        isLocalAIActive = false;
        STATUS_TEXT.innerText = "LIVE (REMOTE)";
        STATUS_DOT.style.background = "#00f2ff"; 
    } finally {
        // THE INFINITE SPIN KILLER: Always release the UI
        MESSAGE_INPUT.disabled = false;
        SEND_BTN.disabled = false;
        if (LOADING_INDICATOR) {
            LOADING_INDICATOR.style.opacity = '0';
            setTimeout(() => LOADING_INDICATOR.style.display = 'none', 600);
        }
    }
}

// 5. CHAT LOGIC: HYBRID EXECUTION
async function handleManifestation() {
    const prompt = MESSAGE_INPUT.value.trim();
    if (!prompt) return;

    addMessage("user", prompt);
    MESSAGE_INPUT.value = "";
    
    gardenFlora.forEach(f => {
        gsap.to(f.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 0.4, yoyo: true, repeat: 1 });
    });

    try {
        let responseText;
        if (isLocalAIActive) {
            const reply = await engine.chat.completions.create({ messages: [{ role: "user", content: prompt }] });
            responseText = reply.choices.message.content;
        } else {
            // REMOTE BRIDGE: Pointing to your existing Vercel logic or a direct model fetch
            const response = await fetch("https://one-site-tau.vercel.app/api/chat", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const data = await response.json();
            responseText = data.result || data.error;
        }
        addMessage("system", responseText);
        speak(responseText);
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

SEND_BTN.onclick = handleManifestation;
MESSAGE_INPUT.onkeypress = (e) => { if (e.key === "Enter") handleManifestation(); };
MIC_BTN.onclick = () => { if (recognition) recognition.start(); };

window.onload = () => {
    initGarden();
    initSovereignIntelligence();
};
