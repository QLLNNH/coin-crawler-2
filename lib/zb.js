'use strict';
const log = require('./log');
const Events = require('events');
const request = require('./request');
const { host } = require('../config');

module.exports = class Zb extends Events {

    constructor() {
        super();
        this.size = 30;
        this.init();
    }

    async init() {
        try {
            console.log('init');
            await this.load_symbols();
            await this.load_symbols_kline();
        }
        catch (err) {
            this.init();
        }
    }

    async load_symbols() {
        const symbols = new Set();
        const markets = await request.send({ host: host, path: '/data/v1/markets' });
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
            host: host
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
            host: host
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
        try {
            const qc_qc = await this.fetch_qc_in_qc();
            const btc_qc = await this.fetch_btc_in_qc();
            const usdt_qc = await this.fetch_usdt_in_qc();

            for (let symbol of this.symbols) {

                // TODO
                // this.emit('kline', {
                //     symbol: symbol
                //     , '05': [symbol].concat(this.randow_data(10))
                //     , '10': [symbol].concat(this.randow_data(100))
                //     , '15': [symbol].concat(this.randow_data(1000))
                //     , '30': [symbol].concat(this.randow_data(10000))
                // });

                try {
                    const statistics_05 = new Array(6);
                    const statistics_10 = new Array(6);
                    const statistics_15 = new Array(6);
                    const statistics_30 = new Array(6);

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
                                if (index >= 25) total_05 += datum[4] * datum[5] * multipl[index];
                                if (index >= 20) total_10 += datum[4] * datum[5] * multipl[index];
                                if (index >= 15) total_15 += datum[4] * datum[5] * multipl[index];
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

                        const ts = Date.now();
                        statistics_05[5] = ts;
                        statistics_10[5] = ts;
                        statistics_15[5] = ts;
                        statistics_30[5] = ts;

                        statistics_05[4] = Number((statistics_05[1] + statistics_05[2] + statistics_05[3]).toFixed(1));
                        statistics_10[4] = Number((statistics_10[1] + statistics_10[2] + statistics_10[3]).toFixed(1));
                        statistics_15[4] = Number((statistics_15[1] + statistics_15[2] + statistics_15[3]).toFixed(1));
                        statistics_30[4] = Number((statistics_30[1] + statistics_30[2] + statistics_30[3]).toFixed(1));
                    }

                    console.log(`${new Date().toISOString()} ${symbol} ${statistics_05.join(', ')}`);

                    this.emit('kline', {
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
        }
        catch (err) {
            log.info({ lv: 'ERROR', message: err.message, desc: 'load_symbols_kline' });
        }
        finally {
            setTimeout(this.load_symbols_kline.bind(this), 0);
        }
    }

    yield_opt(symbol) {
        return ['qc', 'btc', 'usdt'].map((platform) => {
            return {
                host: host
                , path: '/data/v1/kline'
                , qs: {
                    type: '1min'
                    , size: this.size
                    , market: `${symbol}_${platform}`
                }
            }
        });
    }

    randow_data(seed) {
        return [
            Math.floor(Math.random() * 100)
            , Math.floor(Math.random() * 200)
            , Math.floor(Math.random() * 300)
            , Math.floor(Math.random() * seed)
            , Date.now()
        ]
    }
}