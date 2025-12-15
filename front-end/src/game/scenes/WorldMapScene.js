import Phaser from 'phaser';

// Import assets
import worldMapUrl from '../../assets/game/worldmaps/worldMap.tmj?url';
import cityStateImg from '../../assets/game/worldmaps/cityState.png';
import capitalImg from '../../assets/game/worldmaps/capital.png';
import worldMapImg from '../../assets/game/worldmaps/worldMap.png';

export default class WorldMapScene extends Phaser.Scene {
    constructor() {
        super('WorldMapScene');
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

        // Setup Camera
        this.setupCamera(map);
    }

    setupTilesets(map) {
        // The first argument must match the name in Tiled
        map.addTilesetImage('cityState', 'cityState');
        map.addTilesetImage('capital', 'capital');
        map.addTilesetImage('worldMap', 'worldMapImage');
        console.log('Map Tilesets:', map.tilesets);
    }

    createBackground(map) {
        // Tiled Image Layers are stored in map.images
        const backgroundLayer = map.images.find(layer => layer.name === 'Visuals/Background');
        if (backgroundLayer) {
            this.add.image(0, 0, 'worldMapImage').setOrigin(0, 0).setDepth(0);
        } else {
            console.warn('Background image layer not found in map data, adding manually');
            this.add.image(0, 0, 'worldMapImage').setOrigin(0, 0).setDepth(0);
        }
    }

    createTerritories(map) {
        const territoriesLayer = map.getObjectLayer("Logic/Territories");

        if (territoriesLayer) {
            console.log('Found Territories Layer:', territoriesLayer);

            territoriesLayer.objects.forEach(obj => {
                if (obj.polygon) {
                    const graphics = this.add.graphics();
                    graphics.lineStyle(4, 0xff0000, 1); // Red outline
                    graphics.fillStyle(0xffffff, 0.2); // Transparent white fill

                    graphics.beginPath();
                    graphics.moveTo(obj.polygon[0].x, obj.polygon[0].y);
                    for (let i = 1; i < obj.polygon.length; i++) {
                        graphics.lineTo(obj.polygon[i].x, obj.polygon[i].y);
                    }
                    graphics.closePath();
                    graphics.strokePath();
                    graphics.fillPath();

                    // Polygon coordinates are relative to obj.x/y
                    graphics.setPosition(obj.x, obj.y);
                    graphics.setDepth(5); // Between Background and Cities
                }
            });
        } else {
            console.error("❌ Layer 'Logic/Territories' not found!");
        }
    }

    createDecorations(map) {
        // Phaser flattens object layers from groups into map.objects
        const decorationsLayer = map.getObjectLayer('Visuals/Decorations');
        if (decorationsLayer) {
            console.log('Found Decorations Layer:', decorationsLayer);
            decorationsLayer.objects.forEach(obj => {
                let textureKey = 'cityState'; // Default

                if (obj.gid) {
                    const tileset = map.tilesets.find(t => obj.gid >= t.firstgid && obj.gid < (t.firstgid + t.total));
                    if (tileset) {
                        if (tileset.name.includes('capital')) textureKey = 'capital';
                        else if (tileset.name.includes('city')) textureKey = 'cityState';
                    }
                }

                const sprite = this.add.sprite(obj.x, obj.y, textureKey);
                sprite.setInteractive();
                sprite.setOrigin(0, 1); // Tiled Objects anchor is Bottom-Left

                if (obj.width && obj.height) {
                    sprite.setDisplaySize(obj.width, obj.height);
                }

                sprite.name = obj.name || `sprite_${obj.x}_${obj.y}`;
                this.visualIcons.add(sprite);
                sprite.setDepth(1); // Above background
            });
        } else {
            console.error("❌ Layer 'Visuals/Decorations' not found! Check exact name.");
        }
    }

    createCities(map) {
        const citiesLayer = map.objects.find(o => o.name === 'Logic/Cities');

        if (citiesLayer) {
            console.log('Found Cities Layer:', citiesLayer);
            citiesLayer.objects.forEach(obj => {
                const isInteractive = !obj.gid || obj.properties?.some(p => p.name === 'targetScene');

                if (isInteractive) {
                    const zone = this.add.zone(obj.x, obj.y, obj.width, obj.height);
                    zone.setOrigin(0, 0); // Top-Left for Tiled Rectangles
                    zone.setDepth(100);
                    zone.setInteractive();

                    // Link Zone to Sprite
                    const linkedSprite = this.visualIcons.getChildren().find(sprite => {
                        // Check Name
                        if (obj.name && sprite.name === obj.name) {
                            return true;
                        }
                        // Check Position (Fallback)
                        const diffX = Math.abs(sprite.x - obj.x);
                        const diffY = Math.abs(sprite.y - (obj.y + obj.height));
                        return diffX < 32 && diffY < 32;
                    });

                    if (linkedSprite) {
                        zone.linkedSprite = linkedSprite;
                    } else {
                        console.warn(`⚠️ Sprite not found for Zone: ${obj.name || 'Unnamed'} at X:${obj.x} Y:${obj.y}`);
                    }

                    // Hover Effects
                    zone.on('pointerover', () => {
                        this.input.setDefaultCursor('pointer');
                        if (zone.linkedSprite) {
                            zone.linkedSprite.setTint(0xffdd00); // Gold tint
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
                    const targetScene = obj.properties && obj.properties.find(p => p.name === 'targetScene')?.value;

                    zone.on('pointerdown', () => {
                        console.log(`Clicked on ${obj.name}, going to ${targetScene}`);
                        if (targetScene == 'CapitalScene') {
                            this.scene.start(targetScene, { cityId: obj.id, cityName: obj.name });
                        } else {
                            this.scene.start('EstateScene', { x: obj.x, y: obj.y, type: 'plot', nameCity: obj.name });
                        }
                    });
                }
            });
        } else {
            console.warn('Cities layer not found');
        }
    }

    setupCamera(map) {
        const camera = this.cameras.main;
        camera.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Zoom
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                camera.zoom = Math.max(0.8, camera.zoom - 0.1);
            } else {
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
}
