import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';

// ABIs
import MockMantleETHABI from '../ABI/MockMantleETHABI.json';
import OligarchyTokenABI from '../ABI/OligarchyTokenABI.json';
import VeOligarchyABI from '../ABI/VeOligarchyABI.json';
import OligarchyVoterABI from '../ABI/OligarchyVoterABI.json';
import RegionFarmDynamicABI from '../ABI/RegionFarmDynamicABI.json';
import WarTheaterABI from '../ABI/WarTheaterABI.json';
import GameStoreABI from '../ABI/GameStoreABI.json';

// Contract Addresses
import {
    MockMantleETH,
    OligarchyToken,
    VeOligarchy,
    OligarchyVoter,
    RegionFarmDynamic,
    WarTheater,
    GameStore
} from '../ContractAddr';

/**
 * Contract configuration with address and ABI for each contract
 */
export const contracts = {
    mETH: {
        address: MockMantleETH,
        abi: MockMantleETHABI.abi,
    },
    olig: {
        address: OligarchyToken,
        abi: OligarchyTokenABI.abi,
    },
    veOlig: {
        address: VeOligarchy,
        abi: VeOligarchyABI.abi,
    },
    voter: {
        address: OligarchyVoter,
        abi: OligarchyVoterABI.abi,
    },
    farm: {
        address: RegionFarmDynamic,
        abi: RegionFarmDynamicABI.abi,
    },
    war: {
        address: WarTheater,
        abi: WarTheaterABI.abi,
    },
    store: {
        address: GameStore,
        abi: GameStoreABI.abi,
    },
};

/**
 * Hook to get contract write function with transaction receipt tracking
 */
export function useContractWrite() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    return {
        writeContract,
        hash,
        isPending,
        isConfirming,
        isConfirmed,
        error,
    };
}

/**
 * Helper to read from any contract
 */
export function useContractRead(contractKey, functionName, args = []) {
    const contract = contracts[contractKey];
    return useReadContract({
        address: contract.address,
        abi: contract.abi,
        functionName,
        args,
    });
}

/**
 * Region names mapping (as array for easier iteration)
 */
export const REGIONS = [
    { id: 0n, name: 'North', emoji: '❄️' },
    { id: 1n, name: 'East', emoji: '�' },
    { id: 2n, name: 'South', emoji: '☀️' },
];

/**
 * Format balance helper - converts BigInt to readable string
 */
export function formatBalance(value) {
    if (!value) return '0.00';
    try {
        const num = typeof value === 'bigint'
            ? Number(value) / 1e18
            : parseFloat(value);
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toFixed(2);
    } catch {
        return '0.00';
    }
}

/**
 * Format utilities
 */
export { parseEther, formatEther };

/**
 * Uppercase contract aliases for convenience
 */
contracts.OLIG = contracts.olig;
contracts.Farm = contracts.farm;
contracts.Voter = contracts.voter;
contracts.veOLIG = contracts.veOlig;
