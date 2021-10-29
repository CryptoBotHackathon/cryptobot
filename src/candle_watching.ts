import { initClient } from "./init";
import { CandleGranularity, AccountAPI } from 'coinbase-pro-node';

var dayjs = require('dayjs');

// Profile = Portfolio
// 

async function main(): Promise<void> {
  const client = initClient();

  const user_auth_test = await client.rest.user.verifyAuthentication();
  const profiles = await client.rest.profile.listProfiles(true);
  const wallets = await client.rest.account.listAccounts();
 
  console.log(user_auth_test, profiles, wallets);

  const candles = await client.rest.product.getCandles('BTC-USD', {
    end: dayjs().format(),
    granularity: CandleGranularity.FIVE_MINUTES,
    start: dayjs().subtract(3, 'hour').format(),
  });

  console.info(`Received "${candles.length}" candles to represent 3 hours (08 - 11 AM).`, candles);
}

main().catch(console.error);
