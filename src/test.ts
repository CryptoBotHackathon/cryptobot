import { initClient } from "./init";
const axios = require('axios');

const client = initClient();

function howMuch(wallets: any, currency?: string) {
  /*
  currencies: USD, BTC, EUR
  */
  let wallet_btc;

  for (const wallet of wallets) {
    if (wallet.currency == currency) {
      wallet_btc = wallet;
    }
  }
  return Number(wallet_btc.balance);
}

async function main() {
    const user_auth_test = await client.rest.user.verifyAuthentication();

    if (!user_auth_test) {
        console.log("user not authorized")
    }
    const profiles = await client.rest.profile.listProfiles(true);
    const wallets = await client.rest.account.listAccounts();
    let amountCrypto = howMuch(wallets, process.env.TARGET_CRYPTO)
    console.log(amountCrypto)

}

main()