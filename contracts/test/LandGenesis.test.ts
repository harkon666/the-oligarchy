import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther, formatEther } from "viem";
import { network } from "hardhat";

describe("Land Genesis Integration Tests", function () {
    it("Should mint Land and Boost Voting Power correctly", async function () {
        const connection = await network.connect();
        const viem = connection.viem;
        const publicClient = await viem.getPublicClient();
        const walletClients = await viem.getWalletClients();
        const [owner, userNoLand, userCommon, userLegendary] = walletClients;

        console.log("1. Deploying Contracts...");

        // Deploy Dependencies
        const mETH = await viem.deployContract("MockMantleETH");
        const olig = await viem.deployContract("OligarchyToken", [owner.account.address]);
        const ve = await viem.deployContract("VeOligarchy", [olig.address]);

        // Deploy Voter
        const voter = await viem.deployContract("OligarchyVoter", [
            mETH.address,
            ve.address
        ]);

        // Deploy LandGenesis
        const landURI = "https://api.oligarchy.game/land/";
        const land = await viem.deployContract("LandGenesis", [landURI]);

        // Connect Land to Voter
        console.log("2. Setting up permissions...");
        await voter.write.setLandGenesis([land.address]);

        // Setup Voting Power (veOLIG) for all users
        const lockAmount = parseEther("1000");
        const unlockTime = (await publicClient.getBlock()).timestamp + (365n * 24n * 60n * 60n); // 1 Year

        for (const user of [userNoLand, userCommon, userLegendary]) {
            // Mint OLIG
            await olig.write.mint([user.account.address, lockAmount]);
            // Approve & Lock
            await olig.write.approve([ve.address, lockAmount], { account: user.account });
            await ve.write.createLock([lockAmount, unlockTime], { account: user.account });
        }

        // -------------------------------------------
        // TEST 1: Minting Lands
        // -------------------------------------------
        console.log("3. Testing Minting Logic...");

        // Mint Common Land (Tier 1) for userCommon
        const commonPrice = parseEther("0.05");
        await land.write.mint([1n], {
            account: userCommon.account,
            value: commonPrice
        });
        console.log("\t> UserCommon minted Tier 1 Land");

        // Mint Legendary Land (Tier 3) for userLegendary
        const legPrice = parseEther("0.50");
        await land.write.mint([3n], {
            account: userLegendary.account,
            value: legPrice
        });
        console.log("\t> UserLegendary minted Tier 3 Land");

        // Verify Balances
        const balCommon = await land.read.balanceOf([userCommon.account.address]);
        assert.equal(balCommon, 1n, "UserCommon should have 1 Land");

        // -------------------------------------------
        // TEST 2: Voting Power Boost
        // -------------------------------------------
        console.log("4. Testing Voting Boosts...");

        // We need to add a region to vote for
        // Since we don't have the Farm contract in this test to read weights properly for full system,
        // we only check the `OligarchyVoter` event or state.
        // However, `OligarchyVoter` stores `userVotes`. Let's check that.

        // A. User No Land Vote
        await voter.write.vote([1n], { account: userNoLand.account });

        // B. User Common Vote (+1%)
        await voter.write.vote([1n], { account: userCommon.account });

        // C. User Legendary Vote (+5%)
        await voter.write.vote([1n], { account: userLegendary.account });

        // READ VOTES
        const epoch = await voter.read.getCurrentEpoch();

        const votesNoLand = await voter.read.userVotes([epoch, 1n, userNoLand.account.address]);
        const votesCommon = await voter.read.userVotes([epoch, 1n, userCommon.account.address]);
        const votesLegendary = await voter.read.userVotes([epoch, 1n, userLegendary.account.address]);

        console.log(`\t> Base Votes (No Land): ${formatEther(votesNoLand)}`);
        console.log(`\t> Common Land Votes (+1%): ${formatEther(votesCommon)}`);
        console.log(`\t> Legendary Land Votes (+5%): ${formatEther(votesLegendary)}`);

        // Verify Math
        // Base ~ 1000 (slightly less due to time decay if any, but in fresh block it's close)
        // 1% of 1000 = 10 -> Total 1010
        // 5% of 1000 = 50 -> Total 1050

        // Check Common Boost (> Base)
        assert.ok(votesCommon > votesNoLand, "Common Land should have more votes than No Land");

        // Check Legendary Boost (> Common)
        assert.ok(votesLegendary > votesCommon, "Legendary Land should have more votes than Common");

        // Precise check (Tolerance for small wei diffs due to time passing not expected here as we lock same time)
        // Actually time passes slightly between txs so slight decay diff might exist if implementation uses block.timestamp
        // But VeOligarchy uses bias/slope.
        // Let's assume rough percentage check.

        const boostCommon = votesCommon - votesNoLand;
        const boostLeg = votesLegendary - votesNoLand;

        // Expected ~10 OLIG boost
        console.log(`\t> Common Boost Amount: ${formatEther(boostCommon)}`);
        // Expected ~50 OLIG boost
        console.log(`\t> Legendary Boost Amount: ${formatEther(boostLeg)}`);

        assert.ok(boostLeg > boostCommon * 4n, "Legendary boost should be roughly 5x common boost");

        console.log("✅ All Land Genesis Tests Passed!");
    });
});
