import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, maxUint256 } from 'viem';
import { Navbar } from '../components/Navbar';
import { contracts, REGIONS } from '../hooks/useContracts';
import { useEpoch } from '../hooks/useEpoch';

const PoliticsPage = () => {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
    const { currentEpoch, countdown } = useEpoch();

    const [lockAmount, setLockAmount] = useState('');
    const [lockDuration, setLockDuration] = useState(365); // days
    const [selectedRegion, setSelectedRegion] = useState(0);

    // =====================
    // CONTRACT READS
    // =====================

    // OLIG Balance
    const { data: oligBalance, refetch: refetchOlig } = useReadContract({
        address: contracts.olig.address,
        abi: contracts.olig.abi,
        functionName: 'balanceOf',
        args: [address],
    });

    // OLIG Allowance for veOLIG
    const { data: oligAllowance, refetch: refetchAllowance } = useReadContract({
        address: contracts.olig.address,
        abi: contracts.olig.abi,
        functionName: 'allowance',
        args: [address, contracts.veOlig.address],
    });

    // veOLIG Voting Power
    const { data: veBalance, refetch: refetchVe } = useReadContract({
        address: contracts.veOlig.address,
        abi: contracts.veOlig.abi,
        functionName: 'balanceOf',
        args: [address],
    });

    // Locked Balance Info
    const { data: lockedInfo } = useReadContract({
        address: contracts.veOlig.address,
        abi: contracts.veOlig.abi,
        functionName: 'locked',
        args: [address],
    });

    // Check if voted in current epoch for each region
    const { data: hasVoted0, refetch: refetchVote0 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'hasVotedInRegion',
        args: [BigInt(currentEpoch || 0), 0n, address],
    });

    const { data: hasVoted1, refetch: refetchVote1 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'hasVotedInRegion',
        args: [BigInt(currentEpoch || 0), 1n, address],
    });

    const { data: hasVoted2, refetch: refetchVote2 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'hasVotedInRegion',
        args: [BigInt(currentEpoch || 0), 2n, address],
    });

    // Region vote data for current epoch
    const { data: region0Data, refetch: refetchRegion0 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(currentEpoch || 0), 0n],
    });

    const { data: region1Data, refetch: refetchRegion1 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(currentEpoch || 0), 1n],
    });

    const { data: region2Data, refetch: refetchRegion2 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(currentEpoch || 0), 2n],
    });

    // =====================
    // REFETCH ON CONFIRM
    // =====================
    useEffect(() => {
        if (isConfirmed) {
            refetchOlig();
            refetchAllowance();
            refetchVe();
            refetchVote0();
            refetchVote1();
            refetchVote2();
            refetchRegion0();
            refetchRegion1();
            refetchRegion2();
            setLockAmount('');
        }
    }, [isConfirmed]);

    // =====================
    // HANDLERS
    // =====================
    // Approve MAX so user only needs to approve once
    const handleApproveOlig = () => {
        writeContract({
            address: contracts.olig.address,
            abi: contracts.olig.abi,
            functionName: 'approve',
            args: [contracts.veOlig.address, maxUint256],
        });
    };

    const handleCreateLock = () => {
        const unlockTime = BigInt(Math.floor(Date.now() / 1000) + lockDuration * 24 * 60 * 60);
        writeContract({
            address: contracts.veOlig.address,
            abi: contracts.veOlig.abi,
            functionName: 'createLock',
            args: [parseEther(lockAmount || '0'), unlockTime],
        });
    };

    const handleVote = () => {
        writeContract({
            address: contracts.voter.address,
            abi: contracts.voter.abi,
            functionName: 'vote',
            args: [BigInt(selectedRegion)],
        });
    };

    const handleWithdrawLock = () => {
        writeContract({
            address: contracts.veOlig.address,
            abi: contracts.veOlig.abi,
            functionName: 'withdraw',
        });
    };

    // =====================
    // HELPERS
    // =====================
    const hasVotedMap = { 0: hasVoted0, 1: hasVoted1, 2: hasVoted2 };
    const regionDataMap = { 0: region0Data, 1: region1Data, 2: region2Data };

    const getRegionVotes = (id) => regionDataMap[id]?.[0] || 0n;
    const hasAnyVote = hasVoted0 || hasVoted1 || hasVoted2;

    const lockedAmount = lockedInfo ? BigInt(lockedInfo[0]) : 0n;
    const lockEnd = lockedInfo ? Number(lockedInfo[1]) : 0;
    const isLockExpired = lockEnd > 0 && lockEnd < Math.floor(Date.now() / 1000);
    const isApproved = oligAllowance && oligAllowance > parseEther('1000000');

    // Calculate estimated voting power
    const estimatedVePower = lockAmount
        ? (parseFloat(lockAmount) * lockDuration / 365).toFixed(2)
        : '0';

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <Navbar />
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-yellow-500">🗳️ Politics</h1>
                    <p className="text-slate-400 mt-1">Lock OLIG → Get veOLIG → Vote on Regions</p>
                </header>

                {/* Epoch Info */}
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-4 rounded-xl border border-purple-500/30 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-300">Current Epoch</p>
                            <p className="text-2xl font-bold text-white">{currentEpoch ?? '...'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-purple-300">Next Epoch In</p>
                            <p className="text-2xl font-bold text-yellow-400">{countdown || '...'}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Lock OLIG Section */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h2 className="text-xl font-bold mb-4 text-yellow-400">🔒 Lock OLIG → veOLIG</h2>

                        {/* Current Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-700/50 p-3 rounded-lg">
                                <p className="text-sm text-slate-400">OLIG Balance</p>
                                <p className="text-xl font-mono text-yellow-400">
                                    {oligBalance ? formatEther(oligBalance) : '0'}
                                </p>
                            </div>
                            <div className="bg-slate-700/50 p-3 rounded-lg">
                                <p className="text-sm text-slate-400">veOLIG Power</p>
                                <p className="text-xl font-mono text-purple-400">
                                    {veBalance ? parseFloat(formatEther(veBalance)).toFixed(2) : '0'}
                                </p>
                            </div>
                        </div>

                        {lockedAmount > 0n ? (
                            // Already locked
                            <div className="space-y-4">
                                <div className="p-4 bg-green-900/30 border border-green-600/50 rounded-lg">
                                    <p className="text-sm text-green-300">Active Lock</p>
                                    <p className="text-lg font-mono">{formatEther(lockedAmount)} OLIG</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Unlocks: {new Date(lockEnd * 1000).toLocaleDateString()}
                                    </p>
                                </div>
                                {isLockExpired && (
                                    <button
                                        onClick={handleWithdrawLock}
                                        disabled={isPending || isConfirming}
                                        className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold text-black transition disabled:opacity-50"
                                    >
                                        {isPending ? 'Withdrawing...' : 'Withdraw Expired Lock'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            // Create new lock
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Amount (OLIG)</label>
                                    <input
                                        type="number"
                                        value={lockAmount}
                                        onChange={(e) => setLockAmount(e.target.value)}
                                        placeholder="0.0"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 focus:border-yellow-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">
                                        Lock Duration: {lockDuration} days
                                    </label>
                                    <input
                                        type="range"
                                        min="7"
                                        max="365"
                                        value={lockDuration}
                                        onChange={(e) => setLockDuration(Number(e.target.value))}
                                        className="w-full accent-yellow-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>1 week</span>
                                        <span>1 year (max)</span>
                                    </div>
                                </div>

                                <div className="p-3 bg-purple-900/30 border border-purple-600/30 rounded-lg">
                                    <p className="text-sm text-purple-300">Estimated veOLIG Power</p>
                                    <p className="text-xl font-mono text-purple-400">{estimatedVePower}</p>
                                </div>

                                {!isApproved ? (
                                    <button
                                        onClick={handleApproveOlig}
                                        disabled={!lockAmount || isPending || isConfirming}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition disabled:opacity-50"
                                    >
                                        {isPending ? 'Approving...' : '1. Approve OLIG'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCreateLock}
                                        disabled={!lockAmount || isPending || isConfirming}
                                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition disabled:opacity-50"
                                    >
                                        {isPending ? 'Locking...' : '2. Create Lock'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Vote Section */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h2 className="text-xl font-bold mb-4 text-yellow-400">🗳️ Vote on Region</h2>

                        {veBalance && veBalance > 0n ? (
                            <div className="space-y-4">
                                <p className="text-slate-400">
                                    Your full voting power ({parseFloat(formatEther(veBalance)).toFixed(2)} veOLIG) will be used.
                                </p>

                                {/* Region Cards */}
                                {Object.values(REGIONS).map((region) => (
                                    <div
                                        key={region.id}
                                        onClick={() => !hasVotedMap[Number(region.id)] && setSelectedRegion(Number(region.id))}
                                        className={`p-4 rounded-lg border transition cursor-pointer ${hasVotedMap[Number(region.id)]
                                            ? 'bg-green-900/30 border-green-600/50 cursor-not-allowed'
                                            : selectedRegion === Number(region.id)
                                                ? 'bg-yellow-600/20 border-yellow-500'
                                                : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-lg">
                                                {region.emoji} {region.name}
                                            </span>
                                            <span className="font-mono text-sm">
                                                {parseFloat(formatEther(getRegionVotes(Number(region.id)))).toFixed(1)} votes
                                            </span>
                                        </div>
                                        {hasVotedMap[Number(region.id)] && (
                                            <p className="text-sm text-green-400 mt-1">✓ You voted here</p>
                                        )}
                                    </div>
                                ))}

                                {!hasAnyVote && (
                                    <button
                                        onClick={handleVote}
                                        disabled={isPending || isConfirming}
                                        className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold text-black transition disabled:opacity-50"
                                    >
                                        {isPending ? 'Voting...' : `Vote for ${REGIONS[selectedRegion].name}`}
                                    </button>
                                )}

                                {hasAnyVote && (
                                    <div className="p-3 bg-slate-700/50 rounded-lg text-center text-slate-400">
                                        You've already voted this epoch. Wait for next epoch to vote again.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-4xl mb-4">🔒</p>
                                <p>Lock OLIG first to get voting power</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transaction Status */}
                {(isConfirming || isConfirmed) && (
                    <div className="mt-6 text-center">
                        {isConfirming && <p className="text-yellow-400 animate-pulse">Confirming Transaction...</p>}
                        {isConfirmed && <p className="text-green-400">Transaction Confirmed! 🎉</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PoliticsPage;
