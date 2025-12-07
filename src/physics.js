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
