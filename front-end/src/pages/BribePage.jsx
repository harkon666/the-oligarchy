import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, maxUint256 } from 'viem';
import { Navbar } from '../components/Navbar';
import { contracts, REGIONS } from '../hooks/useContracts';
import { useEpoch } from '../hooks/useEpoch';

const BribePage = () => {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
    const { currentEpoch, countdown } = useEpoch();

    const [activeTab, setActiveTab] = useState('deposit');
    const [selectedRegion, setSelectedRegion] = useState(0);
    const [bribeAmount, setBribeAmount] = useState('');
    const [claimEpoch, setClaimEpoch] = useState(0);

    // =====================
    // CONTRACT READS
    // =====================

    // mETH Balance
    const { data: methBalance, refetch: refetchMeth } = useReadContract({
        address: contracts.mETH.address,
        abi: contracts.mETH.abi,
        functionName: 'balanceOf',
        args: [address],
    });

    // mETH Allowance for Voter
    const { data: methAllowance, refetch: refetchAllowance } = useReadContract({
        address: contracts.mETH.address,
        abi: contracts.mETH.abi,
        functionName: 'allowance',
        args: [address, contracts.voter.address],
    });

    // Region data for current epoch
    const { data: region0Data, refetch: refetchR0 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(currentEpoch || 0), 0n],
    });

    const { data: region1Data, refetch: refetchR1 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(currentEpoch || 0), 1n],
    });

    const { data: region2Data, refetch: refetchR2 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(currentEpoch || 0), 2n],
    });

    // User votes for claim epoch
    const { data: userVotes0 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'userVotes',
        args: [BigInt(claimEpoch), 0n, address],
    });

    const { data: userVotes1 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'userVotes',
        args: [BigInt(claimEpoch), 1n, address],
    });

    const { data: userVotes2 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'userVotes',
        args: [BigInt(claimEpoch), 2n, address],
    });

    // Region data for claim epoch
    const { data: claimRegion0 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(claimEpoch), 0n],
    });

    const { data: claimRegion1 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(claimEpoch), 1n],
    });

    const { data: claimRegion2 } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'regionData',
        args: [BigInt(claimEpoch), 2n],
    });

    // =====================
    // REFETCH ON CONFIRM
    // =====================
    useEffect(() => {
        if (isConfirmed) {
            refetchMeth();
            refetchAllowance();
            refetchR0();
            refetchR1();
            refetchR2();
            setBribeAmount('');
        }
    }, [isConfirmed]);

    // Set claim epoch to previous epoch
    useEffect(() => {
        if (currentEpoch !== null && currentEpoch > 0) {
            setClaimEpoch(currentEpoch - 1);
        }
    }, [currentEpoch]);

    // =====================
    // HANDLERS
    // =====================
    // Approve MAX so user only needs to approve once
    const handleApproveMeth = () => {
        writeContract({
            address: contracts.mETH.address,
            abi: contracts.mETH.abi,
            functionName: 'approve',
            args: [contracts.voter.address, maxUint256],
        });
    };

    const handleDepositBribe = () => {
        writeContract({
            address: contracts.voter.address,
            abi: contracts.voter.abi,
            functionName: 'depositBribe',
            args: [BigInt(selectedRegion), parseEther(bribeAmount || '0')],
        });
    };

    const handleClaimBribe = (regionId) => {
        writeContract({
            address: contracts.voter.address,
            abi: contracts.voter.abi,
            functionName: 'claimBribe',
            args: [BigInt(claimEpoch), BigInt(regionId)],
        });
    };

    // =====================
    // HELPERS
    // =====================
    const regionDataMap = { 0: region0Data, 1: region1Data, 2: region2Data };
    const getRegionBribe = (id) => regionDataMap[id]?.[1] || 0n;
    const getRegionVotes = (id) => regionDataMap[id]?.[0] || 0n;

    const userVotesMap = { 0: userVotes0, 1: userVotes1, 2: userVotes2 };
    const claimRegionMap = { 0: claimRegion0, 1: claimRegion1, 2: claimRegion2 };

    const calculateReward = (regionId) => {
        const userWeight = userVotesMap[regionId] || 0n;
        const regionData = claimRegionMap[regionId];
        if (!regionData || !userWeight || userWeight === 0n) return 0n;

        const totalVotes = regionData[0] || 1n;
        const bribePool = regionData[1] || 0n;
        return (userWeight * bribePool) / totalVotes;
    };

    const isApproved = methAllowance && methAllowance > parseEther('1000000');

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <Navbar />
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-yellow-500">💰 Bribe Market</h1>
                    <p className="text-slate-400 mt-1">Deposit bribes to attract votes, claim rewards after epoch</p>
                </header>

                {/* Epoch Info */}
                <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 p-4 rounded-xl border border-amber-500/30 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-amber-300">Current Epoch</p>
                            <p className="text-2xl font-bold">{currentEpoch ?? '...'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-amber-300">mETH Balance</p>
                            <p className="text-2xl font-mono text-cyan-400">
                                {methBalance ? formatEther(methBalance) : '0'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-amber-300">Epoch Ends</p>
                            <p className="text-2xl font-bold text-yellow-400">{countdown || '...'}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {['deposit', 'claim'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-lg font-bold capitalize transition ${activeTab === tab
                                ? 'bg-yellow-600 text-black'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            {tab === 'deposit' ? '💵 Deposit Bribe' : '🎁 Claim Rewards'}
                        </button>
                    ))}
                </div>

                {activeTab === 'deposit' ? (
                    /* Deposit Bribe Tab */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Region Bribe Pools */}
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.values(REGIONS).map((region) => (
                                <div
                                    key={region.id}
                                    onClick={() => setSelectedRegion(Number(region.id))}
                                    className={`bg-slate-800 p-4 rounded-xl border cursor-pointer transition ${selectedRegion === Number(region.id)
                                        ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                                        : 'border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="text-3xl mb-2">{region.emoji}</div>
                                    <h3 className="font-bold text-lg">{region.name}</h3>
                                    <div className="mt-3 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Bribe Pool</span>
                                            <span className="font-mono text-amber-400">
                                                {formatEther(getRegionBribe(Number(region.id)))} mETH
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Total Votes</span>
                                            <span className="font-mono">
                                                {parseFloat(formatEther(getRegionVotes(Number(region.id)))).toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Deposit Form */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-lg mb-4">Deposit to {REGIONS[selectedRegion].name}</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Bribe Amount (mETH)</label>
                                    <input
                                        type="number"
                                        value={bribeAmount}
                                        onChange={(e) => setBribeAmount(e.target.value)}
                                        placeholder="0.0"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 focus:border-yellow-500 focus:outline-none"
                                    />
                                </div>

                                {!isApproved ? (
                                    <button
                                        onClick={handleApproveMeth}
                                        disabled={!bribeAmount || isPending || isConfirming}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition disabled:opacity-50"
                                    >
                                        {isPending ? 'Approving...' : '1. Approve mETH'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleDepositBribe}
                                        disabled={!bribeAmount || isPending || isConfirming}
                                        className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold text-black transition disabled:opacity-50"
                                    >
                                        {isPending ? 'Depositing...' : '2. Deposit Bribe'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Claim Rewards Tab */
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-4 mb-6">
                            <label className="text-slate-400">Claim from Epoch:</label>
                            <select
                                value={claimEpoch}
                                onChange={(e) => setClaimEpoch(Number(e.target.value))}
                                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                            >
                                {currentEpoch !== null && Array.from({ length: Math.max(0, currentEpoch) }, (_, i) => (
                                    <option key={i} value={i}>Epoch {i}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.values(REGIONS).map((region) => {
                                const userWeight = userVotesMap[Number(region.id)] || 0n;
                                const reward = calculateReward(Number(region.id));
                                const hasVoted = userWeight > 0n;
                                const canClaim = hasVoted && reward > 0n;

                                return (
                                    <div
                                        key={region.id}
                                        className={`p-4 rounded-xl border ${canClaim
                                            ? 'bg-green-900/30 border-green-600/50'
                                            : 'bg-slate-700/50 border-slate-600'
                                            }`}
                                    >
                                        <div className="text-2xl mb-2">{region.emoji}</div>
                                        <h3 className="font-bold">{region.name}</h3>

                                        <div className="mt-3 space-y-1 text-sm">
                                            <p className="text-slate-400">
                                                Your Votes: {formatEther(userWeight)}
                                            </p>
                                            <p className="text-lg font-mono text-green-400">
                                                Reward: {formatEther(reward)} mETH
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleClaimBribe(Number(region.id))}
                                            disabled={!canClaim || isPending || isConfirming}
                                            className="w-full mt-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {!hasVoted ? 'Not Voted' : isPending ? 'Claiming...' : 'Claim'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

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

export default BribePage;
