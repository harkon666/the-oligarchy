import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, maxUint256 } from 'viem';
import { Navbar } from '../components/Navbar';
import { contracts, REGIONS } from '../hooks/useContracts';
import { useEpoch } from '../hooks/useEpoch';

const WarPage = () => {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
    const { currentEpoch } = useEpoch();

    const [attackerRegion, setAttackerRegion] = useState(0);
    const [defenderRegion, setDefenderRegion] = useState(1);
    const [troopAmount, setTroopAmount] = useState('');
    const [isAttacking, setIsAttacking] = useState(true);
    const [enlistRegion, setEnlistRegion] = useState(0);

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

    // OLIG Allowance for War
    const { data: oligAllowance, refetch: refetchAllowance } = useReadContract({
        address: contracts.olig.address,
        abi: contracts.olig.abi,
        functionName: 'allowance',
        args: [address, contracts.war.address],
    });

    // War targets for each region
    const { data: warTarget0 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'warTargets',
        args: [BigInt(currentEpoch || 0), 0n],
    });

    const { data: warTarget1 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'warTargets',
        args: [BigInt(currentEpoch || 0), 1n],
    });

    const { data: warTarget2 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'warTargets',
        args: [BigInt(currentEpoch || 0), 2n],
    });

    // Attack power for each region
    const { data: attackPower0, refetch: refetchAtk0 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'regionAttackPower',
        args: [BigInt(currentEpoch || 0), 0n],
    });

    const { data: attackPower1, refetch: refetchAtk1 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'regionAttackPower',
        args: [BigInt(currentEpoch || 0), 1n],
    });

    const { data: attackPower2, refetch: refetchAtk2 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'regionAttackPower',
        args: [BigInt(currentEpoch || 0), 2n],
    });

    // Defense power for each region
    const { data: defensePower0, refetch: refetchDef0 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'regionDefensePower',
        args: [BigInt(currentEpoch || 0), 0n],
    });

    const { data: defensePower1, refetch: refetchDef1 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'regionDefensePower',
        args: [BigInt(currentEpoch || 0), 1n],
    });

    const { data: defensePower2, refetch: refetchDef2 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'regionDefensePower',
        args: [BigInt(currentEpoch || 0), 2n],
    });

    // War resolved status
    const { data: warResolved0 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'warResolved',
        args: [BigInt(currentEpoch || 0), 0n],
    });

    const { data: warResolved1 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'warResolved',
        args: [BigInt(currentEpoch || 0), 1n],
    });

    const { data: warResolved2 } = useReadContract({
        address: contracts.war.address,
        abi: contracts.war.abi,
        functionName: 'warResolved',
        args: [BigInt(currentEpoch || 0), 2n],
    });

    // =====================
    // REFETCH ON CONFIRM
    // =====================
    useEffect(() => {
        if (isConfirmed) {
            refetchOlig();
            refetchAllowance();
            refetchAtk0(); refetchAtk1(); refetchAtk2();
            refetchDef0(); refetchDef1(); refetchDef2();
            setTroopAmount('');
        }
    }, [isConfirmed]);

    // =====================
    // HANDLERS
    // =====================
    const handleDeclareWar = () => {
        writeContract({
            address: contracts.war.address,
            abi: contracts.war.abi,
            functionName: 'declareWar',
            args: [BigInt(attackerRegion), BigInt(defenderRegion)],
        });
    };

    // Approve MAX so user only needs to approve once
    const handleApproveOlig = () => {
        writeContract({
            address: contracts.olig.address,
            abi: contracts.olig.abi,
            functionName: 'approve',
            args: [contracts.war.address, maxUint256],
        });
    };

    const handleEnlistTroops = () => {
        writeContract({
            address: contracts.war.address,
            abi: contracts.war.abi,
            functionName: 'enlistTroops',
            args: [BigInt(enlistRegion), parseEther(troopAmount || '0'), isAttacking],
        });
    };

    const handleResolveWar = (regionId) => {
        writeContract({
            address: contracts.war.address,
            abi: contracts.war.abi,
            functionName: 'resolveWar',
            args: [BigInt(regionId)],
        });
    };

    // =====================
    // HELPERS
    // =====================
    const warTargetMap = { 0: warTarget0, 1: warTarget1, 2: warTarget2 };
    const attackPowerMap = { 0: attackPower0 || 0n, 1: attackPower1 || 0n, 2: attackPower2 || 0n };
    const defensePowerMap = { 0: defensePower0 || 0n, 1: defensePower1 || 0n, 2: defensePower2 || 0n };
    const warResolvedMap = { 0: warResolved0, 1: warResolved1, 2: warResolved2 };

    const getActiveWars = () => {
        const wars = [];
        for (let i = 0; i < 3; i++) {
            const target = warTargetMap[i];
            if (target && target !== 0n) {
                wars.push({
                    attacker: i,
                    defender: Number(target),
                    resolved: warResolvedMap[i],
                });
            }
        }
        return wars;
    };

    const activeWars = getActiveWars();
    const isApproved = oligAllowance && oligAllowance > parseEther('1000000');

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <Navbar />
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-yellow-500">⚔️ War Theater</h1>
                    <p className="text-slate-400 mt-1">Declare war, burn OLIG for troops, loot 30% of enemy bribes!</p>
                </header>

                {/* Stats */}
                <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 p-4 rounded-xl border border-red-500/30 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-300">Epoch</p>
                            <p className="text-2xl font-bold">{currentEpoch ?? '...'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-red-300">OLIG Balance (Troops)</p>
                            <p className="text-2xl font-mono text-yellow-400">
                                {oligBalance ? formatEther(oligBalance) : '0'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-red-300">Loot Rate</p>
                            <p className="text-2xl font-bold text-green-400">30%</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Declare War Section */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h2 className="text-xl font-bold mb-4 text-red-400">🏴 Declare War</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Attacker Region</label>
                                <select
                                    value={attackerRegion}
                                    onChange={(e) => setAttackerRegion(Number(e.target.value))}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3"
                                >
                                    {Object.values(REGIONS).map((r) => (
                                        <option key={r.id} value={Number(r.id)}>
                                            {r.emoji} {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="text-center text-2xl">⚔️</div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Defender Region</label>
                                <select
                                    value={defenderRegion}
                                    onChange={(e) => setDefenderRegion(Number(e.target.value))}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3"
                                >
                                    {Object.values(REGIONS).filter(r => Number(r.id) !== attackerRegion).map((r) => (
                                        <option key={r.id} value={Number(r.id)}>
                                            {r.emoji} {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleDeclareWar}
                                disabled={isPending || isConfirming || attackerRegion === defenderRegion}
                                className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition disabled:opacity-50"
                            >
                                {isPending ? 'Declaring...' : 'Declare War!'}
                            </button>
                        </div>
                    </div>

                    {/* Enlist Troops Section */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h2 className="text-xl font-bold mb-4 text-orange-400">🎖️ Enlist Troops</h2>
                        <p className="text-sm text-slate-400 mb-4">Burn OLIG to add attack or defense power</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Region</label>
                                <select
                                    value={enlistRegion}
                                    onChange={(e) => setEnlistRegion(Number(e.target.value))}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3"
                                >
                                    {Object.values(REGIONS).map((r) => (
                                        <option key={r.id} value={Number(r.id)}>
                                            {r.emoji} {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsAttacking(true)}
                                    className={`flex-1 py-2 rounded-lg font-bold transition ${isAttacking ? 'bg-red-600' : 'bg-slate-700'
                                        }`}
                                >
                                    ⚔️ Attack
                                </button>
                                <button
                                    onClick={() => setIsAttacking(false)}
                                    className={`flex-1 py-2 rounded-lg font-bold transition ${!isAttacking ? 'bg-blue-600' : 'bg-slate-700'
                                        }`}
                                >
                                    🛡️ Defend
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">OLIG to Burn</label>
                                <input
                                    type="number"
                                    value={troopAmount}
                                    onChange={(e) => setTroopAmount(e.target.value)}
                                    placeholder="0.0"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 focus:border-yellow-500 focus:outline-none"
                                />
                            </div>

                            {!isApproved ? (
                                <button
                                    onClick={handleApproveOlig}
                                    disabled={!troopAmount || isPending || isConfirming}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition disabled:opacity-50"
                                >
                                    {isPending ? 'Approving...' : '1. Approve OLIG'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleEnlistTroops}
                                    disabled={!troopAmount || isPending || isConfirming}
                                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold transition disabled:opacity-50"
                                >
                                    {isPending ? 'Enlisting...' : '2. Enlist Troops (Burns OLIG)'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Wars */}
                <div className="mt-8">
                    <h2 className="text-xl font-bold mb-4 text-yellow-400">🔥 Active Wars</h2>

                    {activeWars.length === 0 ? (
                        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center text-slate-400">
                            <p className="text-4xl mb-2">🕊️</p>
                            <p>No active wars this epoch. Declare war to start the battle!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeWars.map((war, idx) => {
                                const attacker = REGIONS[war.attacker];
                                const defender = REGIONS[war.defender];
                                const atkPower = attackPowerMap[war.attacker];
                                const defPower = defensePowerMap[war.defender];
                                const total = atkPower + defPower || 1n;
                                const atkPercent = Number((atkPower * 100n) / total);

                                return (
                                    <div key={idx} className={`bg-slate-800 p-4 rounded-xl border ${war.resolved ? 'border-green-600/50' : 'border-red-600/50'
                                        }`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-lg">{attacker.emoji} {attacker.name}</span>
                                            <span className="text-xl">⚔️</span>
                                            <span className="text-lg">{defender.emoji} {defender.name}</span>
                                        </div>

                                        {/* Power Bar */}
                                        <div className="h-4 bg-blue-600 rounded-full overflow-hidden mb-3">
                                            <div
                                                className="h-full bg-red-500 transition-all"
                                                style={{ width: `${atkPercent}%` }}
                                            />
                                        </div>

                                        <div className="flex justify-between text-sm mb-4">
                                            <span className="text-red-400">
                                                ATK: {formatEther(atkPower)} OLIG
                                            </span>
                                            <span className="text-blue-400">
                                                DEF: {formatEther(defPower)} OLIG
                                            </span>
                                        </div>

                                        {war.resolved ? (
                                            <div className="text-center py-2 bg-green-900/30 rounded-lg text-green-400">
                                                ✓ War Resolved - {atkPower > defPower ? 'Attacker Won!' : 'Defender Won!'}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleResolveWar(war.attacker)}
                                                disabled={isPending || isConfirming}
                                                className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold text-black transition disabled:opacity-50"
                                            >
                                                {isPending ? 'Resolving...' : 'Resolve War'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
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

export default WarPage;
