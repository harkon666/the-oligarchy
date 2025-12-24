import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther, formatEther } from "viem";
import { network } from "hardhat";

describe("Mini Politics System Tests (Governor & Revolution)", function () {
    it("Should elect a Governor and then Overthrow them (Revolution)", async function () {
        const connection = await network.connect();
        const viem = connection.viem;
        const publicClient = await viem.getPublicClient();
        const networkHelpers = connection.networkHelpers;

        // Wallets: Owner, CandidateA (Future Gov), CandidateB (Loser), Revolutionary
        const [owner, candidateA, candidateB, rebelLeader, rebelSupporter] = await viem.getWalletClients();

        console.log("1. Deploying Contracts...");

        // Deploy Core
        const mETH = await viem.deployContract("MockMantleETH");
        const olig = await viem.deployContract("OligarchyToken", [owner.account.address]);
        const ve = await viem.deployContract("VeOligarchy", [olig.address]);
        const voter = await viem.deployContract("OligarchyVoter", [mETH.address, ve.address]);

        // Deploy Politics
        const politics = await viem.deployContract("RegionPolitics", [
            voter.address,
            ve.address,
            olig.address
        ]);

        // Link Politics
        await voter.write.setRegionPolitics([politics.address]);

        // SETUP: Mint OLIG & Create Voting Power
        const fundAmount = parseEther("5000");
        const lockAmount = parseEther("1000"); // Standard Voter Power
        const whaleLock = parseEther("2000"); // Rebel Leader needs big power

        // Setup Candidate A
        await olig.write.mint([candidateA.account.address, fundAmount]);
        await olig.write.approve([ve.address, fundAmount], { account: candidateA.account });
        await ve.write.createLock([lockAmount, (await publicClient.getBlock()).timestamp + 31536000n], { account: candidateA.account });

        // Setup Rebel Leader (Whale)
        await olig.write.mint([rebelLeader.account.address, fundAmount]);
        await olig.write.approve([ve.address, fundAmount], { account: rebelLeader.account });
        await ve.write.createLock([whaleLock, (await publicClient.getBlock()).timestamp + 31536000n], { account: rebelLeader.account });

        // Setup Rebel Supporter
        await olig.write.mint([rebelSupporter.account.address, fundAmount]);
        await olig.write.approve([ve.address, fundAmount], { account: rebelSupporter.account });
        await ve.write.createLock([lockAmount, (await publicClient.getBlock()).timestamp + 31536000n], { account: rebelSupporter.account });


        // ============================================
        // STEP 1: NOMINATION (Epoch 0)
        // ============================================
        console.log("\n--- STEP 1: Nomination & Election (Epoch 0) ---");
        const deposit = parseEther("500");

        // Candidate A Nominates
        await olig.write.approve([politics.address, deposit], { account: candidateA.account });
        await politics.write.nominate([1n, "Guild Alpha"], { account: candidateA.account });
        console.log("\t> Candidate A nominated for Region 1");

        // Candidate A Votes for Himself
        await politics.write.vote([1n, candidateA.account.address], { account: candidateA.account });
        console.log("\t> Candidate A votes for self");


        // ============================================
        // STEP 2: FINALIZE ELECTION (Epoch 1)
        // ============================================
        console.log("\n--- STEP 2: Time Travel to Epoch 1 (Governor Inauguration) ---");

        // Advance 1 week
        await networkHelpers.time.increase(7 * 24 * 60 * 60);

        // Execute Election for Epoch 0
        await politics.write.executeElection([1n, 0n], { account: owner.account });

        // Check Status
        const governor = await politics.read.getCurrentGovernor([1n]);
        console.log(`\t> Current Governor (Region 1): ${governor}`);
        assert.equal(governor.toLowerCase(), candidateA.account.address.toLowerCase(), "Candidate A should be Governor");


        // ============================================
        // STEP 3: REVOLUTION (The Coup)
        // ============================================
        console.log("\n--- STEP 3: Start Revolution (The Coup) ---");

        // Rebel Leader starts revolution
        const revFee = parseEther("1000");
        await olig.write.approve([politics.address, revFee], { account: rebelLeader.account });

        await politics.write.startRevolution([1n], { account: rebelLeader.account });
        console.log("\t> Rebel Leader started Revolution against Governor A");

        // Check Revolution State
        // Need support > 50% of Governor's votes.
        // Gov votes = 1000 (Candidate A self vote).
        // Threshold = 500.
        // Rebel Leader Power = 2000.
        // Leader automatically supports when starting. 
        // 2000 > 500 -> Should be instant win.

        console.log("\n--- STEP 4: Execute Revolution ---");

        await politics.write.executeRevolution([1n], { account: rebelLeader.account });
        console.log("\t> Revolution Executed!");

        // ============================================
        // STEP 5: VERIFY CHAOS (Vacuum of Power)
        // ============================================
        console.log("\n--- STEP 5: Verify Vacuum of Power ---");

        const oustedGov = await politics.read.getCurrentGovernor([1n]);
        console.log(`\t> Governor Address after Coup: ${oustedGov}`);

        assert.equal(oustedGov, "0x0000000000000000000000000000000000000000", "Region should be Anarchy (Zero Address)");

        // Check struct detail
        // We assume epoch 0 election winner struct is updated
        const govStruct = await politics.read.getGovernor([1n, 0n]); // Governor elected IN epoch 0
        assert.equal(govStruct.isOusted, true, "Governor struct should be marked Ousted");

        console.log("✅ Revolution Logic Verified: Governor A was overthrown successfully!");
    });
});
