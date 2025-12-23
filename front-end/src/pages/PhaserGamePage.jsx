import { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import config from '../game/config';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, maxUint256 } from 'viem';
import { contracts, REGIONS, formatBalance } from '../hooks/useContracts';
import { useEpoch } from '../hooks/useEpoch';

const PhaserGame = () => {
    // Refs
    const gameRef = useRef(null);
    const containerRef = useRef(null);

    // State
    const [isReady, setIsReady] = useState(false);
    const [activeModal, setActiveModal] = useState(null); // null, 'VOTE', 'FARM', 'WAR', 'STORE', 'BRIBE', 'EPOCH'
    const [selectedRegion, setSelectedRegion] = useState(0);
    const [inputAmount, setInputAmount] = useState('');

    // Wagmi hooks
    const { address, isConnected } = useAccount();
    const { currentEpoch, countdown } = useEpoch();
    const { writeContract, data: txHash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    // Read balances
    const { data: mETHBalance } = useReadContract({
        ...contracts.mETH,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        enabled: !!address,
    });

    const { data: oligBalance } = useReadContract({
        ...contracts.OLIG,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        enabled: !!address,
    });

    const { data: veOligBalance } = useReadContract({
        ...contracts.veOLIG,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        enabled: !!address,
    });

    // Modal close handler
    const closeModal = useCallback(() => {
        setActiveModal(null);
        setInputAmount('');
        // Refocus game canvas
        if (containerRef.current) {
            const canvas = containerRef.current.querySelector('canvas');
            if (canvas) canvas.focus();
        }
    }, []);

    // Initialize Phaser game
    useEffect(() => {
        if (gameRef.current || !containerRef.current) return;

        const finalConfig = {
            ...config,
            parent: containerRef.current,
            scale: {
                ...config.scale,
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: 1280,
                height: 720
            }
        };

        const game = new Phaser.Game(finalConfig);
        gameRef.current = game;
        setIsReady(true);

        // Register all modal event listeners
        const modalEvents = ['VOTING', 'FARM', 'WAR', 'STORE', 'BRIBE', 'EPOCH'];
        modalEvents.forEach(type => {
            game.events.on(`OPEN_${type}_MODAL`, () => {
                console.log(`PhaserGamePage: Opening ${type} modal`);
                setActiveModal(type === 'VOTING' ? 'VOTE' : type);
            });
        });

        return () => {
            if (gameRef.current) {
                modalEvents.forEach(type => {
                    gameRef.current.events.off(`OPEN_${type}_MODAL`);
                });
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
            setIsReady(false);
        };
    }, []);

    // Handle ESC key to close modals
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && activeModal) {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeModal, closeModal]);

    // Fullscreen handler
    const handleFullScreen = () => {
        if (!containerRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Fullscreen error: ${err.message}`);
            });
        }
    };

    // Transaction handlers
    const handleVote = () => {
        writeContract({
            ...contracts.Voter,
            functionName: 'vote',
            args: [BigInt(selectedRegion)],
        });
    };

    const handleStake = () => {
        const amount = parseEther(inputAmount || '0');
        writeContract({
            ...contracts.Farm,
            functionName: 'deposit',
            args: [amount, BigInt(selectedRegion)],
        });
    };

    const handleBribe = () => {
        const amount = parseEther(inputAmount || '0');
        writeContract({
            ...contracts.Voter,
            functionName: 'depositBribe',
            args: [BigInt(selectedRegion), amount],
        });
    };

    // Render modal content based on type
    const renderModalContent = () => {
        if (!activeModal) return null;

        const modalConfig = {
            VOTE: {
                title: '🗳️ Voting Board',
                icon: '🗳️',
                color: 'yellow',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-300">Vote for a region with your veOLIG power</p>
                        <p className="text-sm text-gray-400">Your veOLIG: {formatBalance(veOligBalance)}</p>
                        <div className="grid grid-cols-3 gap-2">
                            {REGIONS.map((region, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedRegion(idx)}
                                    className={`p-3 rounded ${selectedRegion === idx ? 'bg-yellow-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                                >
                                    {region.emoji} {region.name}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleVote}
                            disabled={isPending || isConfirming || !veOligBalance}
                            className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 rounded font-bold"
                        >
                            {isPending || isConfirming ? 'Processing...' : 'Cast Vote'}
                        </button>
                    </div>
                )
            },
            FARM: {
                title: '🌾 Farm Stall',
                icon: '🌾',
                color: 'green',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-300">Stake mETH to earn OLIG rewards</p>
                        <p className="text-sm text-gray-400">Your mETH: {formatBalance(mETHBalance)}</p>
                        <input
                            type="number"
                            value={inputAmount}
                            onChange={(e) => setInputAmount(e.target.value)}
                            placeholder="Amount to stake"
                            className="w-full p-3 bg-slate-700 rounded border border-slate-600 focus:border-green-500 outline-none"
                        />
                        <div className="grid grid-cols-3 gap-2">
                            {REGIONS.map((region, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedRegion(idx)}
                                    className={`p-2 rounded text-sm ${selectedRegion === idx ? 'bg-green-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                                >
                                    {region.emoji} {region.name}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleStake}
                            disabled={isPending || isConfirming || !inputAmount}
                            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded font-bold"
                        >
                            {isPending || isConfirming ? 'Processing...' : 'Stake mETH'}
                        </button>
                    </div>
                )
            },
            WAR: {
                title: '⚔️ War Theater',
                icon: '⚔️',
                color: 'red',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-300">Burn OLIG to attack or defend regions</p>
                        <p className="text-sm text-gray-400">Your OLIG: {formatBalance(oligBalance)}</p>
                        <div className="bg-slate-700 p-4 rounded">
                            <p className="text-center text-gray-400">No active wars</p>
                            <p className="text-center text-xs text-gray-500 mt-2">Wars can be declared when vote differences exceed threshold</p>
                        </div>
                        <a href="/war" className="block w-full py-3 bg-red-600 hover:bg-red-500 rounded font-bold text-center">
                            Open Full War Page
                        </a>
                    </div>
                )
            },
            STORE: {
                title: '🏪 Game Store',
                icon: '🏪',
                color: 'purple',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-300">Buy items by burning OLIG</p>
                        <p className="text-sm text-gray-400">Your OLIG: {formatBalance(oligBalance)}</p>
                        <div className="bg-slate-700 p-4 rounded text-center">
                            <p className="text-gray-400">Store items available in full page</p>
                        </div>
                        <a href="/store" className="block w-full py-3 bg-purple-600 hover:bg-purple-500 rounded font-bold text-center">
                            Open Full Store
                        </a>
                    </div>
                )
            },
            BRIBE: {
                title: '💰 Bribe Market',
                icon: '💰',
                color: 'amber',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-300">Deposit mETH as bribes to incentivize voters</p>
                        <p className="text-sm text-gray-400">Your mETH: {formatBalance(mETHBalance)}</p>
                        <input
                            type="number"
                            value={inputAmount}
                            onChange={(e) => setInputAmount(e.target.value)}
                            placeholder="Bribe amount (mETH)"
                            className="w-full p-3 bg-slate-700 rounded border border-slate-600 focus:border-amber-500 outline-none"
                        />
                        <div className="grid grid-cols-3 gap-2">
                            {REGIONS.map((region, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedRegion(idx)}
                                    className={`p-2 rounded text-sm ${selectedRegion === idx ? 'bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                                >
                                    {region.emoji} {region.name}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleBribe}
                            disabled={isPending || isConfirming || !inputAmount}
                            className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 rounded font-bold"
                        >
                            {isPending || isConfirming ? 'Processing...' : 'Deposit Bribe'}
                        </button>
                    </div>
                )
            },
            EPOCH: {
                title: '⏱️ Epoch Status',
                icon: '⏱️',
                color: 'blue',
                content: (
                    <div className="space-y-4 text-center">
                        <div className="bg-slate-700 p-6 rounded">
                            <p className="text-4xl font-bold text-blue-400">Epoch {currentEpoch?.toString() || '?'}</p>
                            <p className="text-gray-400 mt-2">Time until next epoch:</p>
                            <p className="text-2xl font-mono text-white mt-1">{countdown}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="bg-slate-700 p-3 rounded">
                                <p className="text-gray-400">mETH</p>
                                <p className="text-white font-bold">{formatBalance(mETHBalance)}</p>
                            </div>
                            <div className="bg-slate-700 p-3 rounded">
                                <p className="text-gray-400">OLIG</p>
                                <p className="text-white font-bold">{formatBalance(oligBalance)}</p>
                            </div>
                            <div className="bg-slate-700 p-3 rounded">
                                <p className="text-gray-400">veOLIG</p>
                                <p className="text-white font-bold">{formatBalance(veOligBalance)}</p>
                            </div>
                        </div>
                    </div>
                )
            }
        };

        const modal = modalConfig[activeModal];
        if (!modal) return null;

        return (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50" onClick={closeModal}>
                <div
                    className={`bg-slate-800 p-6 rounded-lg border-2 border-${modal.color}-600 max-w-md w-full shadow-2xl`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className={`text-2xl font-bold text-${modal.color}-500 mb-4 text-center`}>{modal.title}</h2>
                    {!isConnected ? (
                        <p className="text-center text-gray-400">Please connect your wallet</p>
                    ) : (
                        modal.content
                    )}
                    <button
                        onClick={closeModal}
                        className="mt-6 w-full text-gray-400 hover:text-white underline"
                    >
                        Close (ESC)
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="relative w-full max-w-6xl mx-auto">
                {/* Game Container */}
                <div
                    ref={containerRef}
                    className="bg-slate-800 rounded-xl overflow-hidden shadow-2xl border-4 border-slate-700 relative w-full aspect-video flex items-center justify-center"
                >
                    {!isReady && <div className="text-white">Loading Oligarchy...</div>}

                    {/* Dynamic Modal Overlay */}
                    {activeModal && renderModalContent()}

                    {/* Chat UI Overlay */}
                    <div className="absolute bottom-4 left-4 z-40 w-80 pointer-events-none">
                        <div
                            id="chat-log"
                            className="h-36 bg-black/50 text-white p-2 rounded mb-2 overflow-y-auto pointer-events-auto font-mono text-sm"
                            style={{ textShadow: '1px 1px 0 #000' }}
                        >
                            <div className="text-yellow-400">System: Welcome to The Oligarchy!</div>
                            <div className="text-gray-400 text-xs">Press F near objects to interact</div>
                        </div>
                        <input
                            id="chat-input"
                            type="text"
                            placeholder="Press Enter to chat..."
                            className="w-full bg-black/70 text-white border border-slate-600 rounded p-2 pointer-events-auto focus:outline-none focus:border-yellow-500"
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* HUD - Top Right */}
                    {isConnected && isReady && (
                        <div className="absolute top-4 right-4 z-40 bg-black/60 rounded-lg p-3 text-sm">
                            <div className="flex gap-4 text-white">
                                <span>💎 {formatBalance(mETHBalance)}</span>
                                <span>🪙 {formatBalance(oligBalance)}</span>
                                <span>🗳️ {formatBalance(veOligBalance)}</span>
                            </div>
                            <div className="text-center text-gray-400 text-xs mt-1">
                                Epoch {currentEpoch?.toString()} | {countdown}
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls Bar */}
                <div className="mt-4 flex justify-center gap-4">
                    <button
                        onClick={handleFullScreen}
                        className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-full shadow-lg transition-all"
                    >
                        ⛶ Fullscreen
                    </button>
                    <a
                        href="/farm"
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-full shadow-lg transition-all"
                    >
                        📊 Full Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PhaserGame;