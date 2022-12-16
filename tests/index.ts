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
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ level: "error" }),
    new winston.transports.File({
      filename: "./logs/combined.json",
      level: "debug",
    }),
    new winston.transports.File({
      filename: "./logs/info.json",
      level: "info",
    }),
    new winston.transports.File({
      filename: "./logs/error.json",
      level: "error",
    }),
  ],
});

const date = new Date();
let activeRoutes: RouteLog[] = [];

async function main() {
  logger.error(
    `-------------------- intentional line seperator for logs: ${date} ----------------------------`
  );
  logger.debug("######################################################");
  logger.debug("############# Running batch transactions #############");
  logger.debug(`## env: ${process.argv.slice(2)[0]}`);

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
    (chain) => chain.chainName == config.ethereum_chain_name //TODO handle local and testnet
  )!;
  const avalanche_chain = squidSdk.chains.find(
    (chain) => chain.chainName == ChainName.AVALANCHE
  )!;
  const moonbeam_chain = squidSdk.chains.find(
    (chain) => chain.chainName == ChainName.MOONBEAM
  )!;
  const polygon_chain = squidSdk.chains.find(
    (chain) => chain.chainName == ChainName.POLYGON
  )!;

  //set usdc trade amount
  const usdc_amount = ethers.utils
    .parseUnits(config.usdc_amount_in_ethers, 6)
    .toString();

  //set token trade amount
  const token_amount = ethers.utils
    .parseUnits(config.token_amount_in_ethers, 18)
    .toString();

  //get wallet for address
  const wallet = new ethers.Wallet(config.private_key);

  //array of routes
  let paramsArray: any[] = [];
  //Polygon
  /* paramsArray.push(
    {
      routeDescription: "bridgeCall: axlUSDC on polygon to WAVAX on Avalanche",
      toAddress: wallet.address,
      fromChain: polygon_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === polygon_chain.chainId
      )!.address as string, //usdc
      fromAmount: usdc_amount,
      toChain: avalanche_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "WAVAX" && t.chainId === avalanche_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
    {
      routeDescription: "callBridge: WMATIC on Polygon to USDC on Avalanche",
      toAddress: wallet.address,
      fromChain: polygon_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) => t.symbol === "WMATIC" && t.chainId === polygon_chain.chainId
      )!.address as string, //usdc
      fromAmount: token_amount,
      toChain: avalanche_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === avalanche_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    }
  ); */

  //Ethereum
  paramsArray.push({
    routeDescription: "USDC on Ethereum to WAVAX on Avalanch",
    toAddress: wallet.address,
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
  });

  //From Avalanche
  paramsArray.push({
    routeDescription: "USDC on Avalanche to WETH on Ethereum",
    toAddress: wallet.address,
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

  // more from Avalanche
  paramsArray.push({
    routeDescription: "Avalanche AVAX to MATIC on Polygon",
    toAddress: wallet.address,
    fromChain: avalanche_chain.chainId,
    fromToken: squidSdk.tokens.find(
      (t) => t.symbol === "AVAX" && t.chainId === avalanche_chain.chainId
    )!.address as string, //usdc
    fromAmount: token_amount,
    toChain: polygon_chain.chainId,
    toToken: squidSdk.tokens.find(
      (t) => t.symbol === "MATIC" && t.chainId === polygon_chain.chainId
    )!.address as string, //wavax
    slippage: config.slippage,
  });

  //From moonbeam
  paramsArray.push({
    routeDescription: "USDC on Moonbeam to WAVAX on Avalanche",
    toAddress: wallet.address,
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
      squidSdk,
      logger
    );
    if (activeRoute.txOk === true) activeRoutes.push(activeRoute);
  }

  //await waiting(config.waitTime);
  await waiting(config.waitTime * 3);
  let index = activeRoutes.length;
  while (index--) {
    //TODO add timeout
    logger.debug(`Number of active routes: ${activeRoutes.length}`);
    let routeLog = activeRoutes[index];
    const response = await squidSdk.getStatus({
      transactionId: routeLog.txReceiptId!,
    });
    logger.debug({
      txid: routeLog.txReceiptId!,
      status: response.status,
      description: routeLog.params.routeDescription,
    });
    if (response.status === "destination_executed") {
      await waiting(config.waitTime);
      activeRoutes[index] = await getPostAccountValues(
        routeLog.params,
        config,
        routeLog,
        squidSdk
      );
      routeLog.routeSwapsSuccess =
        routeLog.srcTokenBalancePre!.gt(routeLog.srcTokenBalancePost!) &&
        routeLog.dstTokenBalancePre!.lt(routeLog.dstTokenBalancePost!);

      routeLog.routeSwapsSuccess
        ? logger.info({ info: "## Route success", detail: routeLog })
        : logger.error({
            status: "## Route complete with dest swap failure",
            detail: routeLog,
          });
      activeRoutes.splice(index, 1);
    } else if (
      response.status === "error" ||
      response.status === "gas_unpaid" ||
      response.status === "gas_paid_not_enough_gas"
    ) {
      logger.error({
        status: "## Route failure",
        axlResponse: response.status,
        detail: routeLog,
      });
      activeRoutes.splice(index, 1);
    }
  }
  console.log("finished");
}
main();
