const path = require('path');


// optional
const ms = require('ms');
const dayjs = require('dayjs');
const Graceful = require('@ladjs/graceful');
const Cabin = require('cabin');

// required
const Bree = require('bree');

function typescript_worker() {
    const path = require('path')
    require('ts-node').register()
    const workerData = require('worker_threads').workerData
    require(path.resolve(__dirname, workerData.__filename))
}

const bree = new Bree({
    jobs: [

        {
            name: 'schedule',
            path: typescript_worker,
            interval: 'every 1 minute',
            worker: { workerData: { __filename: './jobs/schedule.ts' } }
        },
    ]
});
    
const graceful = new Graceful({ brees: [bree] });
graceful.listen();
bree.start()