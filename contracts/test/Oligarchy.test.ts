import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther, formatEther } from "viem";
import { network } from "hardhat";

/**
 * The Oligarchy GameFi System Tests
 *
 * These tests validate the core functionality of The Oligarchy game system:
 * - Farming: Staking mETH to earn OLIG tokens
 * - Politics: Locking OLIG for veOLIG and voting on regions
 * - Bribe Market: Competition between regions for votes using bribes
 * - Claim Bribe: Voters claim their share of bribe pool after epoch ends
 * - War Theater: Region battles for bribe looting
 * - Store: Burning OLIG tokens to purchase items
 */
describe("The Oligarchy GameFi System", function () {
  it("Complete Integration Test - All Phases", async function () {
    // Setup network connection
    const connection = await network.connect();
    const viem = connection.viem;
    const networkHelpers = connection.networkHelpers;
    const publicClient = await viem.getPublicClient();

    const walletClients = await viem.getWalletClients();
    const [owner, farmer, oligarch, attacker, briber1, briber2, voter1, voter2, voter3] = walletClients;

    console.log("Deploying Contracts...");

    // Deploy All Contracts
    const mETH = await viem.deployContract("MockMantleETH");
    const olig = await viem.deployContract("OligarchyToken", [owner.account.address]);
    const ve = await viem.deployContract("VeOligarchy", [olig.address]);

    const voter = await viem.deployContract("OligarchyVoter", [
      mETH.address,
      ve.address
    ]);

    const farm = await viem.deployContract("RegionFarmDynamic", [
      olig.address,
      mETH.address,
      voter.address,
      1000000n // Base emission rate
    ]);

    const war = await viem.deployContract("WarTheater", [olig.address, voter.address]);
    const store = await viem.deployContract("GameStore", [olig.address]);

    // Setup Permissions & Config
    const MINTER_ROLE = await olig.read.MINTER_ROLE();
    await olig.write.grantRole([MINTER_ROLE, farm.address]);
    await voter.write.setWarTheater([war.address]);

    // Add Regions
    await farm.write.addRegion([0n, 100n]); // North
    await farm.write.addRegion([1n, 100n]); // South
    await farm.write.addRegion([2n, 100n]); // East

    // Mint initial mETH to all users
    const initialBal = parseEther("1000");
    for (const user of [farmer, oligarch, attacker, briber1, briber2, voter1, voter2, voter3]) {
      await mETH.write.mint([user.account.address, initialBal]);
    }

    // Helper function to display pool subsidies
    async function displayPoolSubsidies(label: string) {
      const pool0 = await farm.read.poolInfo([0n]);
      const pool1 = await farm.read.poolInfo([1n]);
      const pool2 = await farm.read.poolInfo([2n]);

      const alloc0 = pool0[0];
      const alloc1 = pool1[0];
      const alloc2 = pool2[0];
      const totalAlloc = alloc0 + alloc1 + alloc2;

      console.log(`\n--- ${label} ---`);
      console.log(`\t> Total AllocPoints: ${totalAlloc}`);

      if (totalAlloc > 0n) {
        const share0 = Number(alloc0 * 10000n / totalAlloc) / 100;
        const share1 = Number(alloc1 * 10000n / totalAlloc) / 100;
        const share2 = Number(alloc2 * 10000n / totalAlloc) / 100;

        console.log(`\t> Pool 0 (North): allocPoint=${alloc0}, Share=${share0.toFixed(2)}%`);
        console.log(`\t> Pool 1 (South): allocPoint=${alloc1}, Share=${share1.toFixed(2)}%`);
        console.log(`\t> Pool 2 (East): allocPoint=${alloc2}, Share=${share2.toFixed(2)}%`);

        // Calculate estimated OLIG per day (baseRate * seconds per day)
        const baseRate = 1000000n; // 1 micro OLIG per second base
        const secondsPerDay = 86400n;
        const totalEmissionPerDay = baseRate * secondsPerDay;

        console.log(`\t> Daily OLIG Emission (estimated total): ${formatEther(totalEmissionPerDay)} OLIG`);
        console.log(`\t>   → Pool 0 gets: ~${(share0).toFixed(2)}% of emissions`);
        console.log(`\t>   → Pool 1 gets: ~${(share1).toFixed(2)}% of emissions`);
        console.log(`\t>   → Pool 2 gets: ~${(share2).toFixed(2)}% of emissions`);
      } else {
        console.log(`\t> No allocations yet`);
      }
    }

    // ========================================
    // PHASE 1: FARMING TEST
    // ========================================
    console.log("\n=== PHASE 1: Farming ===");
    {
      const depositAmount = parseEther("100");

      await mETH.write.approve([farm.address, depositAmount], { account: farmer.account });
      await farm.write.deposit([0n, depositAmount], { account: farmer.account });

      const userInfo = await farm.read.userInfo([0n, farmer.account.address]);
      assert.equal(userInfo[0], depositAmount, "Deposit amount mismatch");

      await networkHelpers.time.increase(7 * 24 * 60 * 60);
      await farm.write.deposit([0n, 0n], { account: farmer.account });

      const balance = await olig.read.balanceOf([farmer.account.address]);
      assert.ok(balance > 0n, "Farmer failed to earn OLIG");
      console.log(`\t> Farmer Earned: ${formatEther(balance)} OLIG ✓`);
    }

    // ========================================
    // PHASE 2: POLITICS - Setup Voters with veOLIG
    // ========================================
    console.log("\n=== PHASE 2: Politics - Setup Voters ===");

    // Setup 3 dedicated voters - adjusted so Region 1 can win
    const lockAmount1 = parseEther("400");   // voter1 - votes Region 0
    const lockAmount2 = parseEther("600");   // voter2 - votes Region 1 (bigger stake)
    const lockAmount3 = parseEther("500");   // voter3 - votes Region 1

    // Mint OLIG to voters
    await olig.write.mint([voter1.account.address, lockAmount1]);
    await olig.write.mint([voter2.account.address, lockAmount2]);
    await olig.write.mint([voter3.account.address, lockAmount3]);

    console.log(`\t> Voter1: ${formatEther(lockAmount1)} OLIG`);
    console.log(`\t> Voter2: ${formatEther(lockAmount2)} OLIG`);
    console.log(`\t> Voter3: ${formatEther(lockAmount3)} OLIG`);

    // Get current block for lock time calculation
    const block = await publicClient.getBlock();
    const oneYear = 365n * 24n * 60n * 60n;
    const unlockTime = block.timestamp + oneYear;

    // Create locks for all voters
    await olig.write.approve([ve.address, lockAmount1], { account: voter1.account });
    await ve.write.createLock([lockAmount1, unlockTime], { account: voter1.account });

    await olig.write.approve([ve.address, lockAmount2], { account: voter2.account });
    await ve.write.createLock([lockAmount2, unlockTime], { account: voter2.account });

    await olig.write.approve([ve.address, lockAmount3], { account: voter3.account });
    await ve.write.createLock([lockAmount3, unlockTime], { account: voter3.account });

    // Get voting power
    const power1 = await ve.read.balanceOf([voter1.account.address]);
    const power2 = await ve.read.balanceOf([voter2.account.address]);
    const power3 = await ve.read.balanceOf([voter3.account.address]);

    console.log(`\t> Voter1 veOLIG Power: ${formatEther(power1)}`);
    console.log(`\t> Voter2 veOLIG Power: ${formatEther(power2)}`);
    console.log(`\t> Voter3 veOLIG Power: ${formatEther(power3)}`);
    console.log(`\t> Voters setup complete ✓`);

    // ========================================
    // PHASE 3: BRIBE MARKET COMPETITION
    // ========================================
    console.log("\n=== PHASE 3: Bribe Market Competition ===");

    // Store the current epoch for claim later
    const EPOCH_DURATION = 604800n; // 1 week
    const voteBlock = await publicClient.getBlock();
    const voteEpoch = voteBlock.timestamp / EPOCH_DURATION;

    // 📊 Show OLIG Subsidy BEFORE Vote War
    await displayPoolSubsidies("🏛️ OLIG SUBSIDY BEFORE VOTE WAR");

    console.log("\n--- Round 1: Bribes Deposited ---");
    {
      // Briber1 bribes Region 0 (North) with 50 mETH
      const bribe1 = parseEther("50");
      await mETH.write.approve([voter.address, bribe1], { account: briber1.account });
      await voter.write.depositBribe([0n, bribe1], { account: briber1.account });
      console.log(`\t> Briber1 → Region 0 (North): ${formatEther(bribe1)} mETH`);

      // Briber2 bribes Region 1 (South) with 80 mETH - trying to outbid!
      const bribe2 = parseEther("80");
      await mETH.write.approve([voter.address, bribe2], { account: briber2.account });
      await voter.write.depositBribe([1n, bribe2], { account: briber2.account });
      console.log(`\t> Briber2 → Region 1 (South): ${formatEther(bribe2)} mETH`);

      // Farmer bribes Region 2 (East) with 30 mETH - smallest bribe
      const bribe3 = parseEther("30");
      await mETH.write.approve([voter.address, bribe3], { account: farmer.account });
      await voter.write.depositBribe([2n, bribe3], { account: farmer.account });
      console.log(`\t> Farmer → Region 2 (East): ${formatEther(bribe3)} mETH`);
    }

    console.log("\n--- Round 2: Voting Competition (Before Epoch Ends) ---");
    {
      // Voter1 (400 power) votes for Region 0 (North)
      await voter.write.vote([0n], { account: voter1.account });
      console.log(`\t> Voter1 votes Region 0 (North) with ${formatEther(power1)} power`);

      // Voter2 (600 power) votes for Region 1 (South) - biggest bribe attracts big voter!
      await voter.write.vote([1n], { account: voter2.account });
      console.log(`\t> Voter2 votes Region 1 (South) with ${formatEther(power2)} power`);

      // Voter3 (500 power) also votes for Region 1 (South) - joining the winning side
      await voter.write.vote([1n], { account: voter3.account });
      console.log(`\t> Voter3 votes Region 1 (South) with ${formatEther(power3)} power`);
    }

    console.log("\n--- Current Epoch Vote Tally ---");
    {
      console.log(`\t> Vote Epoch: ${voteEpoch}`);

      // Read region data for current epoch
      const region0 = await voter.read.regionData([voteEpoch, 0n]);
      const region1 = await voter.read.regionData([voteEpoch, 1n]);
      const region2 = await voter.read.regionData([voteEpoch, 2n]);

      console.log(`\t> Region 0 (North): ${formatEther(region0[0])} votes, ${formatEther(region0[1])} mETH bribe`);
      console.log(`\t> Region 1 (South): ${formatEther(region1[0])} votes, ${formatEther(region1[1])} mETH bribe`);
      console.log(`\t> Region 2 (East): ${formatEther(region2[0])} votes, ${formatEther(region2[1])} mETH bribe`);

      // Verify votes
      assert.ok(region0[0] > 0n, "Region 0 should have votes");
      assert.ok(region1[0] > 0n, "Region 1 should have votes");
      assert.ok(region1[0] > region0[0], "Region 1 should have more votes (2 big voters)");

      console.log(`\n\t> 🏆 Region 1 (South) LEADS with most votes!`);
    }

    console.log("\n--- Time Travel: Advance to Next Epoch ---");
    {
      // Advance time by 1 week to trigger epoch change
      await networkHelpers.time.increase(7 * 24 * 60 * 60);

      const newBlock = await publicClient.getBlock();
      const newEpoch = newBlock.timestamp / EPOCH_DURATION;
      console.log(`\t> Previous Epoch: ${voteEpoch}`);
      console.log(`\t> Current Epoch: ${newEpoch}`);

      // Sync votes - updates farm allocations based on voting results
      await farm.write.syncVotes({ account: owner.account });
      console.log(`\t> syncVotes() called ✓`);
    }

    // 📊 Show OLIG Subsidy AFTER Vote War
    await displayPoolSubsidies("🏛️ OLIG SUBSIDY AFTER VOTE WAR");

    // ========================================
    // PHASE 4: CLAIM BRIBE - Voters claim rewards
    // ========================================
    console.log("\n=== PHASE 4: Claim Bribe Rewards ===");
    {
      // Check mETH balances before claim
      const voter1BalBefore = await mETH.read.balanceOf([voter1.account.address]);
      const voter2BalBefore = await mETH.read.balanceOf([voter2.account.address]);
      const voter3BalBefore = await mETH.read.balanceOf([voter3.account.address]);

      console.log(`\n--- Before Claim ---`);
      console.log(`\t> Voter1 mETH: ${formatEther(voter1BalBefore)}`);
      console.log(`\t> Voter2 mETH: ${formatEther(voter2BalBefore)}`);
      console.log(`\t> Voter3 mETH: ${formatEther(voter3BalBefore)}`);

      // Get region data to calculate expected rewards
      const region0Data = await voter.read.regionData([voteEpoch, 0n]);
      const region1Data = await voter.read.regionData([voteEpoch, 1n]);

      console.log(`\n--- Expected Rewards (Formula: userVotes/totalVotes * bribePool) ---`);

      // Voter1 claims from Region 0 (sole voter gets 100% of 50 mETH bribe)
      console.log(`\t> Voter1 expected: 100% of 50 mETH = 50 mETH (sole voter in Region 0)`);

      // Voter2 claims from Region 1 (shares 80 mETH bribe with Voter3)
      const voter2Share = (power2 * parseEther("80")) / (power2 + power3);
      console.log(`\t> Voter2 expected: ${formatEther(power2)}/${formatEther(power2 + power3)} * 80 = ~${formatEther(voter2Share)} mETH`);

      // Voter3 claims from Region 1
      const voter3Share = (power3 * parseEther("80")) / (power2 + power3);
      console.log(`\t> Voter3 expected: ${formatEther(power3)}/${formatEther(power2 + power3)} * 80 = ~${formatEther(voter3Share)} mETH`);

      console.log(`\n--- Claiming Bribes ---`);

      // Voter1 claims from Region 0
      const tx1 = await voter.write.claimBribe([voteEpoch, 0n], { account: voter1.account });
      const receipt1 = await publicClient.waitForTransactionReceipt({ hash: tx1 });
      console.log(`\t> Voter1 claimed from Region 0 ✓`);

      // Voter2 claims from Region 1
      const tx2 = await voter.write.claimBribe([voteEpoch, 1n], { account: voter2.account });
      const receipt2 = await publicClient.waitForTransactionReceipt({ hash: tx2 });
      console.log(`\t> Voter2 claimed from Region 1 ✓`);

      // Voter3 claims from Region 1
      const tx3 = await voter.write.claimBribe([voteEpoch, 1n], { account: voter3.account });
      const receipt3 = await publicClient.waitForTransactionReceipt({ hash: tx3 });
      console.log(`\t> Voter3 claimed from Region 1 ✓`);

      // Check mETH balances after claim
      const voter1BalAfter = await mETH.read.balanceOf([voter1.account.address]);
      const voter2BalAfter = await mETH.read.balanceOf([voter2.account.address]);
      const voter3BalAfter = await mETH.read.balanceOf([voter3.account.address]);

      const voter1Earned = voter1BalAfter - voter1BalBefore;
      const voter2Earned = voter2BalAfter - voter2BalBefore;
      const voter3Earned = voter3BalAfter - voter3BalBefore;

      console.log(`\n--- After Claim ---`);
      console.log(`\t> Voter1 earned: ${formatEther(voter1Earned)} mETH`);
      console.log(`\t> Voter2 earned: ${formatEther(voter2Earned)} mETH`);
      console.log(`\t> Voter3 earned: ${formatEther(voter3Earned)} mETH`);
      console.log(`\t> Total distributed: ${formatEther(voter1Earned + voter2Earned + voter3Earned)} mETH`);

      // Verify claims
      assert.ok(voter1Earned > 0n, "Voter1 should have earned bribe");
      assert.ok(voter2Earned > 0n, "Voter2 should have earned bribe");
      assert.ok(voter3Earned > 0n, "Voter3 should have earned bribe");

      // Voter1 should get approximately 50 mETH (sole voter in Region 0)
      assert.ok(voter1Earned >= parseEther("49"), "Voter1 should get ~50 mETH");

      // Voter2 should earn more than Voter3 (has more voting power)
      assert.ok(voter2Earned > voter3Earned, "Voter2 should earn more than Voter3 (higher power)");

      console.log(`\n\t> 🎉 All voters successfully claimed their bribe rewards!`);
      console.log(`\t> 📊 Reward distribution is proportional to voting power`);
    }

    // ========================================
    // PHASE 5: WAR THEATER - Region vs Region Battle
    // ========================================
    console.log("\n=== PHASE 5: War Theater ===");
    {
      // Get current epoch from voter (single source of truth)
      const currentEpoch = await voter.read.getCurrentEpoch();
      console.log(`\t> Current Epoch: ${currentEpoch}`);

      // First, deposit bribes to regions in current epoch for war
      console.log("\n--- Setup: Deposit bribes for new epoch ---");
      const warBribe1 = parseEther("100");
      const warBribe2 = parseEther("50");

      await mETH.write.approve([voter.address, warBribe1], { account: briber1.account });
      await voter.write.depositBribe([1n, warBribe1], { account: briber1.account });
      console.log(`\t> Region 1 (South) bribe pool: ${formatEther(warBribe1)} mETH`);

      await mETH.write.approve([voter.address, warBribe2], { account: briber2.account });
      await voter.write.depositBribe([2n, warBribe2], { account: briber2.account });
      console.log(`\t> Region 2 (East) bribe pool: ${formatEther(warBribe2)} mETH`);

      // Check initial bribe pools
      const region1Before = await voter.read.regionData([currentEpoch, 1n]);
      const region2Before = await voter.read.regionData([currentEpoch, 2n]);
      console.log(`\n--- Initial Bribe Pools ---`);
      console.log(`\t> Region 1 bribe: ${formatEther(region1Before[1])} mETH`);
      console.log(`\t> Region 2 bribe: ${formatEther(region2Before[1])} mETH`);

      // Declare War: Region 1 attacks Region 2
      console.log("\n--- War Declaration ---");
      await war.write.declareWar([1n, 2n], { account: attacker.account });
      console.log(`\t> ⚔️ Region 1 (South) declares war on Region 2 (East)!`);

      // Mint OLIG to attacker and defender for troops  
      await olig.write.mint([attacker.account.address, parseEther("1000")]);
      await olig.write.mint([farmer.account.address, parseEther("500")]);

      // Attacker enlists troops (burns OLIG for attack power)
      console.log("\n--- Troop Enlistment (Burns OLIG) ---");
      const attackTroops = parseEther("800");
      const defendTroops = parseEther("300");

      await olig.write.approve([war.address, attackTroops], { account: attacker.account });
      await war.write.enlistTroops([1n, attackTroops, true], { account: attacker.account });
      console.log(`\t> Attacker burns ${formatEther(attackTroops)} OLIG for attack power`);

      // Defender enlists troops
      await olig.write.approve([war.address, defendTroops], { account: farmer.account });
      await war.write.enlistTroops([2n, defendTroops, false], { account: farmer.account });
      console.log(`\t> Defender burns ${formatEther(defendTroops)} OLIG for defense power`);

      // Check war power
      const attackPower = await war.read.regionAttackPower([currentEpoch, 1n]);
      const defensePower = await war.read.regionDefensePower([currentEpoch, 2n]);
      console.log(`\n--- Battle Power ---`);
      console.log(`\t> Region 1 Attack Power: ${formatEther(attackPower)} OLIG`);
      console.log(`\t> Region 2 Defense Power: ${formatEther(defensePower)} OLIG`);
      console.log(`\t> ${attackPower > defensePower ? "⚔️ ATTACKER has advantage!" : "🛡️ DEFENDER has advantage!"}`);

      // Resolve War
      console.log("\n--- War Resolution ---");
      await war.write.resolveWar([1n], { account: attacker.account });

      // Check bribe pools after war (30% loot if attacker wins)
      const region1After = await voter.read.regionData([currentEpoch, 1n]);
      const region2After = await voter.read.regionData([currentEpoch, 2n]);

      console.log(`\n--- After War Results ---`);
      console.log(`\t> Region 1 bribe: ${formatEther(region1After[1])} mETH`);
      console.log(`\t> Region 2 bribe: ${formatEther(region2After[1])} mETH`);

      if (attackPower > defensePower) {
        const loot = (region2Before[1] * 30n) / 100n;
        console.log(`\n\t> 🏆 ATTACKER WINS!`);
        console.log(`\t> 💰 Looted 30% from Region 2: ~${formatEther(loot)} mETH`);
        assert.ok(region1After[1] > region1Before[1], "Attacker should have gained bribe");
        assert.ok(region2After[1] < region2Before[1], "Defender should have lost bribe");
      } else {
        console.log(`\n\t> 🛡️ DEFENDER WINS! Region 2 keeps its bribe pool.`);
      }

      console.log(`\t> ⚔️ War simulation complete!`);
    }

    // ========================================
    // PHASE 6: STORE & BURN TEST
    // ========================================
    console.log("\n=== PHASE 6: Store & Burn ===");
    {
      await olig.write.mint([farmer.account.address, parseEther("100")]);
      await store.write.addItem(["Golden Castle", parseEther("50"), false]);

      const supplyBefore = await olig.read.totalSupply();
      await olig.write.approve([store.address, parseEther("50")], { account: farmer.account });
      await store.write.buyItem([1n], { account: farmer.account });
      const supplyAfter = await olig.read.totalSupply();

      assert.equal(supplyBefore - supplyAfter, parseEther("50"), "Burn failed");
      console.log(`\t> Supply Before: ${formatEther(supplyBefore)} OLIG`);
      console.log(`\t> Supply After: ${formatEther(supplyAfter)} OLIG`);
      console.log(`\t> Burned: 50 OLIG ✓`);
    }

    console.log("\n=== ALL TESTS PASSED ===\n");
  });
});