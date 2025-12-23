use alloy::sol;

sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed wallet, uint256 initialBalance);
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount,
        uint256 tax
    );
}
