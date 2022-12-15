import { ethers, Contract, BigNumber } from "ethers";
import { ChainName, RouteData, Squid } from "@0xsquid/sdk";
import winston from "winston";

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "./logs/combined.log" }),
  ],
});

export type RouteLog = {
  routeDescription?: string;
  srcRPC?: string;
  dstRPC?: string;
  txReceiptId?: string;
  srcTokenBalancePre?: BigNumber;
  srcTokenBalancePost?: BigNumber;
  dstTokenBalancePre?: BigNumber;
  dstTokenBalancePost?: BigNumber;
  params?: any;
  routeSwapsSuccess?: boolean;
  txOk?: boolean;
};

export async function getTokenBalance(
  tokenAddress: string,
  provider: ethers.providers.JsonRpcProvider,
  address: string
): Promise<BigNumber> {
  let balance: BigNumber;
  const erc20Abi = require("./abi/erc20.json");
  const tokenContract = new Contract(tokenAddress, erc20Abi, provider);
  if (tokenAddress === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
    balance = await provider.getBalance(address);
  } else {
    balance = await tokenContract.balanceOf(address);
  }
  return BigNumber.from(balance.toString());
}

export async function waiting(waitTime: number) {
  await new Promise((resolve) => setTimeout(resolve, waitTime));
}

export const getPreAccountValuesAndExecute = async (
  params: any,
  config: any,
  squidSdk: Squid
) => {
  const srcProvider = new ethers.providers.JsonRpcProvider(params.srcRPC);
  const dstProvider = new ethers.providers.JsonRpcProvider(params.dstRPC);
  const signer = new ethers.Wallet(config.private_key, srcProvider);
  //get before on src
  const srcTokenBalancePre = await getTokenBalance(
    params.fromToken,
    srcProvider,
    signer.address
  );
  //get before on dst
  const dstTokenBalancePre = await getTokenBalance(
    params.toToken,
    dstProvider,
    signer.address
  );

  const { route } = await squidSdk.getRoute(params);

  try {
    const tx = await squidSdk.executeRoute({
      signer,
      route,
    });
    const txReceipt = await tx.wait(1);

    const routeLog = {
      txReceiptId: txReceipt.transactionHash,
      srcTokenBalancePre,
      dstTokenBalancePre,
      params,
      txOk: true,
    };
    return routeLog as unknown as RouteLog;
  } catch (error) {
    logger.error(error);
    return { txOk: false };
  }
};

export const getPostAccountValues = async (
  params: any,
  config: any,
  routeLog: RouteLog
) => {
  const srcProvider = new ethers.providers.JsonRpcProvider(params.srcRPC);
  const dstProvider = new ethers.providers.JsonRpcProvider(params.dstRPC);
  const signer = new ethers.Wallet(config.private_key, srcProvider);
  routeLog.srcTokenBalancePost = await getTokenBalance(
    params.fromToken,
    srcProvider,
    signer.address
  );

  routeLog.dstTokenBalancePost = await getTokenBalance(
    params.toToken,
    dstProvider,
    signer.address
  );

  return routeLog;
};
