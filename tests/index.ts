import { BigNumber, ethers } from "ethers";
import { ChainName, Squid } from "@0xsquid/sdk";
import { loadAsync } from "node-yaml-config";
import {
  RouteLog,
  getPreAccountValuesAndExecute,
  getPostAccountValues,
  waiting,
} from "./utils";
import winston from "winston";

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "./logs/combined.log" }),
    new winston.transports.File({
      filename: "./logs/error.log",
      level: "error",
    }),
  ],
});

let activeRoutes: RouteLog[] = [];

async function main() {
  logger.info("");
  logger.info("######################################################");
  logger.info("############# Running batch transactions #############");
  logger.info(`## env: ${process.argv.slice(2)[0]}`);

  const config = await loadAsync("./config.yml", process.argv.slice(2)[0]); //TODO pass env in as an argument
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
    (chain) => chain.chainName == ChainName.ETHEREUM //TODO handle local and testnet
  )!;
  const avalanche_chain = squidSdk.chains.find(
    (chain) => chain.chainName == ChainName.AVALANCHE
  )!;
  const moonbeam_chain = squidSdk.chains.find(
    (chain) => chain.chainName == ChainName.MOONBEAM
  )!;

  //set usdc trade amount
  const usdc_amount = ethers.utils
    .parseUnits(config.usdc_amount_in_ethers, 6)
    .toString();

  //rpc and signer
  let srcProvider = new ethers.providers.JsonRpcProvider(avalanche_chain.rpc);
  let dstProvider = new ethers.providers.JsonRpcProvider(ethereum_chain.rpc);
  let signer = new ethers.Wallet(config.private_key, srcProvider);
  //array of routes

  //Ethereum
  let paramsArray = [
    {
      routeDescription: "USDC on Ethereum to WAVAX on Avalanch",
      srcRPC: ethereum_chain.rpc,
      dstRPC: avalanche_chain.rpc,
      toAddress: signer.address,
      fromChain: ethereum_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.usdcSymbol && t.chainId === ethereum_chain.chainId
      )!.address as string, //usdc
      fromAmount: usdc_amount,
      toChain: avalanche_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "WAVAX" && t.chainId === avalanche_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
  ];

  //From Avalanche
  paramsArray.push({
    routeDescription: "USDC on Avalanche to WETH on Ethereum",
    srcRPC: avalanche_chain.rpc,
    dstRPC: ethereum_chain.rpc,
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
  });

  //From moonbeam
  paramsArray.push({
    routeDescription: "USDC on Moonbeam to WAVAX on Avalanche",
    srcRPC: moonbeam_chain.rpc,
    dstRPC: avalanche_chain.rpc,
    toAddress: signer.address,
    fromChain: moonbeam_chain.chainId,
    fromToken: squidSdk.tokens.find(
      (t) =>
        t.symbol === config.axlUsdcSymbol &&
        t.chainId === moonbeam_chain.chainId
    )!.address as string, //usdc
    fromAmount: usdc_amount,
    toChain: avalanche_chain.chainId,
    toToken: squidSdk.tokens.find(
      (t) => t.symbol === "WAVAX" && t.chainId === avalanche_chain.chainId
    )!.address as string, //wavax
    slippage: config.slippage,
  });

  //get pre tx account values and then execute route
  for await (const params of paramsArray) {
    const activeRoute = await getPreAccountValuesAndExecute(
      params,
      config,
      squidSdk
    );
    if (activeRoute.txOk === true) activeRoutes.push(activeRoute);
  }

  await waiting(config.waitTime);
  let index = activeRoutes.length;
  while (index--) {
    //TODO add timeout
    logger.info(`Number of active routes: ${activeRoutes.length}`);
    let routeLog = activeRoutes[index];
    const response = await squidSdk.getStatus({
      transactionId: routeLog.txReceiptId!,
    });
    logger.info({
      txid: routeLog.txReceiptId!,
      status: response.status,
      description: routeLog.params.routeDescription,
    });
    if (response.status === "destination_executed") {
      await waiting(config.waitTime);
      activeRoutes[index] = await getPostAccountValues(
        routeLog.params,
        config,
        routeLog
      );
      logger.info("## Route complete");
      routeLog.routeSwapsSuccess =
        routeLog.srcTokenBalancePre!.gt(routeLog.srcTokenBalancePost!) &&
        routeLog.dstTokenBalancePre!.lt(routeLog.dstTokenBalancePost!);

      routeLog.routeSwapsSuccess
        ? logger.info({ info: "## Route success" })
        : logger.error({ info: "## Route failure" });
      activeRoutes.splice(index, 1);
    } else if (
      response.status === "error" ||
      response.status === "gas_unpaid" ||
      response.status === "gas_paid_not_enough_gas"
    ) {
      logger.error(response.status);
      activeRoutes.splice(index, 1);
    }
  }
}
main();
