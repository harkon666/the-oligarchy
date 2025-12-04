// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockMantleETH is ERC20 {
    constructor() ERC20("Mantle Staked ETH (Mock)", "mETH") {
        // Mint 1 Juta mETH ke deployer saat deploy pertama kali
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /**
     * @notice Faucet function untuk testing.
     * Siapapun bisa panggil ini untuk dapat mETH gratis di Testnet/Local.
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
