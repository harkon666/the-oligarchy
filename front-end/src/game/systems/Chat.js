export class Chat {
    constructor(scene) {
        this.scene = scene;
        this.isChatting = false;
        this.chatInput = document.getElementById('chat-input');
        this.chatLog = document.getElementById('chat-log');

        this.onSendMessage = null; // Callback
    }

    setupInput() {
        console.log('Chat: setupInput called');
        this.chatInput = document.getElementById('chat-input');
        this.chatLog = document.getElementById('chat-log');

        // Toggle chat on Enter
        this.scene.input.keyboard.on('keydown-ENTER', () => {
            console.log('Chat: Enter pressed');
            if (!this.isChatting) {
                this.startChat();
            } else {
                this.sendMessage();
            }
        });

        // Cancel chat on Esc
        this.scene.input.keyboard.on('keydown-ESC', () => {
            if (this.isChatting) {
                this.endChat();
            }
        });

        // Handle DOM input events
        if (this.chatInput) {
            this.chatInput.addEventListener('keydown', (event) => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                    this.sendMessage();
                } else if (event.key === 'Escape') {
                    this.endChat();
                }
            });
        } else {
            console.warn('Chat: chatInput not found in setupInput');
        }
    }

    startChat() {
        console.log('Chat: startChat called');
        if (!this.chatInput) {
            this.chatInput = document.getElementById('chat-input');
        }

        if (!this.chatInput) {
            console.error('Chat: chatInput not found');
            return;
        }
        this.isChatting = true;
        this.chatInput.style.display = 'block';
        this.chatInput.focus();
    }

    endChat() {
        if (!this.chatInput) return;
        this.chatInput.value = '';
        this.chatInput.style.display = 'none';
        this.isChatting = false;
        this.scene.game.canvas.focus();
    }
    sendMessage() {
        const message = this.chatInput.value.trim();
        if (message) {
            // Add to log locally
            this.addMessageToLog('You', message);

            if (this.onSendMessage) {
                this.onSendMessage(message);
            }
        }
        this.endChat();
    }

    addMessageToLog(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.textContent = `${sender}: ${message}`;
        this.chatLog.appendChild(messageElement);
        this.chatLog.scrollTop = this.chatLog.scrollHeight;
    }

    showBubble(sprite, message) {
        console.log('Chat: showBubble called for', sprite, 'with message:', message);
        if (!sprite) {
            console.error('Chat: showBubble called with null sprite');
            return;
        }

        if (sprite.chatBubble) {
            sprite.chatBubble.destroy();
        }
        if (sprite.chatTimer) {
            this.scene.time.removeEvent(sprite.chatTimer);
        }

        const bubble = this.scene.add.text(sprite.x, sprite.y - 50, message, {
            fontSize: '16px',
            fill: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 5, y: 5 },
            align: 'center'
        });
        bubble.setOrigin(0.5, 1);
        bubble.setDepth(100);

        sprite.chatBubble = bubble;

        sprite.chatTimer = this.scene.time.delayedCall(3000, () => {
            if (sprite.chatBubble) {
                sprite.chatBubble.destroy();
                sprite.chatBubble = null;
            }
        });
    }

    updateBubblePosition(sprite) {
        if (sprite && sprite.chatBubble) {
            sprite.chatBubble.x = sprite.x;
            sprite.chatBubble.y = sprite.y - 25;
        }
    }
}
