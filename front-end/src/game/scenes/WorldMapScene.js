import Phaser from 'phaser';

// Import assets
import worldMapUrl from '../../assets/game/worldmaps/worldMap.tmj?url';
import cityStateImg from '../../assets/game/worldmaps/cityState.png';
import capitalImg from '../../assets/game/worldmaps/capital.png';
import worldMapImg from '../../assets/game/worldmaps/worldMap.png';

// Region theme colors
const REGION_COLORS = {
    war: 0xff4444,      // Red
    farm: 0x44ff44,     // Green
    trade: 0xffdd44,    // Gold
    default: 0x4488ff   // Blue
};

const REGION_EMOJIS = {
    war: '❄️',
    farm: '🌲',
    trade: '☀️'
};

export default class WorldMapScene extends Phaser.Scene {
    constructor() {
        super('WorldMapScene');
        this.regionData = new Map(); // Store region info
        this.regionGraphics = new Map(); // Store region graphics for hover effects
        this.hoveredRegion = null;
    }

    preload() {
        // Load the tilemap
        this.load.tilemapTiledJSON('worldMap', worldMapUrl);

        // Load the tileset images
        this.cameras.main.setBackgroundColor('#4488aa');
        this.load.image('cityState', cityStateImg);
        this.load.image('capital', capitalImg);
        this.load.image('worldMapImage', worldMapImg);
    }

    create() {
        console.log('WorldMapScene: create started');
        this.visualIcons = this.add.group();

        // Create the map
        const map = this.make.tilemap({ key: 'worldMap' });

        // Setup Tilesets
        this.setupTilesets(map);

        // Create Layers
        this.createBackground(map);
        this.createTerritories(map);
        this.createDecorations(map);
        this.createCities(map);

        // Create region info tooltip
        this.createTooltip();

        // Setup Camera
        this.setupCamera(map);
    }

    setupTilesets(map) {
        map.addTilesetImage('cityState', 'cityState');
        map.addTilesetImage('capital', 'capital');
        map.addTilesetImage('worldMap', 'worldMapImage');
        console.log('Map Tilesets:', map.tilesets);
    }

    createBackground(map) {
        this.add.image(0, 0, 'worldMapImage').setOrigin(0, 0).setDepth(0);
    }

    createTerritories(map) {
        const territoriesLayer = map.getObjectLayer("Logic/Territories");

        if (!territoriesLayer) {
            console.error("❌ Layer 'Logic/Territories' not found!");
            return;
        }

        console.log('Found Territories Layer:', territoriesLayer);

        territoriesLayer.objects.forEach(obj => {
            if (!obj.polygon) return;

            // Extract region properties
            const regionId = obj.properties?.find(p => p.name === 'regionId')?.value;
            const theme = obj.properties?.find(p => p.name === 'theme')?.value || 'default';
            const regionName = obj.name || `Region ${regionId}`;

            // Store region data
            this.regionData.set(regionId, {
                id: regionId,
                name: regionName,
                theme: theme,
                x: obj.x,
                y: obj.y,
                polygon: obj.polygon
            });

            // Get color based on theme
            const color = REGION_COLORS[theme] || REGION_COLORS.default;

            // Create graphics for the polygon
            const graphics = this.add.graphics();
            this.regionGraphics.set(regionId, graphics);

            // Draw normal state
            this.drawRegionPolygon(graphics, obj, color, 0.15);

            // Create hit area polygon with WORLD coordinates (obj.x/y + polygon offsets)
            const worldPoints = obj.polygon.map(p => ({ x: p.x + obj.x, y: p.y + obj.y }));
            const hitPolygon = new Phaser.Geom.Polygon(worldPoints);

            // Calculate bounding box for the zone
            const bounds = Phaser.Geom.Polygon.GetAABB(hitPolygon);

            // Create interactive zone at origin (0,0) so hit test uses world coords
            const zone = this.add.zone(0, 0, this.cameras.main.width * 4, this.cameras.main.height * 4);
            zone.setOrigin(0, 0);
            zone.setInteractive({
                hitArea: hitPolygon,
                hitAreaCallback: (hitArea, x, y, gameObject) => {
                    // Convert pointer position to world coordinates
                    const worldPoint = this.cameras.main.getWorldPoint(
                        this.input.activePointer.x,
                        this.input.activePointer.y
                    );
                    return Phaser.Geom.Polygon.Contains(hitArea, worldPoint.x, worldPoint.y);
                },
                useHandCursor: true
            });
            zone.setDepth(50); // Above graphics, below cities

            zone.regionId = regionId;
            zone.regionTheme = theme;
            zone.regionName = regionName;
            zone.regionObj = obj; // Store for reference

            // Hover events
            zone.on('pointerover', () => {
                this.hoveredRegion = {
                    id: regionId,
                    name: regionName,
                    theme: theme,
                    emoji: REGION_EMOJIS[theme] || '🏰'
                };
                // Highlight region
                this.drawRegionPolygon(graphics, obj, color, 0.4);
            });

            zone.on('pointerout', () => {
                this.hoveredRegion = null;
                // Reset region
                this.drawRegionPolygon(graphics, obj, color, 0.15);
            });

            zone.on('pointerdown', () => {
                console.log(`Clicked region: ${regionName} (ID: ${regionId}, Theme: ${theme})`);
                // Could emit event or show region-specific modal
            });
        });
    }

    drawRegionPolygon(graphics, obj, color, alpha) {
        graphics.clear();
        graphics.lineStyle(3, color, 0.8);
        graphics.fillStyle(color, alpha);

        graphics.beginPath();
        graphics.moveTo(obj.polygon[0].x, obj.polygon[0].y);
        for (let i = 1; i < obj.polygon.length; i++) {
            graphics.lineTo(obj.polygon[i].x, obj.polygon[i].y);
        }
        graphics.closePath();
        graphics.strokePath();
        graphics.fillPath();

        graphics.setPosition(obj.x, obj.y);
        graphics.setDepth(5);
    }

    createTooltip() {
        // Create tooltip container (initially hidden)
        this.tooltip = this.add.container(0, 0).setDepth(1000).setScrollFactor(0).setVisible(false);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.85);
        bg.fillRoundedRect(0, 0, 200, 100, 8);
        this.tooltip.add(bg);

        // Title text
        this.tooltipTitle = this.add.text(10, 8, '', {
            fontSize: '18px',
            fontStyle: 'bold',
            fill: '#ffffff'
        });
        this.tooltip.add(this.tooltipTitle);

        // Theme text
        this.tooltipTheme = this.add.text(10, 32, '', {
            fontSize: '14px',
            fill: '#aaaaaa'
        });
        this.tooltip.add(this.tooltipTheme);

        // Stats text
        this.tooltipStats = this.add.text(10, 55, '', {
            fontSize: '12px',
            fill: '#88ff88'
        });
        this.tooltip.add(this.tooltipStats);
    }

    createDecorations(map) {
        const decorationsLayer = map.getObjectLayer('Visuals/Decorations');
        if (!decorationsLayer) {
            console.error("❌ Layer 'Visuals/Decorations' not found!");
            return;
        }

        decorationsLayer.objects.forEach(obj => {
            let textureKey = 'cityState';

            if (obj.gid) {
                const tileset = map.tilesets.find(t => obj.gid >= t.firstgid && obj.gid < (t.firstgid + t.total));
                if (tileset) {
                    if (tileset.name.includes('capital')) textureKey = 'capital';
                    else if (tileset.name.includes('city')) textureKey = 'cityState';
                }
            }

            const sprite = this.add.sprite(obj.x, obj.y, textureKey);
            sprite.setInteractive();
            sprite.setOrigin(0, 1);

            if (obj.width && obj.height) {
                sprite.setDisplaySize(obj.width, obj.height);
            }

            sprite.name = obj.name || `sprite_${obj.x}_${obj.y}`;
            this.visualIcons.add(sprite);
            sprite.setDepth(10);
        });
    }

    createCities(map) {
        const citiesLayer = map.objects.find(o => o.name === 'Logic/Cities');

        if (!citiesLayer) {
            console.warn('Cities layer not found');
            return;
        }

        citiesLayer.objects.forEach(obj => {
            const isInteractive = !obj.gid || obj.properties?.some(p => p.name === 'targetScene');

            if (isInteractive) {
                const zone = this.add.zone(obj.x, obj.y, obj.width, obj.height);
                zone.setOrigin(0, 0);
                zone.setDepth(100);
                zone.setInteractive();

                // Link Zone to Sprite
                const linkedSprite = this.visualIcons.getChildren().find(sprite => {
                    if (obj.name && sprite.name === obj.name) return true;
                    const diffX = Math.abs(sprite.x - obj.x);
                    const diffY = Math.abs(sprite.y - (obj.y + obj.height));
                    return diffX < 32 && diffY < 32;
                });

                if (linkedSprite) {
                    zone.linkedSprite = linkedSprite;
                }

                // Hover Effects
                zone.on('pointerover', () => {
                    this.input.setDefaultCursor('pointer');
                    if (zone.linkedSprite) {
                        zone.linkedSprite.setTint(0xffdd00);
                    }
                });

                zone.on('pointerout', () => {
                    this.input.setDefaultCursor('default');
                    if (zone.linkedSprite) {
                        zone.linkedSprite.clearTint();
                    }
                });

                // Add Text Label
                if (obj.name) {
                    const label = this.add.text(obj.x + obj.width / 2, obj.y - 10, obj.name, {
                        fontSize: '14px',
                        fill: '#ffffff',
                        backgroundColor: '#000000aa',
                        padding: { x: 4, y: 2 },
                        align: 'center'
                    });
                    label.setOrigin(0.5, 1);
                    label.setDepth(20);
                }

                // Interaction
                const targetScene = obj.properties?.find(p => p.name === 'targetScene')?.value;

                zone.on('pointerdown', () => {
                    console.log(`Clicked on ${obj.name}, going to ${targetScene}`);
                    if (targetScene === 'CapitalScene') {
                        this.scene.start(targetScene, { cityId: obj.id, cityName: obj.name });
                    } else {
                        this.scene.start('EstateScene', { x: obj.x, y: obj.y, type: 'plot', nameCity: obj.name });
                    }
                });
            }
        });
    }

    setupCamera(map) {
        const camera = this.cameras.main;
        camera.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Calculate minimum zoom so map fills the screen
        const minZoomX = this.cameras.main.width / map.widthInPixels;
        const minZoomY = this.cameras.main.height / map.heightInPixels;
        const minZoom = Math.max(minZoomX, minZoomY, 0.5); // At least 0.5 or fit-to-screen

        // Zoom with scroll wheel
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (deltaY > 0) {
                // Zoom out - limit to minZoom
                camera.zoom = Math.max(minZoom, camera.zoom - 0.1);
            } else {
                // Zoom in - limit to 3x
                camera.zoom = Math.min(3, camera.zoom + 0.1);
            }
        });

        // Pan
        let isPanning = false;
        let startPoint = new Phaser.Math.Vector2();

        this.input.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                isPanning = true;
                startPoint.x = pointer.x;
                startPoint.y = pointer.y;
            }
        });

        this.input.on('pointerup', () => {
            isPanning = false;
        });

        this.input.on('pointermove', (pointer) => {
            if (isPanning) {
                camera.scrollX -= (pointer.x - startPoint.x) / camera.zoom;
                camera.scrollY -= (pointer.y - startPoint.y) / camera.zoom;
                startPoint.x = pointer.x;
                startPoint.y = pointer.y;
            }
        });
    }

    update(time, delta) {
        // Update tooltip position and content
        if (this.hoveredRegion && this.tooltip) {
            const pointer = this.input.activePointer;
            this.tooltip.setPosition(pointer.x + 15, pointer.y + 15);
            this.tooltip.setVisible(true);

            const region = this.hoveredRegion;
            this.tooltipTitle.setText(`${region.emoji} ${region.name}`);
            this.tooltipTheme.setText(`Theme: ${region.theme.charAt(0).toUpperCase() + region.theme.slice(1)}`);
            this.tooltipStats.setText(`Region ID: ${region.id}\nClick to view details`);
        } else if (this.tooltip) {
            this.tooltip.setVisible(false);
        }
    }
}
