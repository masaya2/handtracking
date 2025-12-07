import './style.css';
import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { PhysicsWorld } from './physics.js';
import { HandTracker } from './handTracking.js';
import { InteractionManager } from './interaction.js';

async function main() {
    const videoElement = document.getElementById('webcam');
    const loadingElement = document.getElementById('loading');

    // 1. Setup Scene
    const canvas = document.createElement('canvas');
    document.getElementById('app').appendChild(canvas);
    const sceneManager = new SceneManager(canvas);

    // 2. Setup Physics
    const physicsWorld = new PhysicsWorld();

    // Create Forest Environment (Visuals)
    for (let i = 0; i < 20; i++) {
        const x = (Math.random() - 0.5) * 40;
        const z = (Math.random() - 0.5) * 40 - 10; // Trees mostly in background
        if (Math.abs(x) < 2 && Math.abs(z) < 2) continue; // Clear center area
        sceneManager.createTreeMesh(x, z);

        // Optional: Add physics for trees if desired
        // physicsWorld.createCylinder(..., static) - simplified: just visual for now
    }

    // Create Axe
    const axePos = { x: 0, y: 5, z: 0 };
    const axeBody = physicsWorld.createAxeBody(axePos);
    const axeMesh = sceneManager.createAxeMesh();
    physicsWorld.addBody(axeBody, axeMesh);

    // 3. Setup Hand Tracking
    const handTracker = new HandTracker(videoElement);
    try {
        await handTracker.init();
        loadingElement.classList.add('hidden');
    } catch (e) {
        console.error(e);
        loadingElement.textContent = "Error: Camera access required.";
        return;
    }

    // 4. Interaction
    const interactionManager = new InteractionManager(sceneManager, physicsWorld);

    // 5. Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const dt = clock.getDelta();

        // Detect Hands
        const results = handTracker.detect();
        const landmarks = results ? results.landmarks : [];

        // Update Interaction
        interactionManager.update(landmarks);

        // Step Physics
        physicsWorld.step(dt);
        physicsWorld.sync();

        // Render
        sceneManager.render();
    }

    // Handle Resize
    window.addEventListener('resize', () => {
        sceneManager.onWindowResize();
    });

    animate();
}

main();
