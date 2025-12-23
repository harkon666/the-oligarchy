import Phaser from 'phaser';
import MultiplayerScene from './MultiplayerScene';
import { Player } from '../entities/Player';
import runImg from '../../assets/game/run.png';
import walkImg from '../../assets/game/walk.png';
import idleImg from '../../assets/game/idle.png';

// Import map and tilesets
import capitalMapUrl from '../../assets/game/maps/capital.tmj?url';
import castleImg from '../../assets/game/maps/Castle2.png';
import buildingsImg from '../../assets/game/maps/Buildings.png';
import grassImg from '../../assets/game/maps/TX Tileset Grass.png';
import propsImg from '../../assets/game/maps/Props.png';
import campfireImg from '../../assets/game/maps/Campfire.png';

// Import GameFi sprites (used as tilesets in the map)
import warBannerImg from '../../assets/game/items/war_banner.png';
import townCrierImg from '../../assets/game/npc/town_crier.png';
import merchantNpcImg from '../../assets/game/npc/merchant_npc.png';
import farmStallImg from '../../assets/game/items/farm_stall.png';
import bribeChestImg from '../../assets/game/items/bribe_chest.png';

// Import icons for HUD
import iconMethImg from '../../assets/game/icon/icon_meth.png';
import iconOligImg from '../../assets/game/icon/icon_olig.png';
import iconBribeImg from '../../assets/game/icon/icon_bribe.png';
import iconEpochImg from '../../assets/game/icon/icon_epoch.png';
import iconWarImg from '../../assets/game/icon/icon_war.png';

export default class CapitalScene extends MultiplayerScene {
    constructor() {
        super('CapitalScene');
        this.gameFiObjects = [];
        this.nearestObject = null;
        this.propColliders = null; // Static group for prop collisions
    }

    preload() {
        // Load the tilemap
        this.load.tilemapTiledJSON('capital', capitalMapUrl);

        // Load the base tileset images
        this.load.image('Castle2', castleImg);
        this.load.image('Buildings', buildingsImg);
        this.load.image('TX Tileset Grass', grassImg);
        this.load.image('Props', propsImg);
        this.load.spritesheet('Campfire', campfireImg, { frameWidth: 32, frameHeight: 32 });

        // Load GameFi tileset images (must match the tileset names in Tiled)
        this.load.spritesheet('war_banner', warBannerImg, { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('town_crier', townCrierImg, { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('merchant_npc', merchantNpcImg, { frameWidth: 64, frameHeight: 64 });
        this.load.image('farm_stall', farmStallImg);
        this.load.spritesheet('bribe_chest', bribeChestImg, { frameWidth: 64, frameHeight: 64 });

        // Load Player Spritesheets
        this.load.spritesheet('character_run', runImg, { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('character_walk', walkImg, { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('character_idle', idleImg, { frameWidth: 64, frameHeight: 64 });

        // Load icons for HUD
        this.load.image('icon_meth', iconMethImg);
        this.load.image('icon_olig', iconOligImg);
        this.load.image('icon_bribe', iconBribeImg);
        this.load.image('icon_epoch', iconEpochImg);
        this.load.image('icon_war', iconWarImg);
    }

    create() {
        super.create();
        console.log('CapitalScene: create started');

        // Create the map
        const map = this.make.tilemap({ key: 'capital' });

        // Add base tilesets
        const castleTiles = map.addTilesetImage('Castle2', 'Castle2');
        const buildingsTiles = map.addTilesetImage('Buildings', 'Buildings');
        const grassTiles = map.addTilesetImage('TX Tileset Grass', 'TX Tileset Grass');
        const propsTiles = map.addTilesetImage('Props', 'Props');
        const campfireTiles = map.addTilesetImage('Campfire', 'Campfire');

        // Add GameFi tilesets (these are used for objects in GameFi_Objects layer)
        const warBannerTiles = map.addTilesetImage('war_banner', 'war_banner');
        const townCrierTiles = map.addTilesetImage('town_crier', 'town_crier');
        const merchantTiles = map.addTilesetImage('merchant_npc', 'merchant_npc');
        const farmStallTiles = map.addTilesetImage('farm_stall', 'farm_stall');
        const bribeChestTiles = map.addTilesetImage('bribe_chest', 'bribe_chest');

        const allTilesets = [
            castleTiles, buildingsTiles, grassTiles, propsTiles, campfireTiles,
            warBannerTiles, townCrierTiles, merchantTiles, farmStallTiles, bribeChestTiles
        ].filter(t => t !== null);

        console.log('CapitalScene: Loaded tilesets:', allTilesets.map(t => t?.name));

        // Create base layers
        const groundLayer = map.createLayer('Ground', allTilesets, 0, 0);
        const wallsLayer = map.createLayer('Walls', allTilesets, 0, 0);

        // Create Design layer (nested inside Props group)
        const designLayer = map.createLayer('Props/Design', allTilesets, 0, 0);
        if (designLayer) {
            designLayer.setDepth(0);
            // Enable collision for non-empty tiles in Design layer
            designLayer.setCollisionByExclusion([-1, 0]);
            console.log('CapitalScene: Design layer created with collision');
        } else {
            console.warn('CapitalScene: Design layer not found');
        }

        // Setup Collision for Walls
        if (wallsLayer) {
            wallsLayer.setCollisionByExclusion([-1]);
        }

        // Create static group for GameFi object colliders
        this.propColliders = this.physics.add.staticGroup();

        // Store layers for collision setup after player creation
        this.designLayer = designLayer;

        // Create animations for sprites
        this.createAnimations();

        // Load objects from map
        this.loadCampfires();
        this.loadGameFiObjects();

        // --- PLAYER ---
        console.log('CapitalScene: Creating player at', map.widthInPixels / 2, map.heightInPixels / 2);
        this.player = new Player(this, (map.widthInPixels / 2) - 15, (map.heightInPixels / 2 - 350));

        // Camera settings
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // Smooth follow
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setZoom(1.5); // Default zoom - closer view
        this.cameras.main.centerOn(this.player.x, this.player.y);

        // Calculate minimum zoom so map fills the screen
        const minZoomX = this.cameras.main.width / map.widthInPixels;
        const minZoomY = this.cameras.main.height / map.heightInPixels;
        const minZoom = Math.max(minZoomX, minZoomY);

        // Camera zoom with scroll wheel
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (deltaY > 0) {
                // Zoom out - limit to minZoom
                this.cameras.main.zoom = Math.max(minZoom, this.cameras.main.zoom - 0.1);
            } else {
                // Zoom in - limit to 3x
                this.cameras.main.zoom = Math.min(3, this.cameras.main.zoom + 0.1);
            }
        });

        // Collision with walls
        if (wallsLayer) {
            this.physics.add.collider(this.player, wallsLayer);
        }

        // Collision with Design layer props
        if (this.designLayer) {
            this.physics.add.collider(this.player, this.designLayer);
        }

        // Collision with GameFi objects
        if (this.propColliders) {
            this.physics.add.collider(this.player, this.propColliders);
        }

        // UI Elements
        this.createUI();

        // --- INTERACTION SETUP ---
        this.fKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.interactionText = this.add.text(0, 0, '', {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#000000cc',
            padding: { x: 8, y: 6 },
            align: 'center'
        }).setDepth(101).setVisible(false).setScrollFactor(0);

        // Start Multiplayer
        this.startMultiplayer();
    }

    createAnimations() {
        // Campfire animation
        if (!this.anims.exists('burn')) {
            this.anims.create({
                key: 'burn',
                frames: this.anims.generateFrameNumbers('Campfire', { start: 0, end: 7 }),
                frameRate: 10,
                repeat: -1
            });
        }

        // War Banner animation
        if (!this.anims.exists('war_banner_wave')) {
            this.anims.create({
                key: 'war_banner_wave',
                frames: this.anims.generateFrameNumbers('war_banner', { start: 0, end: 3 }),
                frameRate: 8,
                repeat: -1
            });
        }

        // Town Crier animation
        if (!this.anims.exists('town_crier_idle')) {
            this.anims.create({
                key: 'town_crier_idle',
                frames: this.anims.generateFrameNumbers('town_crier', { start: 0, end: 3 }),
                frameRate: 4,
                repeat: -1
            });
        }

        // Merchant NPC animation
        if (!this.anims.exists('merchant_idle')) {
            this.anims.create({
                key: 'merchant_idle',
                frames: this.anims.generateFrameNumbers('merchant_npc', { start: 0, end: 7 }),
                frameRate: 6,
                repeat: -1
            });
        }

        // Bribe chest animation
        if (!this.anims.exists('chest_glow')) {
            this.anims.create({
                key: 'chest_glow',
                frames: this.anims.generateFrameNumbers('bribe_chest', { start: 0, end: 3 }),
                frameRate: 4,
                repeat: -1
            });
        }
    }

    findObjectLayerByName(root, name) {
        if (root.name === name && (root.objects || root.type === 'objectgroup')) {
            return root;
        }
        const children = root.layers || root.objects;
        if (children) {
            for (const child of children) {
                const found = this.findObjectLayerByName(child, name);
                if (found) return found;
            }
        }
        return null;
    }

    loadCampfires() {
        const rawMapData = this.cache.tilemap.get('capital').data;
        const campfireLayer = this.findObjectLayerByName(rawMapData, 'campfire');

        if (campfireLayer) {
            console.log('CapitalScene: Loading campfires');
            campfireLayer.objects.forEach(obj => {
                const sprite = this.add.sprite(obj.x, obj.y, 'Campfire');
                sprite.setOrigin(0, 1);
                sprite.setDepth(10);
                sprite.play('burn');
            });
        }
    }

    loadGameFiObjects() {
        const rawMapData = this.cache.tilemap.get('capital').data;
        const gameFiLayer = this.findObjectLayerByName(rawMapData, 'GameFi_Objects');

        if (!gameFiLayer) {
            console.warn('CapitalScene: GameFi_Objects layer not found');
            return;
        }

        console.log('CapitalScene: Found GameFi_Objects with', gameFiLayer.objects.length, 'objects');

        gameFiLayer.objects.forEach(obj => {
            const targetModal = obj.properties?.find(p => p.name === 'targetModal')?.value;
            if (!targetModal) return;

            let sprite = null;
            let animKey = null;
            let textureKey = null;
            let scale = 1;

            // Determine texture and animation based on object name
            switch (obj.name) {
                case 'WarBanner':
                    textureKey = 'war_banner';
                    animKey = 'war_banner_wave';
                    break;
                case 'TownCrier':
                    textureKey = 'town_crier';
                    animKey = 'town_crier_idle';
                    break;
                case 'MerchantNPC':
                    textureKey = 'merchant_npc';
                    animKey = 'merchant_idle';
                    break;
                case 'FarmStall':
                    textureKey = 'farm_stall';
                    scale = 1; // Scale down 500x500 image
                    break;
                case 'BribeChest':
                    textureKey = 'bribe_chest';
                    animKey = 'chest_glow';
                    break;
                case 'VotingBoard':
                    // VotingBoard uses Props tileset, handled by Design layer
                    // Just register interaction zone without new sprite
                    this.gameFiObjects.push({
                        x: obj.x + (obj.width || 32) / 2,
                        y: obj.y - (obj.height || 32) / 2,
                        targetModal: targetModal,
                        name: obj.name,
                        sprite: null,
                        interactionRadius: 80
                    });
                    return;
            }

            if (textureKey) {
                sprite = this.add.sprite(obj.x, obj.y, textureKey);
                sprite.setOrigin(0, 1);
                sprite.setDepth(0);
                sprite.setScale(scale);

                if (animKey && this.anims.exists(animKey)) {
                    sprite.play(animKey);
                }

                // Create a collision body for this object
                const colliderWidth = obj.width || sprite.displayWidth * scale;
                const colliderHeight = obj.height || sprite.displayHeight * scale;

                // Add invisible physics rectangle for collision
                const collider = this.add.rectangle(
                    obj.x + colliderWidth / 2,
                    obj.y - colliderHeight / 2,
                    colliderWidth * 0.8,  // Slightly smaller for better gameplay
                    colliderHeight * 0.6
                );
                this.physics.add.existing(collider, true); // true = static body
                this.propColliders.add(collider);
                collider.setVisible(false);

                this.gameFiObjects.push({
                    x: obj.x + colliderWidth / 2,
                    y: obj.y - colliderHeight / 2,
                    targetModal: targetModal,
                    name: obj.name,
                    sprite: sprite,
                    collider: collider,
                    interactionRadius: 100
                });

                console.log(`CapitalScene: Created ${obj.name} at (${obj.x}, ${obj.y})`);
            }
        });

        console.log('CapitalScene: Loaded', this.gameFiObjects.length, 'interactive objects');
    }

    createUI() {
        // Back Button
        const backText = this.add.text(20, 20, '< Back to Map', {
            fontSize: '18px',
            fill: '#ffffff',
            backgroundColor: '#000000'
        })
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true })
            .setDepth(100);

        backText.on('pointerdown', () => {
            this.scene.start('WorldMapScene');
        });
    }

    update(time, delta) {
        super.update(time, delta);

        if (!this.player) return;

        // Find nearest interactable object
        this.nearestObject = null;
        let nearestDistance = Infinity;

        for (const obj of this.gameFiObjects) {
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                obj.x, obj.y
            );

            if (distance < obj.interactionRadius && distance < nearestDistance) {
                nearestDistance = distance;
                this.nearestObject = obj;
            }
        }

        // Update interaction text
        if (this.nearestObject) {
            const label = this.getInteractionLabel(this.nearestObject.targetModal);
            this.interactionText.setText(`Press F - ${label}`);
            this.interactionText.setPosition(
                this.cameras.main.width / 2 - this.interactionText.width / 2,
                this.cameras.main.height - 80
            );
            this.interactionText.setVisible(true);

            // Handle F key press
            if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
                this.handleInteraction(this.nearestObject);
            }
        } else {
            this.interactionText.setVisible(false);
        }
    }

    getInteractionLabel(targetModal) {
        const labels = {
            'VOTE': 'Vote on Region',
            'FARM': 'Stake mETH',
            'WAR': 'View War Theater',
            'STORE': 'Open Store',
            'BRIBE': 'Bribe Market',
            'EPOCH': 'View Epoch'
        };
        return labels[targetModal] || 'Interact';
    }

    handleInteraction(obj) {
        console.log(`CapitalScene: Interacting with ${obj.name}, opening ${obj.targetModal}`);

        const eventMap = {
            'VOTE': 'OPEN_VOTING_MODAL',
            'FARM': 'OPEN_FARM_MODAL',
            'WAR': 'OPEN_WAR_MODAL',
            'STORE': 'OPEN_STORE_MODAL',
            'BRIBE': 'OPEN_BRIBE_MODAL',
            'EPOCH': 'OPEN_EPOCH_MODAL'
        };

        const eventName = eventMap[obj.targetModal];
        if (eventName) {
            this.game.events.emit(eventName);
        }
    }
}
