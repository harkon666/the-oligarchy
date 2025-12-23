/**
 * GameHUD - Heads Up Display for in-game token balances and epoch info
 * 
 * This is a Phaser-based HUD that can receive data updates from React.
 * It displays mETH, OLIG, veOLIG balances and current epoch countdown.
 */
export class GameHUD {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.balanceTexts = {};
        this.epochText = null;
        this.countdownText = null;

        // Store current values
        this.data = {
            mETH: '0.00',
            OLIG: '0.00',
            veOLIG: '0.00',
            epoch: '?',
            countdown: '--:--:--'
        };
    }

    create() {
        const { scene } = this;
        const padding = 10;
        const width = 280;
        const height = 70;

        // Create container at top-right
        this.container = scene.add.container(
            scene.cameras.main.width - width - padding,
            padding
        ).setScrollFactor(0).setDepth(1000);

        // Background
        const bg = scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(0, 0, width, height, 8);
        bg.lineStyle(2, 0x444444, 1);
        bg.strokeRoundedRect(0, 0, width, height, 8);
        this.container.add(bg);

        // Token icons and values - Row 1
        const tokens = [
            { key: 'mETH', emoji: '💎', x: 15 },
            { key: 'OLIG', emoji: '🪙', x: 100 },
            { key: 'veOLIG', emoji: '🗳️', x: 185 }
        ];

        tokens.forEach(token => {
            const label = scene.add.text(token.x, 8, token.emoji, {
                fontSize: '14px'
            });
            this.container.add(label);

            this.balanceTexts[token.key] = scene.add.text(token.x + 20, 8, this.data[token.key], {
                fontSize: '12px',
                fill: '#ffffff',
                fontFamily: 'monospace'
            });
            this.container.add(this.balanceTexts[token.key]);
        });

        // Epoch info - Row 2
        this.epochText = scene.add.text(width / 2, 35, `Epoch ${this.data.epoch}`, {
            fontSize: '14px',
            fill: '#ffdd44',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0);
        this.container.add(this.epochText);

        // Countdown - Row 3
        this.countdownText = scene.add.text(width / 2, 52, `⏱️ ${this.data.countdown}`, {
            fontSize: '12px',
            fill: '#aaaaaa',
            fontFamily: 'monospace'
        }).setOrigin(0.5, 0);
        this.container.add(this.countdownText);

        return this;
    }

    /**
     * Update HUD with new data
     * @param {Object} data - { mETH, OLIG, veOLIG, epoch, countdown }
     */
    update(data) {
        if (data.mETH !== undefined) {
            this.data.mETH = this.formatBalance(data.mETH);
            if (this.balanceTexts.mETH) {
                this.balanceTexts.mETH.setText(this.data.mETH);
            }
        }
        if (data.OLIG !== undefined) {
            this.data.OLIG = this.formatBalance(data.OLIG);
            if (this.balanceTexts.OLIG) {
                this.balanceTexts.OLIG.setText(this.data.OLIG);
            }
        }
        if (data.veOLIG !== undefined) {
            this.data.veOLIG = this.formatBalance(data.veOLIG);
            if (this.balanceTexts.veOLIG) {
                this.balanceTexts.veOLIG.setText(this.data.veOLIG);
            }
        }
        if (data.epoch !== undefined) {
            this.data.epoch = data.epoch.toString();
            if (this.epochText) {
                this.epochText.setText(`Epoch ${this.data.epoch}`);
            }
        }
        if (data.countdown !== undefined) {
            this.data.countdown = data.countdown;
            if (this.countdownText) {
                this.countdownText.setText(`⏱️ ${this.data.countdown}`);
            }
        }
    }

    formatBalance(value) {
        if (!value) return '0.00';
        // Convert from BigInt or string to formatted number
        try {
            const num = typeof value === 'bigint'
                ? Number(value) / 1e18
                : parseFloat(value);
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toFixed(2);
        } catch {
            return '0.00';
        }
    }

    setVisible(visible) {
        if (this.container) {
            this.container.setVisible(visible);
        }
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }
}
