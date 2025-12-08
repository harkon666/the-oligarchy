import Phaser from 'phaser';
import { Network } from '../systems/Network.js';
import { Chat } from '../systems/Chat.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { createCharacterAnimations } from '../utils/Animation';

export default class MultiplayerScene extends Phaser.Scene {
    constructor(key) {
        super(key);
        this.player = null;
    }

    create() {
        // Systems
        this.chat = new Chat(this);
        this.chat.setupInput();

        this.network = new Network({
            onWelcome: (id) => this.handleWelcome(id),
            onCurrentPlayers: (players) => this.handleCurrentPlayers(players),
            onNewPlayer: (playerInfo) => this.handleNewPlayer(playerInfo),
            onPlayerMoved: (msg) => this.handlePlayerMoved(msg),
            onUserDisconnected: (id) => this.handleUserDisconnected(id),
            onChat: (msg) => this.handleChat(msg)
        });

        this.otherPlayers = this.add.group();
        this.otherPlayersMap = new Map();

        createCharacterAnimations(this);

        this.events.on('shutdown', this.shutdown, this);
    }

    // Call this from the subclass after creating this.player
    startMultiplayer() {
        this.network.connect();

        // Chat Callback for Local Player
        this.chat.onSendMessage = (message) => {
            this.network.sendChat(message);
            this.chat.showBubble(this.player, message);
        };
    }

    update(time, delta) {
        // Update Chat Bubbles
        this.chat.updateBubblePosition(this.player);
        this.otherPlayers.children.iterate((other) => {
            this.chat.updateBubblePosition(other);
        });

        if (this.chat.isChatting) {
            return;
        }

        // Update Player and Send Move
        if (this.player) {
            const result = this.player.update(time, delta);
            if (result.moved) {
                this.network.sendMove(this.player.x, this.player.y, result.anim, this.scene.key);
            }
        }
    }

    // Network Handlers

    handleWelcome(id) {
        this.network.playerId = id;
        console.log('My player ID:', id);
        if (this.player) {
            this.network.sendMove(this.player.x, this.player.y, 'idle-down', this.scene.key);
        }
    }

    handleCurrentPlayers(players) {
        Object.keys(players).forEach((id) => {
            if (id !== this.network.playerId && players[id].scene === this.scene.key) {
                this.addOtherPlayer(players[id]);
            }
        });
    }

    handleNewPlayer(playerInfo) {
        if (playerInfo.id !== this.network.playerId && playerInfo.scene === this.scene.key) {
            this.addOtherPlayer(playerInfo);
        }
    }

    handlePlayerMoved(msg) {
        if (msg.id !== this.network.playerId) {
            if (msg.scene === this.scene.key) {
                if (this.otherPlayersMap.has(msg.id)) {
                    const otherPlayer = this.otherPlayersMap.get(msg.id);
                    otherPlayer.updateState(msg);
                } else {
                    // Player entered the scene
                    this.addOtherPlayer(msg);
                }
            } else {
                // Player left the scene
                if (this.otherPlayersMap.has(msg.id)) {
                    this.handleUserDisconnected(msg.id);
                }
            }
        }
    }

    handleUserDisconnected(id) {
        if (this.otherPlayersMap.has(id)) {
            const otherPlayer = this.otherPlayersMap.get(id);
            otherPlayer.destroy();
            this.otherPlayersMap.delete(id);
        }
    }

    handleChat(msg) {
        if (this.otherPlayersMap.has(msg.id)) {
            const otherPlayer = this.otherPlayersMap.get(msg.id);
            this.chat.showBubble(otherPlayer, msg.message);
            this.chat.addMessageToLog(`Player ${msg.id.substr(0, 4)}`, msg.message);
        }
    }

    addOtherPlayer(playerInfo) {
        const otherPlayer = new RemotePlayer(this, playerInfo.x, playerInfo.y, playerInfo.id);
        this.otherPlayers.add(otherPlayer);
        this.otherPlayersMap.set(playerInfo.id, otherPlayer);
        otherPlayer.updateState(playerInfo);
    }

    shutdown() {
        if (this.network) {
            this.network.disconnect();
        }
    }
}
