import Phaser from 'phaser';
import { Player } from '../entities/Player';
import runImg from '../../assets/game/run.png';
import walkImg from '../../assets/game/walk.png';
import idleImg from '../../assets/game/idle.png';
import { createCharacterAnimations } from '../utils/Animation';

// Import map and tilesets
import capitalMapUrl from '../../assets/game/maps/capital.tmj?url';
import castleImg from '../../assets/game/maps/Castle2.png';
import buildingsImg from '../../assets/game/maps/Buildings.png';
import grassImg from '../../assets/game/maps/TX Tileset Grass.png';
import campfireImg from '../../assets/game/maps/Campfire.png';
import boardImg from '../../assets/game/maps/Board.png';

export default class CapitalScene extends Phaser.Scene {
    constructor() {
        super('CapitalScene');
    }

    preload() {
        // Load the tilemap
        this.load.tilemapTiledJSON('capital', capitalMapUrl);

        // Load the tileset images
        this.load.image('Castle2', castleImg);
        this.load.image('Buildings', buildingsImg);
        this.load.image('TX Tileset Grass', grassImg);
        this.load.spritesheet('Campfire', campfireImg, { frameWidth: 32, frameHeight: 32 });
        this.load.image('Board', boardImg);

        // Load Player Spritesheets
        this.load.spritesheet('character_run', runImg, { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('character_walk', walkImg, { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('character_idle', idleImg, { frameWidth: 64, frameHeight: 64 });
    }

    create() {
        console.log('CapitalScene: create started');
        // Create the map
        const map = this.make.tilemap({ key: 'capital' });

        // Add tilesets
        const castleTiles = map.addTilesetImage('Castle2', 'Castle2');
        const buildingsTiles = map.addTilesetImage('Buildings', 'Buildings');
        const grassTiles = map.addTilesetImage('TX Tileset Grass', 'TX Tileset Grass');
        const campfireTiles = map.addTilesetImage('Campfire', 'Campfire');

        // Note: 'Props' tileset is removed as requested
        const tilesets = [castleTiles, buildingsTiles, grassTiles, campfireTiles];

        // Create layers
        const groundLayer = map.createLayer('Ground', tilesets, 0, 0);
        const wallsLayer = map.createLayer('Walls', tilesets, 0, 0);

        // Setup Collision for Walls
        wallsLayer.setCollisionByExclusion([-1]);

        // --- MANUALLY CREATE BOARD ---
        this.boards = this.physics.add.staticGroup();
        // Placing board at x:598, y:255 (based on previous map data)
        // Store it in 'this.votingBoard' for distance checking later
        this.votingBoard = this.boards.create(598, 255, 'Board');
        this.votingBoard.setOrigin(0, 1);
        this.votingBoard.setDepth(5);
        this.votingBoard.setScale(2);
        this.votingBoard.refreshBody(); // Important for static physics bodies after scaling

        // --- CAMPFIRE OBJECTS FROM MAP ---
        // Helper to recursively find an object layer by name
        const findObjectLayerByName = (root, name) => {
            if (root.name === name && (root.objects || root.type === 'objectgroup')) {
                return root;
            }
            const children = root.layers || root.objects;
            if (children) {
                for (const child of children) {
                    const found = findObjectLayerByName(child, name);
                    if (found) return found;
                }
            }
            return null;
        };

        // Create Animations
        createCharacterAnimations(this);

        // Campfire Animation
        this.anims.create({
            key: 'burn',
            frames: this.anims.generateFrameNumbers('Campfire', { start: 0, end: 7 }),
            frameRate: 10,
            repeat: -1
        });

        const createObjectsFromLayer = (layerName, textureKey) => {
            const rawMapData = this.cache.tilemap.get('capital').data;
            let layer = findObjectLayerByName(rawMapData, layerName);

            if (layer) {
                layer.objects.forEach(obj => {
                    // Default creation for other objects (like Campfire)
                    const sprite = this.add.sprite(obj.x, obj.y, textureKey);
                    sprite.setOrigin(0, 1);
                    sprite.setDepth(5);

                    // Play animation for campfire
                    if (layerName === 'campfire') {
                        sprite.play('burn');
                    }
                });
            } else {
                console.warn(`CapitalScene: Object layer "${layerName}" not found.`);
            }
        };

        createObjectsFromLayer('campfire', 'Campfire');

        // --- PLAYER ---
        console.log('CapitalScene: Creating player at', map.widthInPixels / 2, map.heightInPixels / 2);
        this.player = new Player(this, map.widthInPixels / 2, map.heightInPixels / 2);

        // Camera settings
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.centerOn(this.player.x, this.player.y);

        // Collision
        this.physics.add.collider(this.player, wallsLayer);
        this.physics.add.collider(this.player, this.boards);

        // Back Button
        const backText = this.add.text(20, 20, '< Back to Grid', {
            fontSize: '18px',
            fill: '#ffffff',
            backgroundColor: '#000000'
        })
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true })
            .setDepth(100); // UI on top

        backText.on('pointerdown', () => {
            this.scene.start('GridScene');
        });

        // --- INTERACTION SETUP ---
        this.fKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.interactionText = this.add.text(0, 0, 'Press F to Vote', {
            fontSize: '14px',
            fill: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 4, y: 4 },
            align: 'center'
        }).setDepth(101).setVisible(false);
    }

    update(time, delta) {
        if (this.player) {
            this.player.update(time, delta);

            // Reset interaction state
            this.interactionText.setVisible(false);
            let canVote = false;

            // Check distance for interaction (more reliable than overlap when colliders are active)
            if (this.votingBoard) {
                const distance = Phaser.Math.Distance.Between(
                    this.player.x, this.player.y,
                    this.votingBoard.x + (this.votingBoard.displayWidth / 2), this.votingBoard.y - (this.votingBoard.displayHeight / 1.3) // Check from center-ish
                );

                // 100px radius for interaction
                if (distance < 100) {
                    // Show text above the board
                    this.interactionText.setPosition(
                        this.votingBoard.x - this.interactionText.width / 2,
                        this.votingBoard.y - this.votingBoard.displayHeight - 10
                    );
                    this.interactionText.setVisible(true);
                    canVote = true;
                }
            }

            // Handle Input
            if (canVote && Phaser.Input.Keyboard.JustDown(this.fKey)) {
                console.log('CapitalScene: F key pressed, emitting OPEN_VOTING_MODAL');
                this.game.events.emit('OPEN_VOTING_MODAL');
            }
        }
    }
}
