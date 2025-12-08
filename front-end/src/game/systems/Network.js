export class Network {
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.socket = null;
        this.playerId = null;
    }

    connect() {
        try {
            this.socket = new WebSocket('ws://localhost:8000/ws');

            this.socket.onopen = () => {
                console.log('Connected to server');
            };

            this.socket.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    switch (msg.type) {
                        case 'welcome':
                            this.playerId = msg.id;
                            if (this.callbacks.onWelcome) this.callbacks.onWelcome(msg.id);
                            break;
                        case 'currentPlayers':
                            if (this.callbacks.onCurrentPlayers) this.callbacks.onCurrentPlayers(msg.players);
                            break;
                        case 'newPlayer':
                            if (this.callbacks.onNewPlayer) this.callbacks.onNewPlayer(msg.player);
                            break;
                        case 'playerMoved':
                            if (this.callbacks.onPlayerMoved) this.callbacks.onPlayerMoved(msg);
                            break;
                        case 'userDisconnected':
                            if (this.callbacks.onUserDisconnected) this.callbacks.onUserDisconnected(msg.id);
                            break;
                        case 'chat':
                            if (this.callbacks.onChat) this.callbacks.onChat(msg);
                            break;
                    }
                } catch (e) {
                    console.error('Error parsing message:', e);
                }
            };

            this.socket.onclose = () => {
                console.log('Disconnected from server');
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (e) {
            console.error('Failed to connect:', e);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    sendMove(x, y, anim, scene) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const payload = {
                type: 'move',
                x: x,
                y: y,
                anim: anim,
                scene: scene
            };
            // console.log('Network: Sending move:', payload);
            this.socket.send(JSON.stringify(payload));
        }
    }

    sendChat(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'chat',
                id: this.playerId || 'client',
                message: message
            }));
        }
    }
}
