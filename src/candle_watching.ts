import { initClient } from "./init";
import {CandleGranularity} from 'coinbase-pro-node';

async function main(): Promise<void> {
  const client = initClient();

  const candles = await client.rest.product.getCandles('BTC-USD', {
    end: '2020-04-11T10:00:00.000Z',
    granularity: CandleGranularity.ONE_HOUR,
    start: '2020-04-11T08:00:00.000Z',
  });

  console.info(`Received "${candles.length}" candles to represent 3 hours (08 - 11 AM).`, candles);
}

main().catch(console.error);
