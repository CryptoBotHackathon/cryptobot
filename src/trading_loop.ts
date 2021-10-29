import { initClient } from "./init";
import { CandleGranularity, AccountAPI, OrderType } from 'coinbase-pro-node';

var dayjs = require('dayjs');

function conditionCheckHistorical(t: any) {
  let out;
  if (t[2] > t[1] && t[1] > t[0] && t[2] > t[3] && t[3] > t[4] && t[4] > t[5]) {
    out = 1;
  } else if (t[2] < t[1] && t[1] < t[0] && t[2] < t[3] && t[3] < t[4] && t[4] < t[5]) {
    out = -1;
  } else {
    out = 0;
  }
  return out;
}

function minimalProfit(sumBuys: number, fee: number, earnings: number) {
  let multiplicationFactor = 1 + (2 * fee) + earnings;
  return sumBuys * multiplicationFactor;
}

function getTMinus(candles: any, endTime: any) {
  let t,
  tMinus5,
   tMinus10 ,
   tMinus60,
   tMinus120,
    tMinus180
  
  for (const candle of candles) {
    
    switch (dayjs(candle.openTimeInISO).format('YYYY-MM-DDTHH:mm')) {
      case dayjs(endTime).subtract(1, 'minutes').format('YYYY-MM-DDTHH:mm'):
        t = candle.open;
        break;
      case dayjs(endTime).subtract(5, 'minutes').format('YYYY-MM-DDTHH:mm'):
        tMinus5 = candle.open;
        break;
      case dayjs(endTime).subtract(10, 'minutes').format('YYYY-MM-DDTHH:mm'):
        tMinus10 = candle.open;
        break;
      case dayjs(endTime).subtract(60, 'minutes').format('YYYY-MM-DDTHH:mm'):
        tMinus60 = candle.open;
        break;
      case dayjs(endTime).subtract(120, 'minutes').format('YYYY-MM-DDTHH:mm'):
        tMinus120 = candle.open;
        break;
      case dayjs(endTime).subtract(180, 'minutes').format('YYYY-MM-DDTHH:mm'):
        tMinus180 = candle.open;
        break;
    }
    
  }

  return [t,tMinus5, tMinus10, tMinus60, tMinus120, tMinus180];
}

function sumAllBuys(fills_usd: any) {
  let totalBuyPrize = 0;
  for (let i = 0; fills_usd.data[i].side != "sell" && i < fills_usd.data.length; i++){
    totalBuyPrize += Number(fills_usd.data[i].usd_volume) + Number(fills_usd.data[i].fee);
  }
  return totalBuyPrize;
}


export async function main(): Promise<void> {
  const client = initClient();

  // const user_auth_test = await client.rest.user.verifyAuthentication();
  // const profiles = await client.rest.profile.listProfiles(true);
  // const wallets = await client.rest.account.listAccounts();
 
  // console.log(user_auth_test, profiles, wallets);
  let endTime = dayjs().format()
  let startTime = dayjs().subtract(3.1, 'hours').format()
  
  const fees = await client.rest.fee.getCurrentFees();
  const products = await client.rest.product.getProducts();
  const fills_usd = await client.rest.fill.getFillsByProductId('BTC-USD')
  
  const candles = await client.rest.product.getCandles('BTC-USD', {
    end: endTime,
    granularity: CandleGranularity.ONE_MINUTE,
    start: startTime,
  });

  let returnCandles = getTMinus(candles, endTime);
  let sumOfAllBuys_ = sumAllBuys(fills_usd)
  
  let conditionHistorical = conditionCheckHistorical(returnCandles)
  let minimalProfit_ = minimalProfit(sumOfAllBuys_, Number(fees.taker_fee_rate), 0.01)
  console.log(minimalProfit_)
  
}