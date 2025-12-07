import Phaser from 'phaser';

export default class GridScene extends Phaser.Scene {
    constructor() {
        super('GridScene');
    }

    init(data) {
        this.regionID = data.regionID || 'Unknown';
    }

    create() {
        this.add.text(20, 20, `Region: ${this.regionID}`, {
            fontSize: '24px',
            fill: '#ffffff'
        });

        this.add.text(20, 50, 'Select an Empty Plot (Green)', {
            fontSize: '16px',
            fill: '#cccccc'
        });

        // Hexagon Configuration
        const hexRadius = 30; // Size of the hexagon (center to corner)
        const hexWidth = Math.sqrt(3) * hexRadius;
        const hexHeight = 2 * hexRadius;
        const mapRadius = 5; // Radius of the map in hexes

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Helper to calculate hexagon vertices
        const getHexagonPoints = (x, y, radius) => {
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle_deg = 60 * i - 30; // Pointy topped
                const angle_rad = Math.PI / 180 * angle_deg;
                points.push({
                    x: x + radius * Math.cos(angle_rad),
                    y: y + radius * Math.sin(angle_rad)
                });
            }
            return points;
        };

        // Generate Hex Grid (Axial Coordinates)
        // q = column, r = row
        for (let q = -mapRadius; q <= mapRadius; q++) {
            const r1 = Math.max(-mapRadius, -q - mapRadius);
            const r2 = Math.min(mapRadius, -q + mapRadius);

            for (let r = r1; r <= r2; r++) {
                // Axial to Pixel conversion (Pointy topped)
                const x = centerX + (hexRadius * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r));
                const y = centerY + (hexRadius * (3 / 2 * r));

                const isCenter = (q === 0 && r === 0);
                // Random ownership (20% chance), center is never owned
                const isOwned = !isCenter && Math.random() < 0.2;

                // Draw Hexagon
                // Center hex is 50% larger
                const currentHexRadius = isCenter ? hexRadius : hexRadius;
                const points = getHexagonPoints(x, y, currentHexRadius - 2); // -2 for gap
                const graphics = this.add.graphics();

                // Color
                let color = 0x00FF00; // Default Green
                if (isCenter) color = 0xFFD700; // Gold
                else if (isOwned) color = 0x555555; // Dark Grey for owned

                const alpha = 0.8;

                graphics.fillStyle(color, alpha);
                graphics.fillPoints(points, true);

                // Ensure center is drawn on top if it overlaps
                if (isCenter) {
                    graphics.setDepth(1);
                }

                // Interaction Zone (Polygon)
                const hitArea = new Phaser.Geom.Polygon(points);

                // Making graphics interactive with a polygon hit area:
                graphics.setInteractive(hitArea, Phaser.Geom.Polygon.Contains);

                graphics.on('pointerdown', () => {
                    console.log(`Hex clicked at q:${q}, r:${r}, owned:${isOwned}`);

                    if (isOwned) {
                        console.log("This land is already owned!");
                        // Optional: Play a sound or show a message
                        return;
                    }

                    if (isCenter) {
                        console.log("Center hex clicked!");
                        this.scene.start('CapitalScene');
                        return;
                    }
                    // Pass axial coordinates or convert to offset if needed
                    this.scene.start('EstateScene', { x: q, y: r, type: isCenter ? 'center' : 'plot' });
                });

                graphics.on('pointerover', () => {
                    graphics.clear();
                    if (isOwned) {
                        graphics.fillStyle(0xFF0000, 0.5); // Red highlight for owned
                        this.game.canvas.style.cursor = 'not-allowed';
                    } else {
                        graphics.fillStyle(0x32CD32, 1); // Highlight
                        this.game.canvas.style.cursor = 'pointer';
                    }
                    graphics.fillPoints(points, true);
                });

                graphics.on('pointerout', () => {
                    graphics.clear();
                    graphics.fillStyle(color, alpha); // Restore
                    graphics.fillPoints(points, true);
                    this.game.canvas.style.cursor = 'default';
                });

                // Optional: Add coordinate text for debugging
                // this.add.text(x, y, `${q},${r}`, { fontSize: '10px', color: '#000' }).setOrigin(0.5);
            }
        }

        // Back Button
        const backText = this.add.text(20, 550, '< Back to Map', {
            fontSize: '18px',
            fill: '#ffffff'
        }).setInteractive();

        backText.on('pointerdown', () => {
            this.scene.start('WorldMapScene');
        });
    }
}
