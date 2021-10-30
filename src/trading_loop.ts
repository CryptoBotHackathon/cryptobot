import { initClient } from "./init";
import { CandleGranularity, AccountAPI, OrderType, MarketOrder, OrderSide } from 'coinbase-pro-node';

let dayjs = require('dayjs');
const client = initClient();

function conditionCheckHistorical(t: any) {
  /** 
   * @return 1: in Highg (sell)
   * @return -1: in Low (buy)
   * @return 0: do nothing (hold)
   */
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

async function buyCurrency(amount: number, currency?: string) {
  let marketOrder: MarketOrder = {funds: String(amount), side: OrderSide.BUY, product_id: currency?currency:"", type: OrderType.MARKET}
  let placed_order = await client.rest.order.placeOrder(marketOrder)
  return placed_order;
}

function areAllEnvFilled() {
  if (process.env.TARGET_CURRENCY != undefined
    && process.env.TARGET_CRYPTO != undefined
    && process.env.MINIMAL_DEPOT_FUNDS != undefined
    && process.env.DEPOT_PULL_PERCENTAGE != undefined) {
    return true;
  } else {
    throw new Error("Not all env variables defined. Define them in the .env file");
    }
}
  // const products = await client.rest.product.getProducts();
    // const products = await client.rest.product.getProducts();
    // if (products) {
    //   console.log(products)
    //   return
    // }
  // const profiles = await client.rest.profile.listProfiles(true);
  // const wallets = await client.rest.account.listAccounts();

export async function main(): Promise<void> {
  const user_auth_test = await client.rest.user.verifyAuthentication();

  if (!user_auth_test && !areAllEnvFilled) {
    return;
  }
 
  let endTime = dayjs().format()
  let startTime = dayjs().subtract(3.1, 'hours').format()
  
  const candles = await client.rest.product.getCandles('BTC-USD', {
    end: endTime,
    granularity: CandleGranularity.ONE_MINUTE,
    start: startTime,
  });

  const fees = await client.rest.fee.getCurrentFees();
  const fills_usd = await client.rest.fill.getFillsByProductId('BTC-USD')
  const wallets = await client.rest.account.listAccounts();

  let returnCandles = getTMinus(candles, endTime);
  let sumOfAllBuys_ = sumAllBuys(fills_usd)
  
  let conditionHistorical = -1 //conditionCheckHistorical(returnCandles)
  let minimalProfit_ = minimalProfit(sumOfAllBuys_, Number(fees.taker_fee_rate), 0.01)

  switch (conditionHistorical) {
    case 0:
      console.log("Not worth to buy/sell right now")
      break;
    case 1:
      // Sell Coin

      // was last trade a BUY
      if (fills_usd.data[0].side == "buy" ) {

      }
      
      break;
    case -1:
      // Buy Coin

      // how much USD to we have
      // - depotPullPercent: 
      // Amount of percentage of Total amount of coin in wallet to invest.Ideally should be beteween 5 - 20 %
      let amountMoney = howMuch(wallets, process.env.TARGET_CURRENCY);

      if (amountMoney > Number(process.env.MINIMAL_DEPOT_FUNDS)) {
        let buyAmount = amountMoney * Number(process.env.DEPOT_PULL_PERCENTAGE)
        let placed_order = await buyCurrency(Number(buyAmount.toPrecision(6)), `${process.env.TARGET_CRYPTO}-${process.env.TARGET_CURRENCY}`)
        console.log(placed_order)
        // if prior buy is higher OR no prior buy
      }
      break;
    default:
      break;
  }
  
}