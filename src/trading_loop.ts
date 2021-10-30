import { initClient } from "./init";
import { CandleGranularity, AccountAPI, OrderType, MarketOrder, OrderSide } from 'coinbase-pro-node';

let dayjs = require('dayjs');
const client = initClient();

let FgBlack = `\x1b[30m`
let FgRed = `\x1b[31m`
let FgGreen = `\x1b[32m`
let FgYellow = `\x1b[33m`
let FgBlue = `\x1b[34m`
let FgMagenta = `\x1b[35m`
let FgCyan = `\x1b[36m`
let FgWhite = `\x1b[37m`

function log(message: string, color = "") {
  console.log(color, `${dayjs().format('YYYY-MM-DD HH:mm:ss')}: ${message}`)
}

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

function conditionCheckHistorical2(t: any) {
  /** 
   * @return 1: in High (sell)
   * @return -1: in Low (buy)
   * @return 0: do nothing (hold)
   */
  let out;
  if (t[2] < t[1] && t[1] > t[0] ) {

    out = 1;
  } else if (t[2] < t[1] && t[1] < t[0]) {
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

function sumAllBuys(fills: any) {
  let totalBuyPrize = 0;
  for (let i = 0; fills.data[i].side != "sell" && i < fills.data.length; i++){
    totalBuyPrize += Number(fills.data[i].usd_volume) + Number(fills.data[i].fee);
  }
  return totalBuyPrize;
}

function sumAllSells(fills: any) {
  let totalBuyPrize = 0;
  for (let i = 0; fills.data[i].side != "buy" && i < fills.data.length; i++){
    totalBuyPrize += Number(fills.data[i].usd_volume) + Number(fills.data[i].fee);
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

async function sellCurrency(amount: number, currency?: string) {
  let marketOrder: MarketOrder = {size: String(amount), side: OrderSide.SELL, product_id: currency?currency:"", type: OrderType.MARKET}
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

async function getCurrentCryptoPrice(currency: any) {
  let crypto_product = await client.rest.product.getProductTicker(currency)
  // @ts-ignore
  return crypto_product;
}

function isLastSellpriceBigger(fills: any, currentCryptoPrice: any, fees: any) {
  if (fills.data[0].side == "sell") {
    if (Number(currentCryptoPrice.price)*(1+2*fees) < Number(fills.data[0].price)) {
      return true
    }
  } else {
    return false
  }
}
  // const products = await client.rest.product.getProducts();
    // const products = await client.rest.product.getProducts();
    // if (products) {
    //   log(products)
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
  
  const candles = await client.rest.product.getCandles(`${process.env.TARGET_CRYPTO}-${process.env.TARGET_CURRENCY}`, {
    end: endTime,
    granularity: CandleGranularity.ONE_MINUTE,
    start: startTime,
  });

  const fees = await client.rest.fee.getCurrentFees();
  const fills = await client.rest.fill.getFillsByProductId(`${process.env.TARGET_CRYPTO}-${process.env.TARGET_CURRENCY}`)
  const wallets = await client.rest.account.listAccounts();

  let returnCandles = getTMinus(candles, endTime);
  let sumOfAllBuys_ = sumAllBuys(fills)
  
  let conditionHistorical = conditionCheckHistorical(returnCandles)
  let conditionHistorical2 = conditionCheckHistorical2(returnCandles)
  let minimalProfit_ = minimalProfit(sumOfAllBuys_, Number(fees.taker_fee_rate), 0.00)
  let currentCryptoPrice = await getCurrentCryptoPrice(`${process.env.TARGET_CRYPTO}-${process.env.TARGET_CURRENCY}`)

  log(`Entering Loop ...`)
  switch (conditionHistorical2) {
    case 0:
      log("No Trend", FgYellow)
      break;
    case 1:
      // Sell Coin
      log(`Downwards Trend`, FgGreen)
      let amountCrypto = howMuch(wallets, process.env.TARGET_CRYPTO)
      let currentValueCrypto = amountCrypto * Number(currentCryptoPrice.price)
      
      log(`Minimal Profit: ${minimalProfit_}`)
      log(`Current Price of Crypto Holdings: ${amountCrypto * Number(currentCryptoPrice.price)}`)

      log(`Minimal acceptable profit < amount of crypto * current price of crypto`)
      if (sumOfAllBuys_ > 0 && amountCrypto > 0 && minimalProfit_ < currentValueCrypto) {
        let sellAmount = amountCrypto
        let placed_order = await sellCurrency(sellAmount, `${process.env.TARGET_CRYPTO}-${process.env.TARGET_CURRENCY}`)
        log(`Condition 1 met, sold ${placed_order.size} ${process.env.TARGET_CRYPTO} for ${sellAmount} ${process.env.TARGET_CURRENCY}`)
      }
      
      break;
    case -1:
      // Buy Coin
      log(`Upwards Trend`, FgBlue)
      // how much USD to we have
      // - depotPullPercent: 
      // Amount of percentage of Total amount of coin in wallet to invest.Ideally should be beteween 5 - 20 %
      let amountMoney = howMuch(wallets, process.env.TARGET_CURRENCY);

      log(`Checking if price of last sell is bigger than current holding price`)
      if (amountMoney > Number(process.env.MINIMAL_DEPOT_FUNDS) && isLastSellpriceBigger(fills, currentCryptoPrice, Number(fees.taker_fee_rate))) {
        let buyAmount = amountMoney * Number(process.env.DEPOT_PULL_PERCENTAGE)
        let placed_order = await buyCurrency(Number(buyAmount.toPrecision(6)), `${process.env.TARGET_CRYPTO}-${process.env.TARGET_CURRENCY}`)
        log(`Condition 1 met, bought ${placed_order.size} ${process.env.TARGET_CRYPTO} for ${buyAmount} ${process.env.TARGET_CURRENCY}`)
      }
      break;
    default:
      break;
  }
  
}