# e2e-tests

## End to end automated tests for local, testnet and mainnet

- run `yarn install`
- copy config.yml.example to config.yml
- update config.yml with private key
- to run `yarn run <local> | <testnet> | <mainnet> : <ethereum-polygon> | <polygon-avalanche>`
- eg `yarn run mainnet ethereum-polygon`
- log are output to the /logs directory. errors are in error.log

- add use cases (routes) to the paramsArray object in /tests/index.ts
