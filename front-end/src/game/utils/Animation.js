export const createCharacterAnimations = (scene) => {
    const directions = ['up', 'left', 'down', 'right'];
    const rowOffset = 13;

    // Idle (2 frames)
    directions.forEach((dir, index) => {
        scene.anims.create({
            key: `idle-${dir}`,
            frames: scene.anims.generateFrameNumbers('character_idle', { start: index * rowOffset, end: index * rowOffset + 1 }),
            frameRate: 4,
            repeat: -1
        });
    });

    // Walk (Assuming 8 frames)
    directions.forEach((dir, index) => {
        scene.anims.create({
            key: `walk-${dir}`,
            frames: scene.anims.generateFrameNumbers('character_walk', { start: index * rowOffset, end: index * rowOffset + 7 }),
            frameRate: 10,
            repeat: -1
        });
    });

    // Run (Assuming 8 frames)
    directions.forEach((dir, index) => {
        scene.anims.create({
            key: `run-${dir}`,
            frames: scene.anims.generateFrameNumbers('character_run', { start: index * rowOffset, end: index * rowOffset + 7 }),
            frameRate: 15,
            repeat: -1
        });
    });
};
