import Phaser from 'phaser';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        // NANTI: Di sini tempat load gambar pixel art
        // this.load.image('tanah', 'assets/tanah.png');
    }

    create() {
        // --- LEVEL 1: BACKGROUND (WORLD MAP) ---
        // Sementara kita pakai warna biru laut
        this.add.rectangle(400, 300, 800, 600, 0x000033);

        // --- LEVEL 2: GRID SYSTEM (GREYBOXING) ---
        // Kita buat 3 region sederhana dengan kotak warna

        // Region A (Merah - Kekuasaan)
        this.add.rectangle(200, 300, 150, 150, 0xaa0000);
        this.add.text(150, 290, 'Region A', { color: '#ffffff' });

        // Region B (Hijau - Pertanian)
        this.add.rectangle(600, 300, 150, 150, 0x00aa00);
        this.add.text(550, 290, 'Region B', { color: '#ffffff' });

        // --- LEVEL 3: PLAYER (Placeholder) ---
        // Kotak kuning kecil sebagai karakter Anda
        this.player = this.add.rectangle(400, 450, 32, 32, 0xffff00);
        this.physics.add.existing(this.player); // Memberi hukum fisika

        // Instruksi
        this.add.text(250, 50, 'The Oligarchy: Greybox Mode', { fontSize: '24px', fill: '#fff' });
        this.add.text(280, 80, 'Gunakan Panah Keyboard untuk gerak', { fontSize: '16px', fill: '#ccc' });

        // Input Keyboard
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        // Logika pergerakan sederhana
        if (this.cursors.left.isDown) {
            this.player.body.setVelocityX(-160);
        } else if (this.cursors.right.isDown) {
            this.player.body.setVelocityX(160);
        } else {
            this.player.body.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.body.setVelocityY(-160);
        } else if (this.cursors.down.isDown) {
            this.player.body.setVelocityY(160);
        } else {
            this.player.body.setVelocityY(0);
        }
    }
}