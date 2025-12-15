import Phaser from 'phaser';
import MultiplayerScene from './MultiplayerScene';
import runImg from '../../assets/game/run.png';
import walkImg from '../../assets/game/walk.png';
import idleImg from '../../assets/game/idle.png';
import { Player } from '../entities/Player';

export default class EstateScene extends MultiplayerScene {
    constructor() {
        super('EstateScene');
    }

    init(data) {
        this.spawnX = data.x || 1000;
        this.spawnY = data.y || 1000;
        this.nameCity = data.nameCity || 'Unknown';
    }

    preload() {
        this.load.spritesheet('character_run', runImg, { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('character_walk', walkImg, { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('character_idle', idleImg, { frameWidth: 64, frameHeight: 64 });
    }

    create() {
        super.create();

        // Background
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x333333).setOrigin(0);

        // Display Spawn Info
        this.add.text(20, 20, `Estate View`, { fontSize: '24px', fill: '#fff' });
        this.add.text(20, 50, `Spawning at Coordinate: [${this.spawnX}, ${this.spawnY}]`, {
            fontSize: '18px',
            fill: '#00ff00'
        });
        this.add.text(20, 80, `City Name: ${this.nameCity}`, {
            fontSize: '18px',
            fill: '#00ff00'
        });

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Entities
        this.player = new Player(this, centerX, centerY);

        // Back Button
        const backText = this.add.text(20, 550, '< Back to Grid', {
            fontSize: '18px',
            fill: '#ffffff'
        }).setInteractive();

        backText.on('pointerdown', () => {
            this.scene.start('GridScene', { regionID: 'Returned' });
        });

        this.startMultiplayer();
    }

    update(time, delta) {
        super.update(time, delta);
    }
}
