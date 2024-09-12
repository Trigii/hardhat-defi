const { getNamedAccounts, ethers } = require('hardhat');
const { getWeth, AMOUNT } = require('../scripts/getWeth');

async function main() {
    // the protocol treats everything as an ERC20 token
    await getWeth();
    const { deployer } = await getNamedAccounts();
    const signer = await ethers.getSigner(deployer); // get the signer so we can create the contract instance with the signer and be able to call the contract
    // Interacting with the AAVE protocol
    // they have a contract (lending pool address provider) that points to the correct contract (lending pool address)
    // We need -> ABI + address
    // Address: https://docs.aave.com/developers/v/2.0/deployed-contracts/deployed-contracts
    // Lending Pool Address Provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    // Lending Pool: ^
    // ABI: https://github.com/aave/protocol-v2/blob/1.0/contracts/interfaces/ILendingPoolAddressesProvider.sol
    const lendingPool = await getLendingPool(signer);
    console.log(`LendingPool address ${lendingPool.target}`);

    // deposit
    // deposit tokens into the aave protocol (collateral) -> similar to a bank, we will gain interest on our deposited tokens
    // the aave deposit function calls "safeTransferFrom" -> the aave contract is the one who takes the money out of our contract -> we need to aprove the aave contract so he can do it
    const wethTokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    // aprove
    // any time we want a contract to interact with our tokens, we have to aprove it
    await aproveErc20(wethTokenAddress, lendingPool.target, AMOUNT, signer); // let the lending pool access the weth of the contract
    // deposit
    console.log('Depositing...');
    await lendingPool.deposit(wethTokenAddress, AMOUNT, signer, 0); // we deposit the weth token into aave (collateral)
    console.log('Deposited!');

    // Borrow stablecoins (DAI)
    // we want to know how much we have borrow, how much we have in collateral, how much we can borrow
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, signer);

    // availableBorrowsETH ?? What the conversion rate on DAI is? (how much DAI can we borrow based on the ETH) -> we need to get the value of the DAI -> chainlink price feeds
    const daiPrice = await getDaiPrice();
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / Number(daiPrice)); // available borrow ETH / DAI/ETH price (we dont want to borrow the maximum, thats why we use 95%)
    console.log(`You can borrow ${amountDaiToBorrow} DAI`);
    const amountDaiToBorrowWei = ethers.parseEther(amountDaiToBorrow.toString()); // we need the value in WEI
    const daiTokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, signer);

    await getBorrowUserData(lendingPool, signer); // print again user data (amount of ETH deposited is higher because we are gaining interest by having the ETH deposited)

    // repay (get back all the DAI that we borrowed)
    await repay(daiTokenAddress, lendingPool, amountDaiToBorrowWei, signer);
    await getBorrowUserData(lendingPool, signer); // print again user data
    // we will still have a tiny amount of DAI borrowed because we have some interest. To repay that interest, we can go to uniswap and swap our ETH for DAI to repay the debt.
}

// gets the lending pool address from the lending pool address provider
async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        'ILendingPoolAddressesProvider', // abi
        '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5', // LendingPoolAddressesProvider contract address
        account, // connected to the signer
    );
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool(); // the interface has the function
    const lendingPool = await ethers.getContractAt('ILendingPool', lendingPoolAddress, account);
    return lendingPool;
}

async function aproveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    // erc20Address -> contract that contains the amount
    // spender address -> contract that we are going to give the aproval to spend the tokens
    // amountToSpend -> how much amount we let to spend
    // account -> where we do all the ops
    const erc20Token = await ethers.getContractAt('IERC20', erc20Address, account); // get the weth token
    const tx = await erc20Token.approve(spenderAddress, amountToSpend); // aprove the spender some amount
    await tx.wait(1);
    console.log('Approved!');
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account);
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`);
    return { availableBorrowsETH, totalDebtETH };
}

// Price Oracle: contract from aave
async function getDaiPrice() {
    // DAI / ETH Price feed address: 0x773616E4d11A78F511299002da57A0a94577F1f4 (https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1&search=dai)
    const daiEthPriceFeed = await ethers.getContractAt(
        'AggregatorV3Interface',
        '0x773616E4d11A78F511299002da57A0a94577F1f4',
    ); // we dont need to connect the deployer since we are not going to send any transactions
    const price = (await daiEthPriceFeed.latestRoundData())[1]; // extract the answer field
    console.log(`The DAI/ETH price is ${price.toString()}`);
    return price;
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 2, 0, account); // stable borrowing not enabled (1), so we use variable borrowing (2)
    await borrowTx.wait(1);
    console.log(`You've borrowed ${amountDaiToBorrowWei} DAI (in WEI)`);
}

async function repay(daiAddress, lendingPool, amount, account) {
    // we have to approve sending our DAI back to AAVE
    await aproveErc20(daiAddress, lendingPool.target, amount, account); // we let aave access our dai funds to get back the WETH
    const repayTx = await lendingPool.repay(daiAddress, amount, 2, account);
    await repayTx.wait(1);
    console.log(`Repaid ${amount} DAI`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });
