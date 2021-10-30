import { main } from "../src/trading_loop"
import 'dotenv-defaults/config';

async function scheduler() {
    let cryptos = String(process.env.TARGET_CRYPTO).split(",")
    for (const currency of cryptos) {
        console.log(`Started loop for currency: ${currency}`)
        await main(currency).catch(console.log);
    }
}

scheduler()