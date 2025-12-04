// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract GameStore is Ownable, ReentrancyGuard {
    ERC20Burnable public immutable oligToken;

    struct Item {
        string name;
        uint256 price;
        bool isActive;
        bool isConsumable;
    }

    mapping(uint256 => Item) public items;
    mapping(address => mapping(uint256 => bool)) public hasPurchased;
    uint256 public totalItems;

    event ItemPurchased(
        address indexed buyer,
        uint256 indexed itemId,
        uint256 price
    );
    event ItemAdded(uint256 itemId, string name, uint256 price);

    constructor(address _oligToken) Ownable(msg.sender) {
        oligToken = ERC20Burnable(_oligToken);
    }

    function addItem(
        string memory _name,
        uint256 _price,
        bool _isConsumable
    ) external onlyOwner {
        totalItems++;
        items[totalItems] = Item(_name, _price, true, _isConsumable);
        emit ItemAdded(totalItems, _name, _price);
    }

    function buyItem(uint256 _itemId) external nonReentrant {
        Item memory item = items[_itemId];
        require(item.isActive, "Not active");

        if (!item.isConsumable) {
            require(!hasPurchased[msg.sender][_itemId], "Owned");
            hasPurchased[msg.sender][_itemId] = true;
        }

        // DEFLATION: Burn OLIG directly
        oligToken.burnFrom(msg.sender, item.price);

        emit ItemPurchased(msg.sender, _itemId, item.price);
    }
}
