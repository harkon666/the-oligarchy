export class RemotePlayer extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, id) {
        super(scene, x, y, 'character_idle');
        scene.add.existing(this);

        this.setScale(0.8);
        this.playerId = id;
    }

    updateState(info) {
        if (info.x !== undefined) this.x = info.x;
        if (info.y !== undefined) this.y = info.y;

        if (info.anim) {
            console.log('RemotePlayer: Playing anim:', info.anim);
            this.play(info.anim, true);
        }
    }
}
