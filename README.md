# Hardhat DeFi

Programmatically deposit collateral, and borrow and repay DAI on AAVE.

## Quickstart
```sh
git clone https://github.com/Trigii/hardhat-defi.git
cd hardhat-defi-fcc
yarn
```

## Usage

This repo requires a mainnet rpc provider, but don't worry! You won't need to spend any real money. We are going to be forking mainnet, and pretend as if we are interacting with mainnet contracts.

All you'll need, is to set a `MAINNET_RPC_URL` environment variable in a `.env` file that you create. You can get setup with one for free from [Alchemy](https://www.alchemy.com/)

Run:

```sh
yarn hardhat run scripts/aaveBorrow.js
```

## Running on a testnet or mainnet (TODO)

1. Setup environment variables:

You'll want to set your `GOERLI_RPC_URL` and `PRIVATE_KEY` as environment variables. You can add them to a `.env` file, similar to what you see in .env.example.

- `PRIVATE_KEY`: The private key of your account (like from metamask). NOTE: FOR DEVELOPMENT, PLEASE USE A KEY THAT DOESN'T HAVE ANY REAL FUNDS ASSOCIATED WITH IT.
You can learn how to export it here.

- `GOERLI_RPC_URL`: This is url of the goerli testnet node you're working with. You can get setup with one for free from Alchemy

2. Get testnet ETH:

Head over to [faucets.chain.link](https://faucets.chain.link) and get some tesnet ETH. You should see the ETH show up in your metamask.

3. Run:
```sh
yarn hardhat run scripts/aaveBorrow.js --network goerli
```
