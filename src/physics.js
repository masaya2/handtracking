import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;

        // Materials
        this.defaultMaterial = new CANNON.Material('default');
        this.defaultContactMaterial = new CANNON.ContactMaterial(
            this.defaultMaterial,
            this.defaultMaterial,
            {
                friction: 0.4,
                restitution: 0.3,
            }
        );
        this.world.addContactMaterial(this.defaultContactMaterial);

        this.bodies = [];
        this.meshes = []; // Keep track to sync

        this.addGround();
    }

    addGround() {
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0, material: this.defaultMaterial });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);
        return groundBody;
    }

    createBox(width, height, depth, position) {
        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const body = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            shape: shape,
            material: this.defaultMaterial
        });
        this.world.addBody(body);
        return body;
    }

    createSphere(radius, position) {
        const shape = new CANNON.Sphere(radius);
        const body = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            shape: shape,
            material: this.defaultMaterial
        });
        this.world.addBody(body);
        return body;
    }

    createAxeBody(position) {
        const body = new CANNON.Body({
            mass: 2, // Heavier
            position: new CANNON.Vec3(position.x, position.y, position.z),
            material: this.defaultMaterial
        });

        // Handle (Cylinder)
        // Cannon Cylinder is aligned with Z axis. We want it along Y.
        const handleShape = new CANNON.Cylinder(0.1, 0.1, 1.5, 8);
        const q = new CANNON.Quaternion();
        q.setFromEuler(-Math.PI / 2, 0, 0); // Rotate Z to Y
        body.addShape(handleShape, new CANNON.Vec3(0, 0, 0), q);

        // Blade (Box)
        // Box takes half-extents
        const bladeShape = new CANNON.Box(new CANNON.Vec3(0.4, 0.3, 0.05));
        body.addShape(bladeShape, new CANNON.Vec3(0, 0.5, 0));

        this.world.addBody(body);
        return body;
    }

    addBody(body, mesh) {
        this.world.addBody(body);
        this.bodies.push(body);
        this.meshes.push(mesh);
    }

    step(dt) {
        this.world.step(1 / 60, dt, 3);
    }

    sync() {
        for (let i = 0; i < this.bodies.length; i++) {
            const b = this.bodies[i];
            const m = this.meshes[i];
            if (m && b) {
                m.position.copy(b.position);
                m.quaternion.copy(b.quaternion);
            }
        }
    }
}
