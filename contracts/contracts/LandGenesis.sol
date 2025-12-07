// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/ILandGenesis.sol";

/**
 * @title LandGenesis
 * @notice Manages Land NFTs which provide Voting Power boosts in OligarchyVoter.
 * Implements ERC721Enumerable to correctly track user holdings and calculate best boost.
 */
contract LandGenesis is ERC721Enumerable, Ownable, ReentrancyGuard, ILandGenesis {
    using Strings for uint256;

    // --- CONFIG TIERS ---
    uint256 public constant TIER_COMMON = 1;
    uint256 public constant TIER_RARE = 2;
    uint256 public constant TIER_LEGENDARY = 3;

    struct TierInfo {
        uint256 price;          // Price in Native Token (Wei)
        uint256 maxSupply;      // Max mintable
        uint256 mintedCount;    // Current minted
        uint256 voteMultiplier; // Boost in percent (e.g., 5 = 5%)
    }

    // Mapping Tier ID => Info
    mapping(uint256 => TierInfo) public tiers;

    // Mapping NFT ID => Tier ID
    mapping(uint256 => uint256) public tokenTier;

    string public baseURI;

    event LandMinted(address indexed buyer, uint256 indexed tokenId, uint256 tierId);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    constructor(
        string memory _initBaseURI
    ) ERC721("Oligarchy Land Genesis", "OLIGLAND") Ownable(msg.sender) {
        baseURI = _initBaseURI;

        // Initialize Tiers (Genesis Configuration)
        // Common: 1000 Supply, 0.05 ETH, +1% Power
        tiers[TIER_COMMON] = TierInfo({
            price: 0.05 ether,
            maxSupply: 1000,
            mintedCount: 0,
            voteMultiplier: 1
        });

        // Rare: 500 Supply, 0.15 ETH, +3% Power
        tiers[TIER_RARE] = TierInfo({
            price: 0.15 ether,
            maxSupply: 500,
            mintedCount: 0,
            voteMultiplier: 3
        });

        // Legendary: 100 Supply, 0.50 ETH, +5% Power
        tiers[TIER_LEGENDARY] = TierInfo({
            price: 0.50 ether,
            maxSupply: 100,
            mintedCount: 0,
            voteMultiplier: 5
        });
    }

    /**
     * @notice Mint a new Land NFT
     * @param _tierId The tier to mint (1=Common, 2=Rare, 3=Legendary)
     */
    function mint(uint256 _tierId) external payable nonReentrant {
        TierInfo storage tier = tiers[_tierId];
        
        require(tier.maxSupply > 0, "Invalid Tier");
        require(tier.mintedCount < tier.maxSupply, "Sold Out");
        require(msg.value >= tier.price, "Insufficient Funds");

        // Mint ID starts from 1
        uint256 newItemId = totalSupply() + 1;
        
        tier.mintedCount++;
        tokenTier[newItemId] = _tierId;

        _safeMint(msg.sender, newItemId);
        emit LandMinted(msg.sender, newItemId, _tierId);
    }

    /**
     * @notice Calculates the highest multiplier a user owns.
     * Uses Enumerable to scan all tokens controlled by the user.
     */
    function getMultiplier(address _user) external view override returns (uint256) {
        uint256 balance = balanceOf(_user);
        if (balance == 0) return 0;

        uint256 highestBoost = 0;

        // Iterate through all tokens owned by user to find the best tier
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(_user, i);
            uint256 tierId = tokenTier[tokenId];
            uint256 boost = tiers[tierId].voteMultiplier;

            if (boost > highestBoost) {
                highestBoost = boost;
            }
        }

        return highestBoost;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(owner(), balance);
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
}
