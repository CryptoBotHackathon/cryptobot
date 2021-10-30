import { initClient } from "./init";
import { CandleGranularity, AccountAPI, OrderType, MarketOrder, OrderSide } from 'coinbase-pro-node';
const axios = require('axios').default;


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

/**
 * Custom logger
 * @param message The message as you'd pass into console.log
 * @param color One of the Fg* colors
 */
function log(message: string, color = "") {
  console.log(color, `${dayjs().format('YYYY-MM-DD HH:mm:ss')}: ${message}`, FgWhite)
}

/**
 * Check historical Data for Down/Upwards Trends
 * @param t 
 * @returns -1 | 0 | 1 (upwards trend, no trend, downwards trend)
 */
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

/**
 * Check historical Data for Down/Upwards Trends [increased granularity]
 * @param t 
 * @returns -1 | 0 | 1 (upwards trend, no trend, downwards trend)
 */
function conditionCheckHistorical2(t: any) {
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

/**
 * Minimal Profit Calculation
 * @param sumBuys The sum of all bought crypto
 * @param fee The fee you have to pay in percents
 * @param earnings Percentage of minmal earnings
 * @returns minimal acceptable Profit
 */
function minimalProfit(sumBuys: number, fee: number, earnings: number) {
  let multiplicationFactor = 1 + (2 * fee) + earnings;
  return sumBuys * multiplicationFactor;
}

/**
 * Get Value from Crypto price N Minutes ago
 * @param candles The data-values for the crypto price in a given timespan
 * @param endTime Time when we executed the request for candles
 * @returns Array of values
 */
function getTMinus(candles: any, endTime: any) {
  let tArray = []
  //let m2 = [1, 5, 10, 60, 120, 180] // original config
  let m = [1, 2, 3, 60, 120, 180]
  
  for (const candle of candles) {
    
    switch (dayjs(candle.openTimeInISO).format('YYYY-MM-DDTHH:mm')) {
      case dayjs(endTime).subtract(m[0], 'minutes').format('YYYY-MM-DDTHH:mm'):
        tArray[0] = candle.open;
        break;
      case dayjs(endTime).subtract(m[1], 'minutes').format('YYYY-MM-DDTHH:mm'):
        tArray[1] = candle.open;
        break;
      case dayjs(endTime).subtract(m[2], 'minutes').format('YYYY-MM-DDTHH:mm'):
        tArray[2] = candle.open;
        break;
      case dayjs(endTime).subtract(m[3], 'minutes').format('YYYY-MM-DDTHH:mm'):
        tArray[3] = candle.open;
        break;
      case dayjs(endTime).subtract(m[4], 'minutes').format('YYYY-MM-DDTHH:mm'):
        tArray[4] = candle.open;
        break;
      case dayjs(endTime).subtract(m[5], 'minutes').format('YYYY-MM-DDTHH:mm'):
        tArray[5] = candle.open;
        break;
    }
    
  }

  return tArray;
}

/**
 * Send Object to Api
 * @param resObj Response object of place_order method
 * @returns void
 */
function sendToApi(resObj: any) {
  axios.post(process.env.DASH_API_URL, resObj)
  .then((response: string) => {
    log(response, FgBlue);
  })
  .catch((error: string) => {
    log(error, FgRed);
  });
  return;
}

/**
 * Sum of all bought crypto
 * @param fills The orders from a given currency
 * @returns Total prize of bought crypto
 */
function sumAllBuys(fills: any) {
  let totalBuyPrize = 0;
  for (let i = 0; fills.data[i].side != "sell" && i < fills.data.length; i++){
    totalBuyPrize += Number(fills.data[i].usd_volume) + Number(fills.data[i].fee);
  }
  return totalBuyPrize;
}

/**
 * Sum of all sold crypto
 * @param fills The orders from a given currency
 * @returns Total prize of sold crypto
 */
function sumAllSells(fills: any) {
  let totalSellPrize = 0;
  for (let i = 0; fills.data[i].side != "buy" && i < fills.data.length; i++){
    totalSellPrize += Number(fills.data[i].usd_volume) + Number(fills.data[i].fee);
  }
  return totalSellPrize;
}

/**
 * How much (currency)
 * @param wallets All the wallets in the account
 * @param currency A currency such as USD, EUR, BTC, ETH
 * @returns Wallet with currencies' balance
 */
function howMuch(wallets: any, currency?: string) {

  let selWallet;

  for (const wallet of wallets) {
    if (wallet.currency == currency) {
      selWallet = wallet;
    }
  }
  return Number(selWallet.balance);
}

/**
 * Buys Crypto Currency
 * @param amount Amount of target currency to invest into crypto
 * @param currency The currency pair e.g. "BTC-USd"
 * @returns Placed order object
 */
async function buyCurrency(amount: number, currency?: string) {
  let marketOrder: MarketOrder = {funds: String(amount), side: OrderSide.BUY, product_id: currency?currency:"", type: OrderType.MARKET, }
  let placed_order = await client.rest.order.placeOrder(marketOrder)
  sendToApi(placed_order)
  return placed_order;
}

/**
 * Sell Crypto Currency
 * @param amount Amount of crypto to sell
 * @param holdingsValue value of the crypto you have in target currency
 * @param currency The currency pair e.g. "BTC-USd"
 * @returns Placed order object
 */
async function sellCurrency(amount: number, holdingsValue: number, currency?: string) {
  let marketOrder: MarketOrder = {size: String(amount), side: OrderSide.SELL, product_id: currency?currency:"", type: OrderType.MARKET}
  let placed_order = await client.rest.order.placeOrder(marketOrder)
  let modifiedObj:any = placed_order
  modifiedObj.funds = holdingsValue
  sendToApi(modifiedObj)
  return placed_order;
}

/**
 * Check if all the Env-Variables are filled out
 * @returns true | Error
 */
function areAllEnvFilled() {
  if (process.env.TARGET_CURRENCY != undefined
    && process.env.MINIMAL_DEPOT_FUNDS != undefined
    && process.env.DEPOT_PULL_PERCENTAGE != undefined) {
    return true;
  } else {
    throw new Error("Not all env variables defined. Define them in the .env file");
    }
}

/**
 * Get the current Crypto Price
 * @param currency 
 * @returns current price of crypto
 */
async function getCurrentCryptoPrice(currency: any) {
  let crypto_product = await client.rest.product.getProductTicker(currency)
  // @ts-ignore
  return crypto_product;
}

/**
 * Is the last sold fill's price bigger than the current price
 * @param fills The orders on a given currency
 * @param currentCryptoPrice The current price of a given crypto coin
 * @param fees The fees one has to pay when ordering 
 * @returns bool
 */
function isLastSellpriceBigger(fills: any, currentCryptoPrice: any, fees: any) {
  if (fills.data[0].side == "sell") {
    if (Number(currentCryptoPrice.price)*(1+2*fees) < Number(fills.data[0].price)) {
      return true
    }
  } else {
    return false
  }
}

/**
 * Main Function
 * @param cryptoCurrency USD, ETH, LINK
 * @returns void
 */
export async function main(cryptoCurrency: any): Promise<void> {
  const user_auth_test = await client.rest.user.verifyAuthentication();

  if (!user_auth_test && !areAllEnvFilled) {
    return;
  }
 
  let endTime = dayjs().format()
  let startTime = dayjs().subtract(3.1, 'hours').format()
  
  const candles = await client.rest.product.getCandles(`${cryptoCurrency}-${process.env.TARGET_CURRENCY}`, {
    end: endTime,
    granularity: CandleGranularity.ONE_MINUTE,
    start: startTime,
  });

  const fees = await client.rest.fee.getCurrentFees();
  const fills = await client.rest.fill.getFillsByProductId(`${cryptoCurrency}-${process.env.TARGET_CURRENCY}`)

  try {
    fills.data[0].side
  } catch (e) {
    log("No fills found for currency pair", FgRed);
    return
  }
  const wallets = await client.rest.account.listAccounts();

  let returnCandles = getTMinus(candles, endTime);

  let sumOfAllBuys_ = sumAllBuys(fills)
  
  let conditionHistorical = conditionCheckHistorical(returnCandles)
  let conditionHistorical2 = conditionCheckHistorical2(returnCandles)
  let minimalProfit_ = minimalProfit(sumOfAllBuys_, Number(fees.taker_fee_rate), 0.0)
  let currentCryptoPrice = await getCurrentCryptoPrice(`${cryptoCurrency}-${process.env.TARGET_CURRENCY}`)

  log(`Entering Loop ...`)
  switch (conditionHistorical2) {
    case 0:
      log("No Trend", FgYellow)
      break;
    case 1:
      // Sell Coin
      log(`Downwards Trend`, FgGreen)
      let amountCrypto = howMuch(wallets, cryptoCurrency)
      let currentValueCrypto = amountCrypto * Number(currentCryptoPrice.price)
      
      log(`Minimal Profit: ${minimalProfit_}`)
      log(`Current Price of Crypto Holdings: ${currentValueCrypto}`)

      log(`Minimal acceptable profit < amount of crypto * current price of crypto`)
      if (sumOfAllBuys_ > 0 && amountCrypto > 0 && minimalProfit_ < currentValueCrypto) {
        let sellAmount = amountCrypto
        let placed_order = await sellCurrency(sellAmount, currentValueCrypto, `${cryptoCurrency}-${process.env.TARGET_CURRENCY}`)
        log(`Condition 1 met, sold ${placed_order.size} ${cryptoCurrency} for ${currentValueCrypto} ${process.env.TARGET_CURRENCY}`)
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
        let placed_order = await buyCurrency(Number(buyAmount.toPrecision(3)), `${cryptoCurrency}-${process.env.TARGET_CURRENCY}`)
        console.log(placed_order)
        log(`Condition 1 met, bought ${placed_order.size} ${cryptoCurrency} for ${buyAmount} ${process.env.TARGET_CURRENCY}`)
      }
      break;
    default:
      break;
  }
  
}
