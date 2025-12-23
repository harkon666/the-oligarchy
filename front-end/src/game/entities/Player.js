export class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'character_idle');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCollideWorldBounds(true);

        this.setScale(0.8);

        // Adjust collision box to feet only
        // Frame size is 64x64. We want a smaller box at the bottom.
        // setSize(width, height) - relative to the unscaled texture size usually, but let's test.
        // setOffset(x, y)
        this.body.setSize(32, 24);
        this.body.setOffset(16, 40);
        // this.body.setDepth();

        this.lastDirection = 'down';
        this.isMoving = false;

        this.cursors = scene.input.keyboard.createCursorKeys();
        // Add WASD keys
        this.wasd = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
    }

    update(time, delta) {
        const isRunning = this.cursors.shift.isDown;
        const speed = isRunning ? 0.4 : 0.2; // pixels per ms

        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            vx = -1;
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            vx = 1;
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            vy = -1;
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            vy = 1;
        }

        // Normalize vector
        if (vx !== 0 && vy !== 0) {
            const length = Math.sqrt(vx * vx + vy * vy);
            vx /= length;
            vy /= length;
        }

        // Move player
        // Use body velocity for physics collision support
        this.body.setVelocity(vx * speed * 1000, vy * speed * 1000); // Phaser physics uses px/sec

        // Clamp to screen (optional if world bounds are set correctly)
        // But let's keep it just in case, using the scene's physics world bounds
        // this.x = Phaser.Math.Clamp(this.x, 0, this.scene.physics.world.bounds.width);
        // this.y = Phaser.Math.Clamp(this.y, 0, this.scene.physics.world.bounds.height);

        // Animation
        let currentAnim = null;
        if (vx !== 0 || vy !== 0) {
            let direction = this.lastDirection;

            // Prioritize the axis with movement
            if (Math.abs(vx) > 0.01) {
                direction = vx < 0 ? 'left' : 'right';
            } else if (Math.abs(vy) > 0.01) {
                direction = vy < 0 ? 'up' : 'down';
            }

            this.lastDirection = direction;
            const animType = isRunning ? 'run' : 'walk';
            currentAnim = `${animType}-${direction}`;
            this.play(currentAnim, true);
            this.isMoving = true;
        } else {
            currentAnim = `idle-${this.lastDirection}`;
            this.play(currentAnim, true);

            if (this.isMoving) {
                this.isMoving = false;
                console.log('Player: Stopping movement, sending anim:', currentAnim);
                return { moved: true, anim: currentAnim }; // Signal stop
            }
        }

        if (this.isMoving) {
            return { moved: true, anim: currentAnim };
        }

        return { moved: false };
    }
}
