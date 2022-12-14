[
    {route: "blah",
    params : {
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
    }
    
]