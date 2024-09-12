// script that deposits our token for Weth token (you deposit ETH and in return it will give you the WETH token)
// WETH: way of tokenize our ETH or Layer 1 blockchain native token

const { getNamedAccounts, ethers } = require('hardhat');

const AMOUNT = ethers.parseEther('0.02');

async function getWeth() {
    const { deployer } = await getNamedAccounts(); // to interact with the contract we need an account
    const signer = await ethers.getSigner(deployer); // get the signer so we can create the contract instance with the signer and be able to call the contract
    // call the "deposit" function on the weth contract (to interact with a contract we need an abi + contract address)
    // contract address = Weth mainnet = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 (https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2)
    const iWeth = await ethers.getContractAt(
        'IWeth', // ABI of "IWeth"
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // at this address (we hardcode it because we are forking the mainnet so we know the address)
        signer, // connected to the deployer
    );
    const tx = await iWeth.deposit({ value: AMOUNT }); // deposit ETH amount
    tx.wait(1); // wait for the transaction to be mined
    const wethBalance = await iWeth.balanceOf(deployer); // get the weth balance from the account that has been exchanged
    console.log(`Got ${wethBalance.toString()} WETH`);
}

module.exports = { getWeth, AMOUNT };
