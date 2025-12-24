import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { formatEther, parseEther, maxUint256 } from 'viem';
import { Navbar } from '../components/Navbar';
import { contracts, REGIONS } from '../hooks/useContracts';
import { useEpoch } from '../hooks/useEpoch';

/**
 * Developer Simulation Page
 * Allows testing game mechanics by simulating time and epochs
 */
const DevSimulatorPage = () => {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
    const { currentEpoch, countdown, refetch: refetchEpoch } = useEpoch();

    const [logs, setLogs] = useState([]);
    const [mintAmount, setMintAmount] = useState('100');

    // Contract reads
    const { data: methBalance, refetch: refetchMeth } = useReadContract({
        address: contracts.mETH.address,
        abi: contracts.mETH.abi,
        functionName: 'balanceOf',
        args: [address],
    });

    const { data: oligBalance, refetch: refetchOlig } = useReadContract({
        address: contracts.olig.address,
        abi: contracts.olig.abi,
        functionName: 'balanceOf',
        args: [address],
    });

    const { data: veBalance, refetch: refetchVe } = useReadContract({
        address: contracts.veOlig.address,
        abi: contracts.veOlig.abi,
        functionName: 'balanceOf',
        args: [address],
    });

    // Region data
    const { data: region0, refetch: refetchR0 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(currentEpoch || 0), 0n],
    });

    const { data: region1, refetch: refetchR1 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(currentEpoch || 0), 1n],
    });

    const { data: region2, refetch: refetchR2 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(currentEpoch || 0), 2n],
    });

    useEffect(() => {
        if (isConfirmed) {
            refetchMeth();
            refetchOlig();
            refetchVe();
            refetchEpoch();
            refetchR0();
            refetchR1();
            refetchR2();
        }
    }, [isConfirmed]);

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { message, type, timestamp }].slice(-20));
    };

    // =====================
    // SIMULATION ACTIONS
    // =====================

    const handleMintMETH = () => {
        addLog(`Minting ${mintAmount} mETH...`, 'action');
        writeContract({
            address: contracts.mETH.address,
            abi: contracts.mETH.abi,
            functionName: 'mint',
            args: [address, parseEther(mintAmount)],
        });
    };

    const handleMintOLIG = () => {
        addLog(`Minting ${mintAmount} OLIG...`, 'action');
        writeContract({
            address: contracts.olig.address,
            abi: contracts.olig.abi,
            functionName: 'mint',
            args: [address, parseEther(mintAmount)],
        });
    };

    const handleApproveAll = async () => {
        addLog('Approving all contracts with max allowance...', 'action');
        // Approve mETH for Farm
        writeContract({
            address: contracts.mETH.address,
            abi: contracts.mETH.abi,
            functionName: 'approve',
            args: [contracts.farm.address, maxUint256],
        });
    };

    const handleApproveVoter = () => {
        addLog('Approving mETH for Voter...', 'action');
        writeContract({
            address: contracts.mETH.address,
            abi: contracts.mETH.abi,
            functionName: 'approve',
            args: [contracts.voter.address, maxUint256],
        });
    };

    const handleApproveVeOlig = () => {
        addLog('Approving OLIG for veOLIG...', 'action');
        writeContract({
            address: contracts.olig.address,
            abi: contracts.olig.abi,
            functionName: 'approve',
            args: [contracts.veOlig.address, maxUint256],
        });
    };

    const handleApproveWar = () => {
        addLog('Approving OLIG for War...', 'action');
        writeContract({
            address: contracts.olig.address,
            abi: contracts.olig.abi,
            functionName: 'approve',
            args: [contracts.war.address, maxUint256],
        });
    };

    const handleApproveStore = () => {
        addLog('Approving OLIG for Store...', 'action');
        writeContract({
            address: contracts.olig.address,
            abi: contracts.olig.abi,
            functionName: 'approve',
            args: [contracts.store.address, maxUint256],
        });
    };

    const handleSyncVotes = () => {
        addLog('Syncing votes to farm...', 'action');
        writeContract({
            address: contracts.farm.address,
            abi: contracts.farm.abi,
            functionName: 'syncVotes',
        });
    };

    const handleQuickLock = () => {
        addLog('Creating 1-year lock with 100 OLIG...', 'action');
        const oneYear = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
        writeContract({
            address: contracts.veOlig.address,
            abi: contracts.veOlig.abi,
            functionName: 'createLock',
            args: [parseEther('100'), oneYear],
        });
    };

    const handleQuickVote = (regionId) => {
        addLog(`Voting for region ${regionId}...`, 'action');
        writeContract({
            address: contracts.voter.address,
            abi: contracts.voter.abi,
            functionName: 'vote',
            args: [BigInt(regionId)],
        });
    };

    const handleQuickBribe = (regionId) => {
        addLog(`Depositing 10 mETH bribe to region ${regionId}...`, 'action');
        writeContract({
            address: contracts.voter.address,
            abi: contracts.voter.abi,
            functionName: 'depositBribe',
            args: [BigInt(regionId), parseEther('10')],
        });
    };

    const handleAddItem = () => {
        addLog('Adding test item to store...', 'action');
        writeContract({
            address: contracts.store.address,
            abi: contracts.store.abi,
            functionName: 'addItem',
            args: ['Test Sword', parseEther('10'), false],
        });
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <Navbar />
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-purple-500">🛠️ Dev Simulator</h1>
                    <p className="text-slate-400 mt-1">Test game mechanics quickly without multiple approvals</p>
                </header>

                {/* Epoch & Balances */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-purple-900/30 p-4 rounded-xl border border-purple-500/30">
                        <p className="text-sm text-purple-300">Epoch</p>
                        <p className="text-2xl font-bold">{currentEpoch ?? '...'}</p>
                        <p className="text-xs text-slate-400 mt-1">{countdown}</p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <p className="text-sm text-slate-400">mETH</p>
                        <p className="text-xl font-mono text-cyan-400">
                            {methBalance ? parseFloat(formatEther(methBalance)).toFixed(2) : '0'}
                        </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <p className="text-sm text-slate-400">OLIG</p>
                        <p className="text-xl font-mono text-yellow-400">
                            {oligBalance ? parseFloat(formatEther(oligBalance)).toFixed(2) : '0'}
                        </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <p className="text-sm text-slate-400">veOLIG</p>
                        <p className="text-xl font-mono text-purple-400">
                            {veBalance ? parseFloat(formatEther(veBalance)).toFixed(2) : '0'}
                        </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <p className="text-sm text-slate-400">Status</p>
                        <p className={`text-lg font-bold ${isPending || isConfirming ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`}>
                            {isPending ? '⏳ Pending...' : isConfirming ? '⏳ Confirming...' : '✓ Ready'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Quick Actions */}
                    <div className="space-y-6">
                        {/* Mint Section */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-lg mb-3 text-green-400">💰 Mint Tokens</h3>
                            <input
                                type="number"
                                value={mintAmount}
                                onChange={(e) => setMintAmount(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 mb-3"
                                placeholder="Amount"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleMintMETH}
                                    disabled={isPending || isConfirming}
                                    className="py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold transition disabled:opacity-50"
                                >
                                    Mint mETH
                                </button>
                                <button
                                    onClick={handleMintOLIG}
                                    disabled={isPending || isConfirming}
                                    className="py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold text-black transition disabled:opacity-50"
                                >
                                    Mint OLIG
                                </button>
                            </div>
                        </div>

                        {/* Approvals */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-lg mb-3 text-blue-400">🔓 Approve All (Max)</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleApproveAll}
                                    disabled={isPending || isConfirming}
                                    className="py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition disabled:opacity-50"
                                >
                                    mETH→Farm
                                </button>
                                <button
                                    onClick={handleApproveVoter}
                                    disabled={isPending || isConfirming}
                                    className="py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition disabled:opacity-50"
                                >
                                    mETH→Voter
                                </button>
                                <button
                                    onClick={handleApproveVeOlig}
                                    disabled={isPending || isConfirming}
                                    className="py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition disabled:opacity-50"
                                >
                                    OLIG→veOLIG
                                </button>
                                <button
                                    onClick={handleApproveWar}
                                    disabled={isPending || isConfirming}
                                    className="py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition disabled:opacity-50"
                                >
                                    OLIG→War
                                </button>
                                <button
                                    onClick={handleApproveStore}
                                    disabled={isPending || isConfirming}
                                    className="py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition disabled:opacity-50 col-span-2"
                                >
                                    OLIG→Store
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Game Actions */}
                    <div className="space-y-6">
                        {/* Lock & Vote */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-lg mb-3 text-purple-400">🗳️ Quick Lock & Vote</h3>
                            <button
                                onClick={handleQuickLock}
                                disabled={isPending || isConfirming}
                                className="w-full py-2 mb-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition disabled:opacity-50"
                            >
                                Lock 100 OLIG (1 Year)
                            </button>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.values(REGIONS).map((region) => (
                                    <button
                                        key={region.id}
                                        onClick={() => handleQuickVote(Number(region.id))}
                                        disabled={isPending || isConfirming}
                                        className="py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold transition disabled:opacity-50"
                                    >
                                        Vote {region.emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bribes */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-lg mb-3 text-amber-400">💵 Quick Bribes (10 mETH)</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.values(REGIONS).map((region) => (
                                    <button
                                        key={region.id}
                                        onClick={() => handleQuickBribe(Number(region.id))}
                                        disabled={isPending || isConfirming}
                                        className="py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-bold text-black transition disabled:opacity-50"
                                    >
                                        {region.emoji} Bribe
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Admin Actions */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-lg mb-3 text-red-400">⚙️ Admin Actions</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleSyncVotes}
                                    disabled={isPending || isConfirming}
                                    className="py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-bold transition disabled:opacity-50"
                                >
                                    Sync Votes
                                </button>
                                <button
                                    onClick={handleAddItem}
                                    disabled={isPending || isConfirming}
                                    className="py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-bold transition disabled:opacity-50"
                                >
                                    Add Store Item
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Region Stats & Logs */}
                    <div className="space-y-6">
                        {/* Region Stats */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-lg mb-3 text-yellow-400">📊 Region Stats (Epoch {currentEpoch})</h3>
                            <div className="space-y-3">
                                {Object.values(REGIONS).map((region) => {
                                    const data = { 0: region0, 1: region1, 2: region2 }[Number(region.id)];
                                    const votes = data?.[0] || 0n;
                                    const bribes = data?.[1] || 0n;
                                    return (
                                        <div key={region.id} className="bg-slate-700/50 p-3 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold">{region.emoji} {region.name}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-slate-400">Votes: </span>
                                                    <span className="font-mono text-purple-400">
                                                        {parseFloat(formatEther(votes)).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">Bribes: </span>
                                                    <span className="font-mono text-amber-400">
                                                        {parseFloat(formatEther(bribes)).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Activity Log */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-lg mb-3 text-slate-400">📜 Activity Log</h3>
                            <div className="h-48 overflow-y-auto space-y-1 text-sm font-mono">
                                {logs.length === 0 ? (
                                    <p className="text-slate-500">No activity yet...</p>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className={`${log.type === 'action' ? 'text-blue-400' :
                                                log.type === 'success' ? 'text-green-400' : 'text-slate-400'
                                            }`}>
                                            <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hardhat Time Instructions */}
                <div className="mt-8 p-4 bg-slate-800 border border-slate-700 rounded-xl">
                    <h3 className="font-bold text-lg mb-2 text-orange-400">⏰ Simulate Time (Hardhat Console)</h3>
                    <p className="text-slate-400 text-sm mb-3">Run these commands in a new terminal to skip time:</p>
                    <div className="bg-slate-900 p-3 rounded-lg font-mono text-sm overflow-x-auto">
                        <p className="text-green-400"># Skip 1 week (advance epoch)</p>
                        <p className="text-slate-300 mb-2">npx hardhat console --network localhost</p>
                        <p className="text-slate-300">{`await network.provider.send("evm_increaseTime", [604800])`}</p>
                        <p className="text-slate-300">{`await network.provider.send("evm_mine")`}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DevSimulatorPage;
