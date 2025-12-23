import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { contracts } from './useContracts';

const EPOCH_DURATION = 7 * 24 * 60 * 60; // 1 week in seconds

/**
 * Hook to get current epoch info from OligarchyVoter
 */
export function useEpoch() {
    const [countdown, setCountdown] = useState('');
    const [nextEpochTime, setNextEpochTime] = useState(0);

    // Read current epoch from voter contract
    const { data: currentEpoch, refetch } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'getCurrentEpoch',
    });

    // Read contract deployed time for epoch calculation
    const { data: contractDeployed } = useReadContract({
        address: contracts.voter.address,
        abi: contracts.voter.abi,
        functionName: 'CONTRACT_DEPLOYED',
    });

    useEffect(() => {
        if (currentEpoch !== undefined && contractDeployed !== undefined) {
            const deployedTime = Number(contractDeployed);
            const epochNum = Number(currentEpoch);

            // Calculate next epoch start time
            const nextEpoch = deployedTime + ((epochNum + 1) * EPOCH_DURATION);
            setNextEpochTime(nextEpoch);
        }
    }, [currentEpoch, contractDeployed]);

    // Countdown timer
    useEffect(() => {
        if (!nextEpochTime) return;

        const interval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const remaining = nextEpochTime - now;

            if (remaining <= 0) {
                setCountdown('Epoch ended!');
                refetch();
                return;
            }

            const days = Math.floor(remaining / 86400);
            const hours = Math.floor((remaining % 86400) / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            const seconds = remaining % 60;

            if (days > 0) {
                setCountdown(`${days}d ${hours}h ${minutes}m`);
            } else if (hours > 0) {
                setCountdown(`${hours}h ${minutes}m ${seconds}s`);
            } else {
                setCountdown(`${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [nextEpochTime, refetch]);

    return {
        currentEpoch: currentEpoch !== undefined ? Number(currentEpoch) : null,
        countdown,
        nextEpochTime,
        refetch,
    };
}
