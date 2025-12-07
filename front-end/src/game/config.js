import Phaser from 'phaser';
import MainScene from './scenes/MainScene';
import WorldMapScene from './scenes/WorldMapScene';
import GridScene from './scenes/GridScene';
import EstateScene from './scenes/EstateScene';
import CapitalScene from './scenes/CapitalScene';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container', // ID div di React
    width: 1280,
    height: 720,
    backgroundColor: '#000000',

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // Top down game tidak butuh gravitasi jatuh
            debug: true // Set false nanti kalau sudah rilis
        }
    },
    scene: [WorldMapScene, GridScene, EstateScene, CapitalScene, MainScene]
};


export default config;