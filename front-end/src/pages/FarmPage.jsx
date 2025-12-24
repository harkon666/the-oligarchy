import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, maxUint256 } from 'viem';
import { Navbar } from '../components/Navbar';
import { contracts, REGIONS } from '../hooks/useContracts';

const FarmPage = () => {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const [amount, setAmount] = useState('');
    const [activeTab, setActiveTab] = useState('deposit');
    const [selectedRegion, setSelectedRegion] = useState(0);

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

    // OLIG Balance
    const { data: oligBalance, refetch: refetchOlig } = useReadContract({
        address: contracts.olig.address,
        abi: contracts.olig.abi,
        functionName: 'balanceOf',
        args: [address],
    });

    // Allowance for Farm (check if max approved)
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: contracts.mETH.address,
        abi: contracts.mETH.abi,
        functionName: 'allowance',
        args: [address, contracts.farm.address],
    });

    // User Info for each region
    const { data: userInfo0, refetch: refetchUser0 } = useReadContract({
        address: contracts.farm.address,
        abi: contracts.farm.abi,
        functionName: 'userInfo',
        args: [0n, address],
    });

    const { data: userInfo1, refetch: refetchUser1 } = useReadContract({
        address: contracts.farm.address,
        abi: contracts.farm.abi,
        functionName: 'userInfo',
        args: [1n, address],
    });

    const { data: userInfo2, refetch: refetchUser2 } = useReadContract({
        address: contracts.farm.address,
        abi: contracts.farm.abi,
        functionName: 'userInfo',
        args: [2n, address],
    });

    // Pool Info for each region
    const { data: pool0 } = useReadContract({
        address: contracts.farm.address,
        abi: contracts.farm.abi,
        functionName: 'poolInfo',
        args: [0n],
    });

    const { data: pool1 } = useReadContract({
        address: contracts.farm.address,
        abi: contracts.farm.abi,
        functionName: 'poolInfo',
        args: [1n],
    });

    const { data: pool2 } = useReadContract({
        address: contracts.farm.address,
        abi: contracts.farm.abi,
        functionName: 'poolInfo',
        args: [2n],
    });

    // Total Alloc Points
    const { data: totalAllocPoint } = useReadContract({
        address: contracts.farm.address,
        abi: contracts.farm.abi,
        functionName: 'totalAllocPoint',
    });

    // =====================
    // REFETCH ON CONFIRM
    // =====================
    useEffect(() => {
        if (isConfirmed) {
            refetchMeth();
            refetchOlig();
            refetchAllowance();
            refetchUser0();
            refetchUser1();
            refetchUser2();
            setAmount('');
        }
    }, [isConfirmed]);

    // =====================
    // HANDLERS
    // =====================
    const handleFaucet = () => {
        writeContract({
            address: contracts.mETH.address,
            abi: contracts.mETH.abi,
            functionName: 'mint',
            args: [address, parseEther('10')],
        });
    };

    // Approve MAX so user only needs to approve once
    const handleApprove = () => {
        writeContract({
            address: contracts.mETH.address,
            abi: contracts.mETH.abi,
            functionName: 'approve',
            args: [contracts.farm.address, maxUint256],
        });
    };

    const handleDeposit = () => {
        writeContract({
            address: contracts.farm.address,
            abi: contracts.farm.abi,
            functionName: 'deposit',
            args: [BigInt(selectedRegion), parseEther(amount || '0')],
        });
    };

    const handleWithdraw = () => {
        writeContract({
            address: contracts.farm.address,
            abi: contracts.farm.abi,
            functionName: 'withdraw',
            args: [BigInt(selectedRegion), parseEther(amount || '0')],
        });
    };

    const handleClaim = () => {
        // Claim by depositing 0 - triggers reward distribution
        writeContract({
            address: contracts.farm.address,
            abi: contracts.farm.abi,
            functionName: 'deposit',
            args: [BigInt(selectedRegion), 0n],
        });
    };

    // =====================
    // HELPERS
    // =====================
    const getUserStaked = (regionId) => {
        const userMap = { 0: userInfo0, 1: userInfo1, 2: userInfo2 };
        return userMap[regionId]?.[0] || 0n;
    };

    const getPoolTVL = (regionId) => {
        const poolMap = { 0: pool0, 1: pool1, 2: pool2 };
        return poolMap[regionId]?.[3] || 0n;
    };

    const getAllocShare = (regionId) => {
        const poolMap = { 0: pool0, 1: pool1, 2: pool2 };
        const allocPoint = poolMap[regionId]?.[0] || 0n;
        if (!totalAllocPoint || totalAllocPoint === 0n) return 0;
        return Number((allocPoint * 10000n) / totalAllocPoint) / 100;
    };

    const totalStaked = (userInfo0?.[0] || 0n) + (userInfo1?.[0] || 0n) + (userInfo2?.[0] || 0n);

    // Check if user has approved (any amount > 0 means they've approved before)
    // We use a threshold check since max approval means very large number
    const isApproved = allowance && allowance > parseEther('1000000');

    // =====================
    // RENDER
    // =====================
    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <Navbar />
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-yellow-500">🌾 Region Farm</h1>
                        <p className="text-slate-400 mt-1">Stake mETH → Earn OLIG (weighted by votes)</p>
                    </div>
                    <button
                        onClick={handleFaucet}
                        disabled={isWritePending || isConfirming}
                        className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-bold shadow-lg transition disabled:opacity-50"
                    >
                        🚰 Faucet (10 mETH)
                    </button>
                </header>

                {/* Wallet Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <p className="text-sm text-slate-400">mETH Balance</p>
                        <p className="text-2xl font-mono text-cyan-400">
                            {methBalance ? formatEther(methBalance) : '0.0'}
                        </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <p className="text-sm text-slate-400">OLIG Balance</p>
                        <p className="text-2xl font-mono text-yellow-400">
                            {oligBalance ? formatEther(oligBalance) : '0.0'}
                        </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <p className="text-sm text-slate-400">Total Staked</p>
                        <p className="text-2xl font-mono text-green-400">
                            {formatEther(totalStaked)} mETH
                        </p>
                    </div>
                </div>

                {/* Approval Banner */}
                {!isApproved && (
                    <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-xl mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-blue-400">🔓 One-Time Approval Required</p>
                                <p className="text-sm text-slate-400">Approve once to enable all future deposits without extra confirmations</p>
                            </div>
                            <button
                                onClick={handleApprove}
                                disabled={isWritePending || isConfirming}
                                className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold transition disabled:opacity-50"
                            >
                                {isWritePending ? 'Approving...' : 'Approve mETH'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Region Pools */}
                <h2 className="text-xl font-bold mb-4 text-slate-300">📍 Region Pools</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {Object.values(REGIONS).map((region) => (
                        <div
                            key={region.id}
                            onClick={() => setSelectedRegion(Number(region.id))}
                            className={`bg-slate-800 p-4 rounded-xl border cursor-pointer transition hover:border-yellow-500/50 ${selectedRegion === Number(region.id)
                                    ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                                    : 'border-slate-700'
                                }`}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-lg font-bold">
                                    {region.emoji} {region.name}
                                </span>
                                <span className="text-sm px-2 py-1 bg-slate-700 rounded-full">
                                    {getAllocShare(Number(region.id)).toFixed(1)}% APY Share
                                </span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Your Stake</span>
                                    <span className="font-mono text-green-400">
                                        {formatEther(getUserStaked(Number(region.id)))} mETH
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Total TVL</span>
                                    <span className="font-mono">
                                        {formatEther(getPoolTVL(Number(region.id)))} mETH
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action Panel */}
                <div className="bg-slate-800 p-6 rounded-xl border border-yellow-600/30 max-w-lg mx-auto">
                    <div className="flex gap-2 mb-6 border-b border-slate-700 pb-3">
                        {['deposit', 'withdraw', 'claim'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`text-lg font-bold pb-2 px-3 capitalize ${activeTab === tab
                                        ? 'text-yellow-500 border-b-2 border-yellow-500'
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Selected Region */}
                    <div className="mb-4 p-3 bg-slate-700/50 rounded-lg text-center">
                        <span className="text-slate-400">Selected: </span>
                        <span className="font-bold text-yellow-400">
                            {REGIONS[selectedRegion].emoji} {REGIONS[selectedRegion].name}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {activeTab !== 'claim' && (
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Amount (mETH)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.0"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500"
                                />
                            </div>
                        )}

                        {/* Exit Tax Warning */}
                        {activeTab === 'withdraw' && (
                            <div className="p-3 bg-red-900/30 border border-red-600/50 rounded-lg text-sm text-red-300">
                                ⚠️ Exit tax: 0.01% goes to bribe pool
                            </div>
                        )}

                        {/* Action Buttons - Single click after approval */}
                        {activeTab === 'deposit' && (
                            <button
                                onClick={handleDeposit}
                                disabled={!amount || !isApproved || isWritePending || isConfirming}
                                className="w-full bg-yellow-600 hover:bg-yellow-500 py-3 rounded-lg font-bold text-black transition disabled:opacity-50"
                            >
                                {isWritePending ? 'Depositing...' : 'Deposit'}
                            </button>
                        )}

                        {activeTab === 'withdraw' && (
                            <button
                                onClick={handleWithdraw}
                                disabled={!amount || isWritePending || isConfirming}
                                className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-lg font-bold transition disabled:opacity-50"
                            >
                                {isWritePending ? 'Withdrawing...' : 'Withdraw'}
                            </button>
                        )}

                        {activeTab === 'claim' && (
                            <button
                                onClick={handleClaim}
                                disabled={isWritePending || isConfirming}
                                className="w-full bg-yellow-600 hover:bg-yellow-500 py-3 rounded-lg font-bold text-black transition disabled:opacity-50"
                            >
                                {isWritePending ? 'Claiming...' : 'Claim OLIG Rewards'}
                            </button>
                        )}

                        {/* Transaction Status */}
                        {isConfirming && (
                            <p className="text-center text-yellow-400 animate-pulse">
                                Confirming Transaction...
                            </p>
                        )}
                        {isConfirmed && (
                            <p className="text-center text-green-400">
                                Transaction Confirmed! 🎉
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FarmPage;
