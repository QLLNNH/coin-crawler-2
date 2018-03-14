'use strict';
const Events = require('events');
const log = require('./log');
const request = require('./request');

module.exports = class Zb extends Events {

    constructor() {
        super();
        this.size = 30;
        this.init();
    }

    async init() {
        try {
            await this.load_symbols();
            await this.load_symbols_kline();
        }
        catch (err) {
            this.init();
        }
    }

    async load_symbols() {
        const symbols = new Set();
        const markets = await request.send({ host: 'api.zb.com', path: '/data/v1/markets' });
        Object.keys(markets).forEach((market) => symbols.add(market.split('_')[0]));
        this.symbols = [...symbols].sort((a, b) => {
            if (a > b) return 1;
            else return - 1;
        });
    }

    async fetch_qc_in_qc() {
        return new Array(this.size).fill(1);
    }

    async fetch_btc_in_qc() {
        const ret = await request.send({
            host: 'api.zb.com'
            , path: '/data/v1/kline'
            , qs: {
                type: '5min'
                , size: this.size
                , market: 'btc_qc'
            }
        });

        return ret.data.map((datum) => datum[4]);
    }

    async fetch_usdt_in_qc() {
        const ret = await request.send({
            host: 'api.zb.com'
            , path: '/data/v1/kline'
            , qs: {
                type: '5min'
                , size: this.size
                , market: 'usdt_qc'
            }
        });

        return ret.data.map((datum) => datum[4]);
    }

    async load_symbols_kline() {
        const qc_qc = await this.fetch_qc_in_qc();
        const btc_qc = await this.fetch_btc_in_qc();
        const usdt_qc = await this.fetch_usdt_in_qc();

        for (let symbol of this.symbols) {
            try {
                const statistics_05 = new Array(5);
                const statistics_10 = new Array(5);
                const statistics_15 = new Array(5);
                const statistics_30 = new Array(5);

                for (let task of this.yield_opt(symbol)) {

                    let total_05 = 0;
                    let total_10 = 0;
                    let total_15 = 0;
                    let total_30 = 0;

                    // 获取该交易对在该平台的价格
                    const kline_result = await request.send(task);

                    // 如果有返回结果
                    if (kline_result.symbol === symbol) {

                        let multipl;
                        if (kline_result.moneyType.toLowerCase() === 'btc') multipl = btc_qc;
                        else if (kline_result.moneyType.toLowerCase() === 'usdt') multipl = usdt_qc;
                        else multipl = qc_qc;

                        kline_result.data.forEach((datum, index) => {
                            if (index == 5) total_05 += datum[4] * datum[5] * multipl[index];
                            if (index >= 4) total_10 += datum[4] * datum[5] * multipl[index];
                            if (index >= 3) total_15 += datum[4] * datum[5] * multipl[index];
                            total_30 += datum[4] * datum[5] * multipl[index];
                        });
                    }

                    let index;
                    if (task.qs.market.split('_')[1] === 'btc') index = 2;
                    else if (task.qs.market.split('_')[1] === 'usdt') index = 3;
                    else index = 1;

                    statistics_05[index] = Number((total_05 / 10000).toFixed(1));
                    statistics_10[index] = Number((total_10 / 10000).toFixed(1));
                    statistics_15[index] = Number((total_15 / 10000).toFixed(1));
                    statistics_30[index] = Number((total_30 / 10000).toFixed(1));
                }

                {
                    statistics_05[0] = symbol;
                    statistics_10[0] = symbol;
                    statistics_15[0] = symbol;
                    statistics_30[0] = symbol;

                    statistics_05[4] = Number((statistics_05[1] + statistics_05[2] + statistics_05[3]).toFixed(1));
                    statistics_10[4] = Number((statistics_10[1] + statistics_10[2] + statistics_10[3]).toFixed(1));
                    statistics_15[4] = Number((statistics_15[1] + statistics_15[2] + statistics_15[3]).toFixed(1));
                    statistics_30[4] = Number((statistics_30[1] + statistics_30[2] + statistics_30[3]).toFixed(1));
                }

                console.log(statistics_05.join(', '));
                console.log(statistics_10.join(', '));
                console.log(statistics_15.join(', '));
                console.log(statistics_30.join(', '));

                this.emit('zb_kline', {
                    symbol: symbol
                    , '05': statistics_05
                    , '10': statistics_10
                    , '15': statistics_15
                    , '30': statistics_30
                });
            }
            catch (err) {
                log.info({ lv: 'ERROR', message: err.message, desc: symbol });
            }
        }

        setTimeout(this.load_symbols_kline, 0);
    }

    yield_opt(symbol) {
        return ['qc', 'btc', 'usdt'].map((platform) => {
            return {
                host: 'api.zb.com'
                , path: '/data/v1/kline'
                , qs: {
                    type: '5min'
                    , size: this.size
                    , market: `${symbol}_${platform}`
                }
            }
        });
    }
}

// exports.symbols_to_kline = async (symbols, interval) => {
//     const size = Math.floor(interval / 5);
//     const fail_symbols = [];
//     const symbols_kline_5 = [];
//     const symbols_kline_10 = [];
//     const symbols_kline_15 = [];
//     const symbols_kline_30 = [];
//
//     const qc_qc = await fetch_qc_in_qc(size);
//     const btc_qc = await fetch_btc_in_qc(size);
//     const usdt_qc = await fetch_usdt_in_qc(size);
//
//     // 循环处理交易对
//     for (let symbol of symbols) {
//         try {
//             const statistics_05 = new Array(5);
//             const statistics_10 = new Array(5);
//             const statistics_15 = new Array(5);
//             const statistics_30 = new Array(5);
//
//             statistics_05[0] = symbol;
//             statistics_10[0] = symbol;
//             statistics_15[0] = symbol;
//             statistics_30[0] = symbol;
//
//             // 循环处理该交易对在不同平台的价格
//             for (let task of yield_opt(symbol, size)) {
//
//                 let total_05 = 0;
//                 let total_10 = 0;
//                 let total_15 = 0;
//                 let total_30 = 0;
//
//                 // 获取该交易对在该平台的价格
//                 const kline_result = await request.send(task);
//
//                 // 如果有返回结果
//                 if (kline_result.symbol === symbol) {
//                     let multipl;
//
//                     if (kline_result.moneyType.toLowerCase() === 'btc') multipl = btc_qc;
//                     else if (kline_result.moneyType.toLowerCase() === 'usdt') multipl = usdt_qc;
//                     else multipl = qc_qc;
//
//                     kline_result.data.forEach((datum, index) => {
//                         if (index === 5) total_05 += datum[4] * datum[5] * multipl[index];
//                         if (index >= 4) total_10 += datum[4] * datum[5] * multipl[index];
//                         if (index >= 3) total_15 += datum[4] * datum[5] * multipl[index];
//                         total_30 += datum[4] * datum[5] * multipl[index];
//                     });
//                 }
//
//                 let index;
//                 if (task.qs.market.split('_')[1] === 'btc') index = 2;
//                 else if (task.qs.market.split('_')[1] === 'usdt') index = 3;
//                 else index = 1;
//
//                 statistics_05[index] = Number((total_05 / 10000).toFixed(1));
//                 statistics_10[index] = Number((total_10 / 10000).toFixed(1));
//                 statistics_15[index] = Number((total_15 / 10000).toFixed(1));
//                 statistics_30[index] = Number((total_30 / 10000).toFixed(1));
//             }
//
//             statistics_05[4] = Number((statistics_05[1] + statistics_05[2] + statistics_05[3]).toFixed(1));
//             statistics_10[4] = Number((statistics_10[1] + statistics_10[2] + statistics_10[3]).toFixed(1));
//             statistics_15[4] = Number((statistics_15[1] + statistics_15[2] + statistics_15[3]).toFixed(1));
//             statistics_30[4] = Number((statistics_30[1] + statistics_30[2] + statistics_30[3]).toFixed(1));
//
//             symbols_kline_5.push(statistics_05);
//             symbols_kline_10.push(statistics_10);
//             symbols_kline_15.push(statistics_15);
//             symbols_kline_30.push(statistics_30);
//
//             log.info(statistics_05.join(', '));
//             log.info(statistics_10.join(', '));
//             log.info(statistics_15.join(', '));
//             log.info(statistics_30.join(', '));
//         }
//         catch (err) {
//             fail_symbols.push(symbol);
//             log.info({ lv: 'ERROR', message: err.message, desc: symbol });
//         }
//     }
//
//     // 循环处理失败交易对
//     for (let symbol of fail_symbols) {
//         try {
//             const statistics_05 = new Array(5);
//             const statistics_10 = new Array(5);
//             const statistics_15 = new Array(5);
//             const statistics_30 = new Array(5);
//
//             statistics_05[0] = symbol;
//             statistics_10[0] = symbol;
//             statistics_15[0] = symbol;
//             statistics_30[0] = symbol;
//
//             // 循环处理该交易对在不同平台的价格
//             for (let task of yield_opt(symbol, size)) {
//
//                 let total_05 = 0;
//                 let total_10 = 0;
//                 let total_15 = 0;
//                 let total_30 = 0;
//
//                 // 获取该交易对在该平台的价格
//                 const kline_result = await request.send(task);
//
//                 // 如果有返回结果
//                 if (kline_result.symbol === symbol) {
//                     let multipl;
//
//                     if (kline_result.moneyType.toLowerCase() === 'btc') multipl = btc_qc;
//                     else if (kline_result.moneyType.toLowerCase() === 'usdt') multipl = usdt_qc;
//                     else multipl = qc_qc;
//
//                     kline_result.data.forEach((datum, index) => {
//                         if (index === 5) total_05 += datum[4] * datum[5] * multipl[index];
//                         if (index >= 4) total_10 += datum[4] * datum[5] * multipl[index];
//                         if (index >= 3) total_15 += datum[4] * datum[5] * multipl[index];
//                         total_30 += datum[4] * datum[5] * multipl[index];
//                     });
//                 }
//
//                 let index;
//                 if (task.qs.market.split('_')[1] === 'btc') index = 2;
//                 else if (task.qs.market.split('_')[1] === 'usdt') index = 3;
//                 else index = 1;
//
//                 statistics_05[index] = Number((total_05 / 10000).toFixed(1));
//                 statistics_10[index] = Number((total_10 / 10000).toFixed(1));
//                 statistics_15[index] = Number((total_15 / 10000).toFixed(1));
//                 statistics_30[index] = Number((total_30 / 10000).toFixed(1));
//             }
//
//             statistics_05[4] = Number((statistics_05[1] + statistics_05[2] + statistics_05[3]).toFixed(1));
//             statistics_10[4] = Number((statistics_10[1] + statistics_10[2] + statistics_10[3]).toFixed(1));
//             statistics_15[4] = Number((statistics_15[1] + statistics_15[2] + statistics_15[3]).toFixed(1));
//             statistics_30[4] = Number((statistics_30[1] + statistics_30[2] + statistics_30[3]).toFixed(1));
//
//             symbols_kline_5.push(statistics_05);
//             symbols_kline_10.push(statistics_10);
//             symbols_kline_15.push(statistics_15);
//             symbols_kline_30.push(statistics_30);
//
//             log.info(statistics_05.join(', '));
//             log.info(statistics_10.join(', '));
//             log.info(statistics_15.join(', '));
//             log.info(statistics_30.join(', '));
//         }
//         catch (err) {
//             log.info({ lv: 'ERROR', message: err.message, desc: symbol });
//         }
//     }
//
//     return {
//         '05': symbols_kline_5.sort((a, b) => b[4] - a[4])
//         , '10': symbols_kline_10.sort((a, b) => b[4] - a[4])
//         , '15': symbols_kline_15.sort((a, b) => b[4] - a[4])
//         , '30': symbols_kline_30.sort((a, b) => b[4] - a[4])
//     }
// }