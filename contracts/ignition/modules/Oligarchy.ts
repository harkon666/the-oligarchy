import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Oligarchy GameFi System - Full Deployment Module
 * 
 * Deploys all contracts in correct order with proper configuration:
 * 1. MockMantleETH (Test Token)
 * 2. OligarchyToken (OLIG)
 * 3. VeOligarchy (Vote Escrow)
 * 4. OligarchyVoter
 * 5. RegionFarmDynamic
 * 6. WarTheater
 * 7. GameStore
 */
const OligarchyModule = buildModule("OligarchyModule", (m) => {
  // Get deployer account for initial admin
  const deployer = m.getAccount(0);

  // Configuration parameters
  const baseEmissionRate = m.getParameter("baseEmissionRate", 1000000n);
  const initialRegionAllocPoint = m.getParameter("initialAllocPoint", 100n);

  // 1. Deploy MockMantleETH (mETH test token)
  const mETH = m.contract("MockMantleETH");

  // 2. Deploy OligarchyToken with deployer as initial admin
  const olig = m.contract("OligarchyToken", [deployer]);

  // 3. Deploy VeOligarchy (Vote Escrow for OLIG)
  const ve = m.contract("VeOligarchy", [olig]);

  // 4. Deploy OligarchyVoter
  const voter = m.contract("OligarchyVoter", [mETH, ve]);

  // 5. Deploy RegionFarmDynamic
  const farm = m.contract("RegionFarmDynamic", [olig, mETH, voter, baseEmissionRate]);

  // 6. Deploy WarTheater
  const war = m.contract("WarTheater", [olig, voter]);

  // 7. Deploy GameStore
  const store = m.contract("GameStore", [olig]);

  // === POST-DEPLOYMENT CONFIGURATION ===

  // Grant MINTER_ROLE to Farm contract
  const MINTER_ROLE = m.staticCall(olig, "MINTER_ROLE");
  m.call(olig, "grantRole", [MINTER_ROLE, farm], { id: "grantMinterToFarm" });

  // Set WarTheater in Voter
  m.call(voter, "setWarTheater", [war], { id: "setWarTheater" });

  // Add initial regions (0=North, 1=South, 2=East)
  m.call(farm, "addRegion", [0n, initialRegionAllocPoint], { id: "addRegionNorth" });
  m.call(farm, "addRegion", [1n, initialRegionAllocPoint], { id: "addRegionSouth" });
  m.call(farm, "addRegion", [2n, initialRegionAllocPoint], { id: "addRegionEast" });

  return { mETH, olig, ve, voter, farm, war, store };
});

export default OligarchyModule;
