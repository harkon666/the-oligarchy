import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import config from '../game/config';

const PhaserGame = () => {
    // Ref for the game instance
    const gameRef = useRef(null);
    // Ref for the specific HTML Div where the game lives
    const containerRef = useRef(null);
    // State to track if game is ready
    const [isReady, setIsReady] = useState(false);
    const [isVotingModalOpen, setIsVotingModalOpen] = useState(false);

    useEffect(() => {
        // 1. Safety Check: If game already exists or container isn't ready, stop.
        if (gameRef.current || !containerRef.current) return;

        // 2. Dynamic Config Override
        // We inject the specific containerRef as the parent, ignoring whatever is in config.js
        const finalConfig = {
            ...config,
            parent: containerRef.current,
            scale: {
                ...config.scale,
                // Ensure the game fits the container
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: 1280, // Or whatever your base resolution is
                height: 720
            }
        };

        // 3. Initialize Game
        const game = new Phaser.Game(finalConfig);
        gameRef.current = game;
        setIsReady(true);

        // Listen for custom events
        game.events.on('OPEN_VOTING_MODAL', () => {
            console.log('PhaserGamePage: Received OPEN_VOTING_MODAL');
            setIsVotingModalOpen(true);
        });

        // 4. Cleanup Function
        return () => {
            if (gameRef.current) {
                gameRef.current.events.off('OPEN_VOTING_MODAL'); // Clean up listener
                gameRef.current.destroy(true); // 'true' destroys the canvas too
                gameRef.current = null;
            }
            setIsReady(false);
        };
    }, []);

    // Optimized Fullscreen Handler
    const handleFullScreen = () => {
        if (!containerRef.current) return;

        // We fullscreen the CONTAINER (the div), not just the canvas.
        // This keeps your UI logic intact if you ever want to overlay React buttons.
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
            <div className="relative w-full max-w-6xl mx-auto">

                {/* Game Container Frame */}
                {/* We attach the ref={containerRef} here instead of using ID */}
                <div
                    ref={containerRef}
                    className="bg-slate-800 rounded-xl overflow-hidden shadow-2xl border-4 border-slate-700 relative w-full aspect-video flex items-center justify-center"
                >
                    {!isReady && <div className="text-white">Loading Oligarchy...</div>}

                    {/* Voting Modal Overlay */}
                    {isVotingModalOpen && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                            <div className="bg-slate-800 p-8 rounded-lg border-2 border-yellow-600 max-w-md w-full text-center shadow-2xl">
                                <h2 className="text-3xl font-bold text-yellow-500 mb-4">Voting Board</h2>
                                <p className="text-gray-300 mb-6">Cast your vote for the next law proposal.</p>

                                <div className="space-y-4">
                                    <button className="w-full py-3 bg-green-700 hover:bg-green-600 text-white rounded font-bold transition-colors">
                                        Vote YES
                                    </button>
                                    <button className="w-full py-3 bg-red-700 hover:bg-red-600 text-white rounded font-bold transition-colors">
                                        Vote NO
                                    </button>
                                </div>

                                <button
                                    onClick={() => setIsVotingModalOpen(false)}
                                    className="mt-8 text-gray-400 hover:text-white underline"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Chat UI Overlay */}
                    <div className="absolute bottom-4 left-4 z-40 w-80 pointer-events-none">
                        <div
                            id="chat-log"
                            className="h-48 bg-black/50 text-white p-2 rounded mb-2 overflow-y-auto pointer-events-auto font-mono text-sm"
                            style={{ textShadow: '1px 1px 0 #000' }}
                        >
                            <div className="text-yellow-400">System: Welcome to The Oligarchy!</div>
                        </div>
                        <input
                            id="chat-input"
                            type="text"
                            placeholder="Press Enter to chat..."
                            className="w-full bg-black/70 text-white border border-slate-600 rounded p-2 pointer-events-auto focus:outline-none focus:border-yellow-500"
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={handleFullScreen}
                        className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                    >
                        <span>⛶</span> Toggle Full Screen
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PhaserGame;