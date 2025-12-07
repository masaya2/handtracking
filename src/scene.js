import * as THREE from 'three';

export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky Blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.set(0, 3, 6); // Lower camera angle
        this.camera.lookAt(0, 2, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;

        // Lights
        this.setupLights();

        // Grid Helper
        // const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        // this.scene.add(gridHelper);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Brighter ambient
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfffaed, 0.9); // Sunlight
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
    }

    createFloor() {
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({
            color: 0x3b5e2b, // Dark Green Grass
            roughness: 1.0,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        return mesh;
    }

    createBoxMesh(width, height, depth, color) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.5 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        return mesh;
    }

    createSphereMesh(radius, color) {
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2, metalness: 0.8 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        return mesh;
    }

    createTreeMesh(x, z) {
        const group = new THREE.Group();

        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // Leaves
        const leavesGeo = new THREE.ConeGeometry(2.5, 6, 8);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d4c1e, roughness: 0.8 });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = 5;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        group.add(leaves);

        group.position.set(x, 0, z);
        this.scene.add(group);
        return group;
    }

    createAxeMesh() {
        const group = new THREE.Group();

        // Handle
        const handleGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
        const handleMat = new THREE.MeshStandardMaterial({
            color: 0x8b4513, // SaddleBrown
            roughness: 0.8,
            metalness: 0.1
        });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        // Align visual with physics: Physics cylinder is along Z, rotated to Y.
        // Three.js visual is Y by default.
        // Physics body center is at local (0,0,0).
        // Our physics compound shape offsets:
        // Handle: center (0,0,0)
        // Blade: center (0, 0.5, 0)

        // Wait, in createAxeBody:
        // handleShape is added at (0,0,0) with q rotation. 
        // Cannon Cylinder is along Z. Rotating -90 deg X makes it along Y.
        // So visual handle (along Y) at (0,0,0) matches.

        handle.position.set(0, 0, 0);
        handle.castShadow = true;
        group.add(handle);

        // Blade
        const bladeGeo = new THREE.BoxGeometry(0.8, 0.6, 0.1);
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc, // Silver
            metalness: 0.9,
            roughness: 0.3
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        // Physics blade is at (0, 0.5, 0) relative to body center
        blade.position.set(0, 0.5, 0);
        blade.castShadow = true;
        group.add(blade);

        this.scene.add(group);
        return group;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
