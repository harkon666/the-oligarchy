import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther, formatEther } from "viem";
import { network } from "hardhat";

/**
 * THE OLIGARCHY: END-TO-END SYSTEM TEST
 * 
 * A complete simulation of the game's lifecycle.
 * Storyline:
 * 1. Genesis: A Whale buys Legendary Land.
 * 2. Farming: Farmers stake mETH and earn OLIG.
 * 3. Politics: The Whale runs for Governor of Region 1 and wins.
 * 4. Corruption: The Whale bribes his own region heavily.
 * 5. War: Region 2 attacks Region 1 and LOOTS the bribes.
 * 6. Revolution: Disappointed voters overthrow the Whale (Governor).
 * 7. Aftermath: The region returns to Anarchy.
 */

describe("The Oligarchy: Complete Chronicles", function () {
    it("Run Full Simulation", async function () {
        const connection = await network.connect();
        const viem = connection.viem;
        const publicClient = await viem.getPublicClient();
        const networkHelpers = connection.networkHelpers;

        // CHARACTERS
        // Owner: Deployer
        // Whale: Governor Candidate, Land Owner, Voter
        // Farmer: Generates OLIG liquidity
        // General: Attacker from Region 2
        // Rebel: Leader of the Revolution
        const [owner, whale, farmer, general, rebel] = await viem.getWalletClients();

        console.log("\n🎬 --- PROLOGUE: World Creation ---");

        // 1. Deploy Contracts
        const mETH = await viem.deployContract("MockMantleETH");
        const olig = await viem.deployContract("OligarchyToken", [owner.account.address]);
        const ve = await viem.deployContract("VeOligarchy", [olig.address]);

        const voter = await viem.deployContract("OligarchyVoter", [mETH.address, ve.address]);

        // 1,000,000 wei per second emission
        const farm = await viem.deployContract("RegionFarmDynamic", [
            olig.address, mETH.address, voter.address, 1000000n
        ]);

        const war = await viem.deployContract("WarTheater", [olig.address, voter.address]);
        const store = await viem.deployContract("GameStore", [olig.address]);

        const landURI = "https://api.oligarchy.game/land/";
        const land = await viem.deployContract("LandGenesis", [landURI]);

        const politics = await viem.deployContract("RegionPolitics", [voter.address, ve.address, olig.address]);

        // 2. Wiring & Permissions
        const MINTER_ROLE = await olig.read.MINTER_ROLE();
        await olig.write.grantRole([MINTER_ROLE, farm.address]);

        await voter.write.setWarTheater([war.address]);
        await voter.write.setLandGenesis([land.address]); // Link Land
        await voter.write.setRegionPolitics([politics.address]); // Link Politics

        // Add Regions to Farm
        await farm.write.addRegion([1n, 100n]); // Region 1 (South)
        await farm.write.addRegion([2n, 100n]); // Region 2 (North)

        console.log("\t> World built. Contracts deployed & linked.");


        // ============================================
        // CHAPTER 1: THE GENESIS (Land Sale)
        // ============================================
        console.log("\n🏰 --- CHAPTER 1: The Genesis ---");

        // Whale Buys Legendary Land (0.5 ETH)
        await land.write.mint([3n], { account: whale.account, value: parseEther("0.5") });
        console.log("\t> Whale purchased Legendary Land (+5% Vote Boost)");

        const whaleBoost = await land.read.getMultiplier([whale.account.address]);
        assert.equal(whaleBoost, 5n, "Whale should have 5% boost");


        // ============================================
        // CHAPTER 2: THE HARVEST (Farming)
        // ============================================
        console.log("\n🌾 --- CHAPTER 2: The Harvest ---");

        // Farmer gets mETH and Stakes
        await mETH.write.mint([farmer.account.address, parseEther("1000")]);
        await mETH.write.approve([farm.address, parseEther("1000")], { account: farmer.account });
        await farm.write.deposit([1n, parseEther("1000")], { account: farmer.account });
        console.log("\t> Farmer staked 1000 mETH in Region 1");

        // Fast Forward 1 Month to generate OLIG
        await networkHelpers.time.increase(30 * 24 * 60 * 60);

        // Harvest
        await farm.write.deposit([1n, 0n], { account: farmer.account }); // 0 deposit triggers harvest
        const farmerOlig = await olig.read.balanceOf([farmer.account.address]);
        console.log(`\t> Farmer harvested: ${formatEther(farmerOlig)} OLIG`);

        // Distribute OLIG to other characters for politics
        const fundAmount = parseEther("5000");
        await olig.write.mint([whale.account.address, fundAmount]);
        await olig.write.mint([general.account.address, fundAmount]);
        await olig.write.mint([rebel.account.address, fundAmount]);

        // Also give Farmer's stash to Rebel for massive power
        await olig.write.transfer([rebel.account.address, farmerOlig], { account: farmer.account });


        // ============================================
        // CHAPTER 3: THE ELECTION (Politics)
        // ============================================
        console.log("\n🗳️ --- CHAPTER 3: The Election ---");

        // All chars create Voting Power (veOLIG)
        const lockAmt = parseEther("2000");
        const longDuration = (await publicClient.getBlock()).timestamp + 31536000n; // 1 Year

        for (const char of [whale, general, rebel]) {
            await olig.write.approve([ve.address, lockAmt], { account: char.account });
            await ve.write.createLock([lockAmt, longDuration], { account: char.account });
        }

        // Whale nominates for Region 1 Governor
        await olig.write.approve([politics.address, parseEther("500")], { account: whale.account });
        await politics.write.nominate([1n, "Whale Dynasty"], { account: whale.account });
        console.log("\t> Whale nominated for Region 1 Governor");

        // Whale votes for himself
        await politics.write.vote([1n, whale.account.address], { account: whale.account });

        // End Epoch to finalize election
        // Need to know current epoch to execute next one
        const startEpoch = await voter.read.getCurrentEpoch();
        console.log(`\t> Current Epoch: ${startEpoch}`);

        // Advance 1 Week
        await networkHelpers.time.increase(7 * 24 * 60 * 60);

        await politics.write.executeElection([1n, startEpoch], { account: owner.account });

        const newGov = await politics.read.getCurrentGovernor([1n]);
        console.log(`\t> New Governor of Region 1: ${newGov}`);
        assert.equal(newGov.toLowerCase(), whale.account.address.toLowerCase(), "Whale is now Governor");


        // ============================================
        // CHAPTER 4: CORRUPTION (Bribes & Voting)
        // ============================================
        console.log("\n💰 --- CHAPTER 4: Corruption ---");

        // Whale (Governor) wants Region 1 to win rewards
        // He bribes Region 1 with mETH from his own pocket (Mocking mETH holding)
        await mETH.write.mint([whale.account.address, parseEther("1000")]);
        await mETH.write.approve([voter.address, parseEther("100")], { account: whale.account });

        await voter.write.depositBribe([1n, parseEther("100")], { account: whale.account });
        console.log("\t> Whale deposited 100 mETH bribe to Region 1");

        // Whale Votes for Region 1
        // THIS IS WHERE LAND BOOST KICKS IN
        // Base Power: ~2000
        // Legendary Land: +5% -> ~100 extra
        await voter.write.vote([1n], { account: whale.account });

        const currentEpoch = await voter.read.getCurrentEpoch();
        const whaleVotes = await voter.read.userVotes([currentEpoch, 1n, whale.account.address]);
        console.log(`\t> Whale Vote Weight: ${formatEther(whaleVotes)}`);

        // Base is slightly less than 2000 due to decay, but boost should ensure it's > base
        // Let's just confirm it voted sucessfully with high weight
        assert.ok(whaleVotes > parseEther("2000"), "Vote should be boosted > 2000 (Base + Boost)");


        // ============================================
        // CHAPTER 5: THE WAR (Looting)
        // ============================================
        console.log("\n⚔️ --- CHAPTER 5: The War ---");

        // General (Region 2 supporter) sees the bribe in Region 1
        // He declares war!
        await war.write.declareWar([2n, 1n], { account: general.account }); // 2 attacks 1
        console.log("\t> Region 2 (General) declares war on Region 1!");

        // Enlist Troops (Burn OLIG)
        const attackForce = parseEther("1000");
        await olig.write.approve([war.address, attackForce], { account: general.account });
        await war.write.enlistTroops([2n, attackForce, true], { account: general.account }); // Attack
        console.log("\t> General burns 1000 OLIG for troops");

        // Check Bribe Before
        const bribeBefore = (await voter.read.regionData([currentEpoch, 1n]))[1];

        // Resolve War
        await war.write.resolveWar([2n], { account: general.account });

        // Check Bribe After (Should decrease by 30%)
        const bribeAfter = (await voter.read.regionData([currentEpoch, 1n]))[1];
        const loot = bribeBefore - bribeAfter;

        console.log(`\t> Bribe Looted: ${formatEther(loot)} mETH`);
        assert.ok(loot > 0n, "Looting successful");

        // ============================================
        // CHAPTER 6: THE REVOLUTION (Coup)
        // ============================================
        console.log("\n🔥 --- CHAPTER 6: The Revolution ---");

        // Voters in Region 1 are angry they lost 30% of bribes.
        // Rebel Leader blames Governor Whale!

        // Rebel starts revolution
        const revFee = parseEther("1000");
        await olig.write.approve([politics.address, revFee], { account: rebel.account });
        await politics.write.startRevolution([1n], { account: rebel.account });
        console.log("\t> Rebel started Revolution! (Burned 1000 OLIG)");

        // Revolution needs > 50% of Governor's elected support.
        // Whale elected himself with ~2000 votes.
        // Threshold ~1000.
        // Rebel has 2000 locked + Farmer's stash (if locked? No farmer just gave liquid).
        // Rebel locked 2000 earlier.
        // Rebel auto-supports when starting. 2000 > 1000. Instant win.

        await politics.write.executeRevolution([1n], { account: rebel.account });
        console.log("\t> Revolution Executed!");

        // Verify Anarchy
        const oustedGov = await politics.read.getCurrentGovernor([1n]);
        console.log(`\t> New Governor Address: ${oustedGov}`);
        assert.equal(oustedGov, "0x0000000000000000000000000000000000000000", "Region is in Anarchy");

        // ============================================
        // EPILOGUE: THE END
        // ============================================
        console.log("\n🏁 --- SIMULATION COMPLETE ---");
        console.log("\t> Story verified. All systems operational.");
    });
});
