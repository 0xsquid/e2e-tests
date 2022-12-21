import { ethers, Contract, BigNumber } from "ethers";
import { Squid } from "@0xsquid/sdk";
import winston from "winston";

export type RouteLog = {
  routeDescription?: string;
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
  squidSdk: Squid,
  logger: winston.Logger
) => {
  const srcRPC = squidSdk.chains.find(
    (chain) => chain.chainId == params.fromChain
  )!.rpc;
  const dstRPC = squidSdk.chains.find(
    (chain) => chain.chainId == params.toChain
  )!.rpc;

  const srcProvider = new ethers.providers.JsonRpcProvider(srcRPC);

  const signer = new ethers.Wallet(config.private_key, srcProvider);

  try {
    const { route } = await squidSdk.getRoute(params);
    const tx = await squidSdk.executeRoute({
      signer,
      route,
    });
    const txReceipt = await tx.wait(1);

    const routeLog = {
      txReceiptId: txReceipt.transactionHash,
      params,
      txOk: true,
    };
    return routeLog as unknown as RouteLog;
  } catch (error) {
    logger.error({
      msg: "failure for tx on source chain",
      error: error,
      params: params,
    });
    return { txOk: false };
  }
};

export const getPostAccountValues = async (
  params: any,
  config: any,
  routeLog: RouteLog,
  squidSdk: Squid
) => {
  return routeLog;
};
