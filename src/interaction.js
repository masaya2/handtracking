import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [5, 9], [9, 10], [10, 11], [11, 12], // Middle
    [9, 13], [13, 14], [14, 15], [15, 16], // Ring
    [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // Pinky + Palm base
];

class HandController {
    constructor(sceneManager, physicsWorld, id) {
        this.scene = sceneManager.scene;
        this.camera = sceneManager.camera;
        this.physicsWorld = physicsWorld;
        this.id = id;

        // Visuals
        this.handGroup = new THREE.Group();
        this.scene.add(this.handGroup);
        this.joints = [];
        this.bones = [];
        this.setupVisuals();

        // Virtual hand (physics anchor for grabbing)
        // We keep this kinematic body to act as the anchor point for constraints
        const shape = new CANNON.Sphere(0.1);
        this.handBody = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(0, 5, 0),
            shape: shape,
            material: new CANNON.Material({ friction: 0, restitution: 0 }),
            collisionFilterGroup: 2,
            collisionFilterMask: 0 // collide with nothing
        });
        this.handBody.type = CANNON.Body.KINEMATIC;
        this.handBody.collisionResponse = false;
        this.physicsWorld.world.addBody(this.handBody);

        this.constraint = null;
        this.isPinching = false;
    }

    setupVisuals() {
        // Materials
        this.jointMaterial = new THREE.MeshBasicMaterial({
            color: 0xe0ac69, // Skin tone
            depthTest: false
        });
        this.boneMaterial = new THREE.MeshBasicMaterial({
            color: 0xffcc88, // Lighter skin tone
            depthTest: false
        });

        const jointGeo = new THREE.SphereGeometry(0.04, 16, 16);
        const boneGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
        boneGeo.translate(0, 0.5, 0); // Pivot at the bottom to make scaling easier

        // Create 21 Joints
        for (let i = 0; i < 21; i++) {
            const mesh = new THREE.Mesh(jointGeo, this.jointMaterial.clone()); // Clone material to change color individually if needed
            mesh.renderOrder = 999;
            this.handGroup.add(mesh);
            this.joints.push(mesh);
        }

        // Create Bones
        for (let pair of CONNECTIONS) {
            const mesh = new THREE.Mesh(boneGeo, this.boneMaterial);
            mesh.renderOrder = 998;
            this.handGroup.add(mesh);
            this.bones.push({ mesh: mesh, indices: pair });
        }

        this.handGroup.visible = false;
    }

    update(handLandmarks) {
        if (!handLandmarks) {
            this.setVisible(false);
            return;
        }

        // Project all landmarks to World Coordinates (Z=0 plane)
        const worldPositions = [];
        for (let lm of handLandmarks) {
            const vec = new THREE.Vector3(
                (1 - lm.x) * 2 - 1,
                -(lm.y * 2 - 1),
                0.5
            );
            vec.unproject(this.camera);
            vec.sub(this.camera.position).normalize();

            // Intersection with plane Z=0
            const t = -this.camera.position.z / vec.z;
            const pos = new THREE.Vector3().copy(this.camera.position).add(vec.multiplyScalar(t));
            worldPositions.push(pos);
        }

        // Update Joints
        for (let i = 0; i < 21; i++) {
            this.joints[i].position.copy(worldPositions[i]);
        }

        // Update Bones
        const up = new THREE.Vector3(0, 1, 0);
        for (let bone of this.bones) {
            const start = worldPositions[bone.indices[0]];
            const end = worldPositions[bone.indices[1]];
            const dist = start.distanceTo(end);

            bone.mesh.position.copy(start);
            bone.mesh.scale.set(1, dist, 1);

            // Orient cylinder
            // Cylinder default (0,1,0)
            // We want to rotate 'up' to (end - start)
            bone.mesh.quaternion.setFromUnitVectors(up, end.clone().sub(start).normalize());
        }

        this.setVisible(true);

        // Physics & Interaction Logic (Keep pinch center based)
        const indexTip = worldPositions[8];
        const thumbTip = worldPositions[4];

        // Center position for physics body
        const centerPos = new THREE.Vector3().addVectors(indexTip, thumbTip).multiplyScalar(0.5);
        this.handBody.position.set(centerPos.x, centerPos.y, centerPos.z);

        // Pinch Detection
        // Since we are in 3D world space (on plane), we use actual distance
        const dist = indexTip.distanceTo(thumbTip);
        const PINCH_THRESHOLD = 0.4; // Adjusted for world units (roughly 50cm? No, trees are large. 0.5 is reasonable, maybe 0.3)
        // With z=6 camera, 0.3 is fairly small. Let's try 0.4.

        const currentlyPinching = dist < PINCH_THRESHOLD;

        if (currentlyPinching && !this.isPinching) {
            this.grab(centerPos);
        } else if (!currentlyPinching && this.isPinching) {
            this.release();
        }

        this.isPinching = currentlyPinching;

        // Visual grab feedback
        const color = this.isPinching ? 0x8d5524 : 0xe0ac69; // Darker when grabbing
        this.joints.forEach(j => j.material.color.setHex(color));
    }

    setVisible(visible) {
        this.handGroup.visible = visible;
        if (!visible) {
            this.release();
            this.handBody.position.set(0, -100, 0);
        }
    }

    grab(position) {
        if (this.constraint) return;

        // Raycast or check overlap to find body
        let closestBody = null;
        let minDist = 2.0; // Max grab distance

        for (let body of this.physicsWorld.bodies) {
            if (body.mass === 0) continue; // Don't grab static
            if (body === this.handBody) continue; // Don't grab self? (Self is kinematic/static anyway usually, but good to be safe)

            const distance = body.position.distanceTo(new CANNON.Vec3(position.x, position.y, position.z));

            if (distance < minDist) {
                minDist = distance;
                closestBody = body;
            }
        }

        if (closestBody) {
            // Create constraint
            this.constraint = new CANNON.PointToPointConstraint(
                closestBody,
                new CANNON.Vec3(0, 0, 0), // local pivot on body (center) - simplified
                this.handBody,
                new CANNON.Vec3(0, 0, 0) // local pivot on hand
            );
            this.physicsWorld.world.addConstraint(this.constraint);

            // Wake up body if sleeping
            closestBody.wakeUp();
        }
    }

    release() {
        if (this.constraint) {
            this.physicsWorld.world.removeConstraint(this.constraint);
            this.constraint = null;
        }
    }
}

export class InteractionManager {
    constructor(sceneManager, physicsWorld) {
        this.hands = [
            new HandController(sceneManager, physicsWorld, 0),
            new HandController(sceneManager, physicsWorld, 1)
        ];
    }

    update(landmarks) {
        // landmarks is array of hands (e.g. [hand1_landmarks, hand2_landmarks])
        // We can't guarantee landmarks[0] is always left or right, it depends on detection order.
        // But for this simple purpose, mapping index 0 to hand 0 and index 1 to hand 1 is fine.

        for (let i = 0; i < 2; i++) {
            if (landmarks && landmarks[i]) {
                this.hands[i].update(landmarks[i]);
            } else {
                this.hands[i].setVisible(false);
            }
        }
    }
}
