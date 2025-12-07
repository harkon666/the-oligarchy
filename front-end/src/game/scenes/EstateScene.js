import Phaser from 'phaser';
import runImg from '../../assets/game/run.png';
import walkImg from '../../assets/game/walk.png';
import idleImg from '../../assets/game/idle.png';
import { Player } from '../entities/Player';
import { createCharacterAnimations } from '../utils/Animation';

export default class EstateScene extends Phaser.Scene {
    constructor() {
        super('EstateScene');
        this.player = null;
    }

    init(data) {
        this.spawnX = data.x || 0;
        this.spawnY = data.y || 0;
    }

    preload() {
        // Load the sprite sheet
        // Frame dimensions 64x64 as requested
        this.load.spritesheet('character_run', runImg, { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('character_walk', walkImg, { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('character_idle', idleImg, { frameWidth: 64, frameHeight: 64 });
    }

    create() {
        // Background
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x333333).setOrigin(0);

        // Display Spawn Info
        this.add.text(20, 20, `Estate View`, { fontSize: '24px', fill: '#fff' });
        this.add.text(20, 50, `Spawning at Coordinate: [${this.spawnX}, ${this.spawnY}]`, {
            fontSize: '18px',
            fill: '#00ff00'
        });

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Create Animations
        createCharacterAnimations(this);

        // Create Player
        this.player = new Player(this, centerX, centerY);

        // Back Button
        const backText = this.add.text(20, 550, '< Back to Grid', {
            fontSize: '18px',
            fill: '#ffffff'
        }).setInteractive();

        backText.on('pointerdown', () => {
            this.scene.start('GridScene', { regionID: 'Returned' });
        });
    }

    update(time, delta) {
        if (this.player) {
            this.player.update(time, delta);
        }
    }
}
