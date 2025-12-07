import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class InteractionManager {
    constructor(sceneManager, physicsWorld) {
        this.scene = sceneManager.scene;
        this.camera = sceneManager.camera;
        this.physicsWorld = physicsWorld;

        // Virtual hand (visual)
        this.handMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 })
        );
        this.scene.add(this.handMesh);

        // Virtual hand (physics)
        const shape = new CANNON.Sphere(0.2);
        this.handBody = new CANNON.Body({
            mass: 0, // Kinematic/Static (moved by us)
            position: new CANNON.Vec3(0, 5, 0),
            shape: shape,
            material: new CANNON.Material({ friction: 0, restitution: 0 }),
            collisionFilterGroup: 2, // specific group
            collisionFilterMask: 1 // collide with default
        });
        this.handBody.type = CANNON.Body.KINEMATIC;
        this.handBody.collisionResponse = false; // Don't bounce objects away just effectively
        // effectively we just want to use it as an anchor for constraints
        this.physicsWorld.world.addBody(this.handBody);

        this.constraint = null;
        this.isPinching = false;
    }

    update(landmarks) {
        if (!landmarks || landmarks.length === 0) {
            this.handMesh.visible = false;
            return;
        }

        // Take the first hand
        const hand = landmarks[0];

        // Index finger tip (8) and Thumb tip (4)
        const indexTip = hand[8];
        const thumbTip = hand[4];

        // Calculate pinch center (normalized 0-1)
        const screenX = (indexTip.x + thumbTip.x) / 2;
        const screenY = (indexTip.y + thumbTip.y) / 2;
        // z is not very reliable for absolute depth, usually we map screen x/y to a plane

        // Map to World Coordinates
        // Using a simple projection to a plane at Z=0 (where objects are mostly)
        // Or better: cast a ray from camera through screenX/Y and find intersection with a plane

        const vec = new THREE.Vector3();
        const pos = new THREE.Vector3();

        // MediaPipe x is 0(left) to 1(right). Three.js NDC is -1 to 1.
        // MediaPipe y is 0(top) to 1(bottom).
        vec.set(
            (1 - screenX) * 2 - 1, // Mirror x for self-view
            -(screenY * 2 - 1),
            0.5
        );

        vec.unproject(this.camera);
        vec.sub(this.camera.position).normalize();

        // Intersection with plane Z=0 (where objects are mostly located)
        // Ray: origin + t * dir
        // origin.z + t * dir.z = 0 => t = -origin.z / dir.z

        let t = -this.camera.position.z / vec.z;

        if (t > 0) { // Should be valid as camera is at z=8 and looking at 0,0,0
            pos.copy(this.camera.position).add(vec.multiplyScalar(t));
        } else {
            // Fallback
            pos.set(0, 0, 0);
        }

        // Update hand position
        this.handMesh.position.copy(pos);
        this.handMesh.visible = true;

        this.handBody.position.set(pos.x, pos.y, pos.z);

        // Pinch detection
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        // normalize by something?
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Threshold usually around 0.1 for better usability
        const PINCH_THRESHOLD = 0.1;
        const currentlyPinching = dist < PINCH_THRESHOLD;

        if (currentlyPinching && !this.isPinching) {
            this.grab(pos);
        } else if (!currentlyPinching && this.isPinching) {
            this.release();
        }

        this.isPinching = currentlyPinching;

        // Color change
        // Green = Grabbing, Red = Open
        this.handMesh.material.color.setHex(this.isPinching ? 0x00ff00 : 0xff0000);
    }

    grab(position) {
        if (this.constraint) return; // already grabbing

        // Raycast or check overlap to find body
        // Using simple distance check to all physics bodies
        let closestBody = null;
        let minDist = 1.5; // Max grab distance (Increased for better usability)

        for (let body of this.physicsWorld.bodies) {
            if (body.mass === 0) continue; // Don't grab static

            const distance = body.position.distanceTo(new CANNON.Vec3(position.x, position.y, position.z));

            // Debug distance
            // console.log("Dist to body", distance);

            if (distance < minDist) {
                minDist = distance;
                closestBody = body;
            }
        }

        if (closestBody) {
            // Create constraint
            this.constraint = new CANNON.PointToPointConstraint(
                closestBody,
                new CANNON.Vec3(0, 0, 0), // local pivot on body (center)
                this.handBody,
                new CANNON.Vec3(0, 0, 0) // local pivot on hand
            );
            this.physicsWorld.world.addConstraint(this.constraint);
        }
    }

    release() {
        if (this.constraint) {
            this.physicsWorld.world.removeConstraint(this.constraint);
            this.constraint = null;
        }
    }
}
