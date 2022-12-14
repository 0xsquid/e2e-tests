import { ethers } from "ethers";
import { ChainName, RouteData, Squid } from "@0xsquid/sdk";
import { loadAsync } from "node-yaml-config";
import { runAndValidateParams } from "./utils";
import winston from "winston";

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "./logs/combined.log" }),
  ],
});

async function main() {
  console.log(
    "#############\n This test does.. give a descriptive explantion here\n #############"
  );
  const config = await loadAsync("./config.yml", "local"); //TODO pass env in as an argument
  if (typeof config === undefined) {
    console.log("configure the config.yml file in the root of the repo");
  }

  //load squid
  const squidSdk = new Squid({
    baseUrl: config.api_url,
  });
  await squidSdk.init();

  //get chain data
  const ethereum_chain = squidSdk.chains.find(
    (chain) => chain.chainName == ChainName.ETHEREUM
  )!;
  const avalanche_chain = squidSdk.chains.find(
    (chain) => chain.chainName == ChainName.AVALANCHE
  )!;

  //set usdc trade amount
  const usdc_amount = ethers.utils
    .parseUnits(config.usdc_amount_in_ethers, 6)
    .toString();

  //const activeRoutes: string[] = [];

  //rpc and signer
  const srcProvider = new ethers.providers.JsonRpcProvider(avalanche_chain.rpc);
  const dstProvider = new ethers.providers.JsonRpcProvider(ethereum_chain.rpc);
  const signer = new ethers.Wallet(config.private_key, srcProvider);

  //"bridgeCall: usdc on Avalanche to WETH on Ethereum"
  const params = {
    toAddress: signer.address,
    fromChain: avalanche_chain.chainId,
    fromToken: squidSdk.tokens.find(
      (t) =>
        t.symbol === config.axlUsdcSymbol &&
        t.chainId === avalanche_chain.chainId
    )!.address as string, //usdc
    fromAmount: usdc_amount,
    toChain: ethereum_chain.chainId,
    toToken: squidSdk.tokens.find(
      (t) => t.symbol === "WETH" && t.chainId === ethereum_chain.chainId
    )!.address as string, //wavax
    slippage: config.slippage,
  };
  logger.info(params);

  await runAndValidateParams(
    params,
    params.toToken,
    srcProvider,
    dstProvider,
    signer,
    squidSdk
  );
}

main();
