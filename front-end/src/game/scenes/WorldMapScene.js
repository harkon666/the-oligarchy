import Phaser from 'phaser';

export default class WorldMapScene extends Phaser.Scene {
    constructor() {
        super('WorldMapScene');
    }

    preload() {
        // No assets to preload for this scene as we use Graphics
    }

    create() {
        // Background
        this.cameras.main.setBackgroundColor('#87CEEB');

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        const radius = 200;

        // Draw the main continent circle
        const graphics = this.add.graphics();
        graphics.fillStyle(0xD2B48C, 1); // Tan color for land
        graphics.fillCircle(centerX, centerY, radius);

        // Create 3 clickable regions
        this.createRegion(centerX, centerY - 80, 'Region A', 'A');
        this.createRegion(centerX - 70, centerY + 60, 'Region B', 'B');
        this.createRegion(centerX + 70, centerY + 60, 'Region C', 'C');

        // Title
        this.add.text(centerX, 50, 'The Oligarchy - World Map', {
            fontSize: '32px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(centerX, 550, 'Select a Region to Enter', {
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);
    }

    createRegion(x, y, label, regionID) {
        const regionRadius = 60;

        // Visual representation
        const graphics = this.add.graphics();
        graphics.fillStyle(0x228B22, 0.8); // Forest Green
        graphics.fillCircle(x, y, regionRadius);

        // Interactive zone
        const zone = this.add.zone(x, y, regionRadius * 2, regionRadius * 2)
            .setCircleDropZone(regionRadius)
            .setInteractive();

        zone.on('pointerdown', () => {
            console.log(`Region ${regionID} clicked`);
            this.scene.start('GridScene', { regionID: regionID });
        });

        // Hover effect
        zone.on('pointerover', () => {
            graphics.clear();
            graphics.fillStyle(0x32CD32, 1); // Lighter Green
            graphics.fillCircle(x, y, regionRadius);
            this.game.canvas.style.cursor = 'pointer';
        });

        zone.on('pointerout', () => {
            graphics.clear();
            graphics.fillStyle(0x228B22, 0.8); // Back to original
            graphics.fillCircle(x, y, regionRadius);
            this.game.canvas.style.cursor = 'default';
        });

        // Label
        this.add.text(x, y, label, {
            fontSize: '16px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }
}
