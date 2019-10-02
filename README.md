# futarchy-template
Aragon DAO template for deploying a futarchy DAO instance

## Staging Deploy

run `npm run newFutarchyDAO:staging` to deploy to rinkeby

look for the `DeployDAO` event in the output to get the address of the newly deployed rinkeby DAO:

```
...
event: 'DeployDao',
    args: { dao: '<address_of_rinkeby_dao>' } },
...
```

go to `rinkeby.aragon.org/#/<address_of_rinkeby_dao>`

#### Things to watch out for...

The template deploys the latest versions of [Futarchy](https://github.com/levelkdev/futarchy-app) and [Oracle Manager](https://github.com/levelkdev/oracle-manager-app) published to the `open.aragonpm.eth` APM on rinkeby.

If the apps are not showing up in the DAO, the front-end code might not be propagated to aragon's IPFS node `ipfs.eth.aragon.network`. Propagate latest versions by adding to [aragon/deployments](https://github.com/aragon/deployments) via `scripts/save` and submitting a PR.

## Local Deploy

pull the [aragon/aragon](https://github.com/aragon/aragon) repo locally (the aragon front-end). Checkout latest release (currently [0.8.0-hotifx](https://github.com/aragon/aragon/releases/tag/0.8.0-hotifx)). Run `npm install`.

run `npm run compile`

run `npm run devchain:reset`

deploy `github.com/levelkdev/futarchy-app`:
  * `npm run deploy:lib_workaround:local`
  * `aragon apm publish major --files dist`


deploy `github.com/levelkdev/oracle-manager-app`:
  * `aragon apm publish major --files dist`

run `npm run deploy:local` to deploy the template to the local devchain

run `npm run newFutarchyDAO:local` to deploy a futarchy DAO to the local devchain

from the `aragon/aragon` repo, run `npm run start:local`
