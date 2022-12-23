import { ethers, Contract, BigNumber } from "ethers";
import { Squid } from "@0xsquid/sdk";
import winston from "winston";

export type RouteLog = {
  routeDescription?: string;
  txReceiptId?: string;
  params?: any;
  routeSwapsSuccess?: boolean;
  txOk?: boolean;
};

export async function waiting(waitTime: number) {
  await new Promise((resolve) => setTimeout(resolve, waitTime));
}

export const executeRoute = async (
  params: any,
  config: any,
  squidSdk: Squid,
  logger: winston.Logger
) => {
  const srcRPC = squidSdk.chains.find(
    (chain) => chain.chainId == params.fromChain
  )!.rpc;
  const srcProvider = new ethers.providers.JsonRpcProvider(srcRPC);
  const signer = new ethers.Wallet(config.private_key, srcProvider);

  srcProvider.getTransactionCount(signer.address).then((nonce) => {});

  try {
    const { route } = await squidSdk.getRoute(params);
    const tx = await squidSdk.executeRoute({
      signer,
      route,
      overrides: {
        maxPriorityFeePerGas: BigNumber.from(75000000000),
        maxFeePerGas: BigNumber.from(100000000000),
      },
    });
    const txReceipt = await tx.wait(6);
    console.log(txReceipt.blockNumber);

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
