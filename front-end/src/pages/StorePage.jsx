import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, maxUint256 } from 'viem';
import { Navbar } from '../components/Navbar';
import { contracts } from '../hooks/useContracts';
import { ConfirmModal } from '../components/Modal';

const StorePage = () => {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const [selectedItem, setSelectedItem] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);

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

    // OLIG Total Supply
    const { data: totalSupply, refetch: refetchSupply } = useReadContract({
        address: contracts.olig.address,
        abi: contracts.olig.abi,
        functionName: 'totalSupply',
    });

    // OLIG Allowance for Store
    const { data: oligAllowance, refetch: refetchAllowance } = useReadContract({
        address: contracts.olig.address,
        abi: contracts.olig.abi,
        functionName: 'allowance',
        args: [address, contracts.store.address],
    });

    // Total Items
    const { data: totalItems } = useReadContract({
        address: contracts.store.address,
        abi: contracts.store.abi,
        functionName: 'totalItems',
    });

    // Read items (up to 10)
    const itemQueries = Array.from({ length: Math.min(Number(totalItems || 0), 10) }, (_, i) => i + 1);

    const { data: item1 } = useReadContract({
        address: contracts.store.address,
        abi: contracts.store.abi,
        functionName: 'items',
        args: [1n],
    });

    const { data: item2 } = useReadContract({
        address: contracts.store.address,
        abi: contracts.store.abi,
        functionName: 'items',
        args: [2n],
    });

    const { data: item3 } = useReadContract({
        address: contracts.store.address,
        abi: contracts.store.abi,
        functionName: 'items',
        args: [3n],
    });

    // Check if user has purchased items
    const { data: hasPurchased1, refetch: refetchPurchased1 } = useReadContract({
        address: contracts.store.address,
        abi: contracts.store.abi,
        functionName: 'hasPurchased',
        args: [address, 1n],
    });

    const { data: hasPurchased2, refetch: refetchPurchased2 } = useReadContract({
        address: contracts.store.address,
        abi: contracts.store.abi,
        functionName: 'hasPurchased',
        args: [address, 2n],
    });

    const { data: hasPurchased3, refetch: refetchPurchased3 } = useReadContract({
        address: contracts.store.address,
        abi: contracts.store.abi,
        functionName: 'hasPurchased',
        args: [address, 3n],
    });

    // =====================
    // REFETCH ON CONFIRM
    // =====================
    useEffect(() => {
        if (isConfirmed) {
            refetchOlig();
            refetchSupply();
            refetchAllowance();
            refetchPurchased1();
            refetchPurchased2();
            refetchPurchased3();
            setShowConfirm(false);
            setSelectedItem(null);
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
            args: [contracts.store.address, maxUint256],
        });
    };

    const handleBuyItem = (itemId) => {
        writeContract({
            address: contracts.store.address,
            abi: contracts.store.abi,
            functionName: 'buyItem',
            args: [BigInt(itemId)],
        });
    };

    // =====================
    // HELPERS
    // =====================
    const items = [
        { id: 1, data: item1, purchased: hasPurchased1 },
        { id: 2, data: item2, purchased: hasPurchased2 },
        { id: 3, data: item3, purchased: hasPurchased3 },
    ].filter(item => item.data && item.data[2]); // Filter active items

    const getItemEmoji = (name) => {
        const lower = (name || '').toLowerCase();
        if (lower.includes('castle')) return '🏰';
        if (lower.includes('sword')) return '⚔️';
        if (lower.includes('shield')) return '🛡️';
        if (lower.includes('crown')) return '👑';
        if (lower.includes('horse')) return '🐴';
        if (lower.includes('banner')) return '🚩';
        if (lower.includes('potion')) return '🧪';
        return '📦';
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <Navbar />
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-yellow-500">🏪 Game Store</h1>
                    <p className="text-slate-400 mt-1">Buy items by burning OLIG tokens (deflationary!)</p>
                </header>

                {/* Stats */}
                <div className="bg-gradient-to-r from-yellow-900/50 to-amber-900/50 p-4 rounded-xl border border-yellow-500/30 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-300">Your OLIG</p>
                            <p className="text-2xl font-mono text-yellow-400">
                                {oligBalance ? formatEther(oligBalance) : '0'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-yellow-300">Total Supply</p>
                            <p className="text-2xl font-mono">
                                {totalSupply ? formatEther(totalSupply) : '0'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-yellow-300">Items Available</p>
                            <p className="text-2xl font-bold">{items.length}</p>
                        </div>
                    </div>
                </div>

                {/* Items Grid */}
                {items.length === 0 ? (
                    <div className="bg-slate-800 p-12 rounded-xl border border-slate-700 text-center">
                        <p className="text-6xl mb-4">🏪</p>
                        <p className="text-xl text-slate-400">No items in store yet</p>
                        <p className="text-sm text-slate-500 mt-2">Owner needs to add items via addItem()</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map((item) => {
                            const name = item.data[0];
                            const price = item.data[1];
                            const isConsumable = item.data[3];
                            const owned = item.purchased && !isConsumable;
                            const canAfford = oligBalance && oligBalance >= price;
                            const isApproved = oligAllowance && oligAllowance > parseEther('1000000');

                            return (
                                <div
                                    key={item.id}
                                    className={`bg-slate-800 rounded-xl border overflow-hidden transition ${owned
                                        ? 'border-green-600/50 opacity-75'
                                        : 'border-slate-700 hover:border-yellow-500/50'
                                        }`}
                                >
                                    {/* Item Icon */}
                                    <div className="h-32 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                                        <span className="text-6xl">{getItemEmoji(name)}</span>
                                    </div>

                                    {/* Item Info */}
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-lg">{name}</h3>
                                            {isConsumable ? (
                                                <span className="text-xs px-2 py-1 bg-blue-600/30 text-blue-400 rounded-full">
                                                    Consumable
                                                </span>
                                            ) : (
                                                <span className="text-xs px-2 py-1 bg-purple-600/30 text-purple-400 rounded-full">
                                                    Permanent
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-2xl font-mono text-yellow-400 mb-4">
                                            {formatEther(price)} OLIG
                                        </p>

                                        {owned ? (
                                            <div className="py-2 bg-green-900/30 rounded-lg text-center text-green-400">
                                                ✓ Owned
                                            </div>
                                        ) : !canAfford ? (
                                            <div className="py-2 bg-red-900/30 rounded-lg text-center text-red-400">
                                                Insufficient OLIG
                                            </div>
                                        ) : !isApproved ? (
                                            <button
                                                onClick={() => handleApproveOlig()}
                                                disabled={isPending || isConfirming}
                                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition disabled:opacity-50"
                                            >
                                                {isPending ? 'Approving...' : 'Approve OLIG'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setShowConfirm(true);
                                                }}
                                                disabled={isPending || isConfirming}
                                                className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold text-black transition disabled:opacity-50"
                                            >
                                                Buy Item
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Burn Info */}
                <div className="mt-8 p-4 bg-red-900/20 border border-red-600/30 rounded-xl">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🔥</span>
                        <div>
                            <p className="font-bold text-red-400">Deflationary Mechanism</p>
                            <p className="text-sm text-slate-400">
                                OLIG tokens spent in the store are permanently burned, reducing total supply!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Confirm Modal */}
                <ConfirmModal
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={() => selectedItem && handleBuyItem(selectedItem.id)}
                    title="Confirm Purchase"
                    message={`Buy ${selectedItem?.data?.[0]} for ${selectedItem?.data?.[1] ? formatEther(selectedItem.data[1]) : '0'} OLIG? This will permanently burn your tokens.`}
                    confirmText="Buy & Burn"
                    isLoading={isPending || isConfirming}
                />

                {/* Transaction Status */}
                {isConfirmed && (
                    <div className="mt-6 text-center">
                        <p className="text-green-400">Purchase Successful! 🎉</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StorePage;
