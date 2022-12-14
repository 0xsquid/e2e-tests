import { ethers, Contract, BigNumber } from "ethers";
import { ChainName, RouteData, Squid } from "@0xsquid/sdk";
export const testWait = 200;
export const iterations = 80;

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

export async function waitForBalanceChange(
  iterations: number,
  testWait: number,
  toToken: string,
  dstProvider: ethers.providers.JsonRpcProvider,
  signer: ethers.Wallet,
  destPreBal: BigNumber
): Promise<BigNumber> {
  let destPostBal = BigNumber.from(0);
  for (let index = 0; index < iterations; index++) {
    await waiting(testWait);
    //get balance changes
    destPostBal = await getTokenBalance(toToken, dstProvider, signer.address);
    if (destPostBal.gt(destPreBal)) {
      break;
    }
  }
  return destPostBal;
}

export async function waiting(waitTime: number) {
  await new Promise((resolve) => setTimeout(resolve, waitTime));
}

export const runAndValidateParams = async (
  params: any,
  toToken: string,
  srcProvider: ethers.providers.JsonRpcProvider,
  dstProvider: ethers.providers.JsonRpcProvider,
  signer: ethers.Wallet,
  squidSdk: Squid
) => {
  //get before on src
  const srcTokenBalancePre = await getTokenBalance(
    params.fromToken,
    srcProvider,
    signer.address
  );
  //get before on dst
  const dstTokenBalancePre = await getTokenBalance(
    toToken,
    dstProvider,
    signer.address
  );

  // execute route
  let routeData;
  try {
    const { route } = await squidSdk.getRoute(params);
    routeData = route;
  } catch (error: any) {
    //expect(error.errors).toBeUndefined();
    //expect(error).toBeUndefined();
    console.log(error);
  }

  const tx = await squidSdk.executeRoute({
    signer,
    route: routeData as RouteData,
  });
  const txReceipt = await tx.wait(1);

  const srcTokenBalancePost = await getTokenBalance(
    params.fromToken,
    srcProvider,
    signer.address
  );
  let dstTokenBalancePost = await waitForBalanceChange(
    iterations,
    testWait,
    toToken,
    dstProvider,
    signer,
    dstTokenBalancePre
  );

  //expect(txReceipt.transactionHash).toContain("0x");
  //verify balance changes
  //expect(srcTokenBalancePost.lt(srcTokenBalancePre)).toBe(true);
  console.log(`before: ${srcTokenBalancePre}: after: ${srcTokenBalancePost}`);
  //expect(dstTokenBalancePost.gt(dstTokenBalancePre)).toBe(true);
};
