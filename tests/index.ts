import { BigNumber, ethers } from "ethers";
import { ChainName, Squid } from "@0xsquid/sdk";
import { loadAsync } from "node-yaml-config";
import { RouteLog, executeRoute, waiting } from "./utils";
import winston from "winston";

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ level: "info" }),
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
  const arbitrum_chain = squidSdk.chains.find(
    (chain) => chain.chainName == ChainName.ARBITRUM
  )!;
  const binance_chain = squidSdk.chains.find(
    (chain) => chain.chainName == ChainName.BINANCE
  )!;

  //get wallet for address
  const wallet = new ethers.Wallet(config.private_key);

  //use cases
  const polygonToPolygon = [
    {
      routeDescription: "bridgeCall: axlUSDC on polygon to MATIC on Polygon",
      toAddress: wallet.address,
      fromChain: polygon_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === polygon_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.5", 6).toString(),
      toChain: polygon_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "MATIC" && t.chainId === polygon_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
    {
      routeDescription: "callBridge: MATIC on polygon to axlUSDC on Polygon",
      toAddress: wallet.address,
      fromChain: polygon_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) => t.symbol === "MATIC" && t.chainId === polygon_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.5", 18).toString(),
      toChain: polygon_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === polygon_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
  ];

  const polygonToMoonbeam = [
    {
      routeDescription: "bridgeCall: axlUSDC on polygon to GMLR on Moonbeam",
      toAddress: wallet.address,
      fromChain: polygon_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === polygon_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.5", 6).toString(),
      toChain: moonbeam_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "GLMR" && t.chainId === moonbeam_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
    {
      routeDescription: "bridgeCall: axlUSDC on polygon to WGMLR on Moonbeam",
      toAddress: wallet.address,
      fromChain: polygon_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === polygon_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.5", 6).toString(),
      toChain: moonbeam_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "WGLMR" && t.chainId === moonbeam_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
  ];
  const polygonToArbitrum = [
    {
      routeDescription: "bridgeCall: axlUSDC on polygon to ETH on Arbitrum",
      toAddress: wallet.address,
      fromChain: polygon_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === polygon_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.5", 6).toString(),
      toChain: arbitrum_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "ETH" && t.chainId === arbitrum_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
    {
      routeDescription: "bridgeCall: axlUSDC on polygon to WETH on Arbitrum",
      toAddress: wallet.address,
      fromChain: polygon_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === polygon_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.5", 6).toString(),
      toChain: arbitrum_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "WETH" && t.chainId === arbitrum_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
  ];

  //use cases
  const polygonToAvalanche = [
    {
      routeDescription: "bridgeCall: axlUSDC on polygon to AVAX on Avalanche",
      toAddress: wallet.address,
      fromChain: polygon_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === polygon_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.5", 6).toString(),
      toChain: avalanche_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "AVAX" && t.chainId === avalanche_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
    {
      routeDescription: "bridgeCall: axlUSDC on polygon to WAVAX on Avalanche",
      toAddress: wallet.address,
      fromChain: polygon_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === polygon_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.5", 6).toString(),
      toChain: avalanche_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "WAVAX" && t.chainId === avalanche_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
  ];

  const avalancheToPolygon = [
    {
      routeDescription: "axlUSDC on Avalanche to MATIC on Polygon",
      toAddress: wallet.address,
      fromChain: avalanche_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === avalanche_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.1", 6).toString(),
      toChain: polygon_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "MATIC" && t.chainId === polygon_chain.chainId
      )!.address as string,
      slippage: config.slippage,
    },
  ];
  const avalancheToArbitrum = [
    {
      routeDescription: "axlUSDC on Avalanche to ETH on Arbitrum",
      toAddress: wallet.address,
      fromChain: avalanche_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === avalanche_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.1", 6).toString(),
      toChain: arbitrum_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "ETH" && t.chainId === arbitrum_chain.chainId
      )!.address as string,
      slippage: config.slippage,
    },
  ];
  const avalancheToMoonbeam = [
    {
      routeDescription: "axlUSDC on Avalanche to GLMR on Moonbeam",
      toAddress: wallet.address,
      fromChain: avalanche_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === avalanche_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.1", 6).toString(),
      toChain: moonbeam_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "GLMR" && t.chainId === moonbeam_chain.chainId
      )!.address as string,
      slippage: config.slippage,
    },
  ];

  const avalancheToBinance = [
    {
      routeDescription: "axlUSDC on Avalanche to BNB on Binance",
      toAddress: wallet.address,
      fromChain: avalanche_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === avalanche_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.1", 6).toString(),
      toChain: binance_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "BNB" && t.chainId === binance_chain.chainId
      )!.address as string,
      slippage: config.slippage,
    },
  ];

  const ethereumToPolygon = [
    {
      routeDescription: "USDC on Ethereum to MATIC on Polygon",
      toAddress: wallet.address,
      fromChain: ethereum_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.usdcSymbol && t.chainId === ethereum_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("70", 6).toString(),
      toChain: polygon_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) => t.symbol === "MATIC" && t.chainId === polygon_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
    {
      routeDescription: "ETH on Ethereum to axlUSDC on Polygon",
      toAddress: wallet.address,
      fromChain: ethereum_chain.chainId,
      fromToken: squidSdk.tokens.find(
        (t) => t.symbol === "ETH" && t.chainId === ethereum_chain.chainId
      )!.address as string, //usdc
      fromAmount: ethers.utils.parseUnits("0.005", 18).toString(),
      toChain: polygon_chain.chainId,
      toToken: squidSdk.tokens.find(
        (t) =>
          t.symbol === config.axlUsdcSymbol &&
          t.chainId === polygon_chain.chainId
      )!.address as string, //wavax
      slippage: config.slippage,
    },
  ];

  //array of routes
  let paramsArray: any[] = [];
  const sourceChainUseCases = process.argv.slice(2)[1];
  typeof sourceChainUseCases === undefined &&
    console.log(
      "pass in source chain.. eg: yarn run mainnet polygon or all for everything"
    );
  switch (sourceChainUseCases) {
    case "polygon-avalanche":
      paramsArray.push(...polygonToAvalanche);
      break;
    case "avalanche-polygon":
      paramsArray.push(...avalancheToPolygon);
      break;
    case "ethereum-polygon":
      paramsArray.push(...ethereumToPolygon);
      break;
    case "polygon-polygon":
      paramsArray.push(...polygonToPolygon);
      paramsArray.push(...polygonToPolygon);
      break;
    case "polygon-moonbeam":
      paramsArray.push(...polygonToMoonbeam);
      paramsArray.push(...polygonToMoonbeam);
      break;

    case "avalanche-polygon":
      paramsArray.push(...avalancheToPolygon);
      break;
    case "avalanche-moonbeam":
      paramsArray.push(...avalancheToMoonbeam);
      break;
    case "avalanche-arbitrum":
      paramsArray.push(...avalancheToArbitrum);
      break;
    case "avalanche-binance":
      paramsArray.push(...avalancheToBinance);
      break;
    case "avalanche-all":
      paramsArray.push(...avalancheToMoonbeam);
      paramsArray.push(...avalancheToArbitrum);
      paramsArray.push(...avalancheToPolygon);
      paramsArray.push(...avalancheToBinance);
      break;
    case "polygon-arbitrum":
      paramsArray.push(...polygonToArbitrum);
      paramsArray.push(...polygonToArbitrum);
    default:
      paramsArray.push(...polygonToAvalanche);
      paramsArray.push(...polygonToMoonbeam);
      paramsArray.push(...polygonToArbitrum);
      paramsArray.push(...polygonToPolygon);
      break;
  }

  //get pre tx account values and then execute route
  for await (const params of paramsArray) {
    logger.info(`Running for: ${params.routeDescription}`);
    const activeRoute = await executeRoute(params, config, squidSdk, logger);
    if (activeRoute.txOk === true) {
      activeRoutes.push(activeRoute);
      logger.info(`Successful source tx for: ${params.routeDescription}`);
    }
  }

  await waiting(5000);
  let index = activeRoutes.length;
  while (index--) {
    //TODO add timeout
    waiting(1000);
    logger.debug(`Number of active routes: ${activeRoutes.length}`);
    let routeLog = activeRoutes[index];

    let response;
    try {
      response = await squidSdk.getStatus({
        transactionId: routeLog.txReceiptId!,
      });
    } catch (error: any) {
      logger.debug(
        `${error.errorType} for ${routeLog.txReceiptId} - probably not indexed by axelar yet`
      );
      if (index === 0 && activeRoutes.length > 0) {
        index = activeRoutes.length;
      }
      continue;
    }

    logger.debug({
      txid: routeLog.txReceiptId!,
      status: response.status,
      description: routeLog.params.routeDescription,
    });
    if (response.status === "destination_executed") {
      if (
        typeof response.toChain!.callEventStatus != undefined &&
        response.toChain!.callEventStatus === "CrossMulticallExecuted"
      ) {
        logger.info({
          info: "## Route finished - successful swap/send on destination chain",
          detail: routeLog,
          axlResponse: response.status,
        });
      } else {
        logger.info({
          info: "## Route finished - but something went wrong",
          detail: routeLog,
          axlResponse: response.status,
        });
      }
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
    if (index === 0 && activeRoutes.length > 0) {
      index = activeRoutes.length;
    }
  }
  logger.info("########### - finished");
}
main();
