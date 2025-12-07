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

    // Create some objects
    // Box
    const boxBody = physicsWorld.createBox(1, 1, 1, { x: -2, y: 5, z: 0 });
    const boxMesh = sceneManager.createBoxMesh(1, 1, 1, 0x00ffcc);
    physicsWorld.addBody(boxBody, boxMesh);

    // Sphere
    const sphereBody = physicsWorld.createSphere(0.7, { x: 2, y: 5, z: 0 });
    const sphereMesh = sceneManager.createSphereMesh(0.7, 0xff0066);
    physicsWorld.addBody(sphereBody, sphereMesh);

    // Another Box
    const box2Body = physicsWorld.createBox(0.8, 0.8, 0.8, { x: 0, y: 8, z: 0 });
    const box2Mesh = sceneManager.createBoxMesh(0.8, 0.8, 0.8, 0xffff00);
    physicsWorld.addBody(box2Body, box2Mesh);

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
