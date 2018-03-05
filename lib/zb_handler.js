'use strict';
const log = require('./log');
const request = require('./request');

exports.fetch_symbols = async () => {
    const symbols = new Set();
    const markets = await request.send({ host: 'api.zb.com', path: '/data/v1/markets' });
    Object.keys(markets).forEach((market) => symbols.add(market.split('_')[0]));
    return [...symbols];
}

exports.symbols_to_kline = async (symbols, interval) => {
    const size = Math.floor(interval / 5);
    const fail_symbols = [];
    const symbols_kline = [];

    const qc_qc = await fetch_qc_in_qc(size);
    const btc_qc = await fetch_btc_in_qc(size);
    const usdt_qc = await fetch_usdt_in_qc(size);

    // 循环处理交易对
    for (let symbol of symbols) {
        try {
            const statistics = new Array(5);
            statistics[0] = symbol;

            // 循环处理该交易对在不同平台的价格
            for (let task of yield_opt(symbol, size)) {

                let total = 0;

                // 获取该交易对在该平台的价格
                const kline_result = await request.send(task);

                // 如果有返回结果
                if (kline_result.symbol === symbol) {
                    let multipl;

                    if (kline_result.moneyType.toLowerCase() === 'btc') multipl = btc_qc;
                    else if (kline_result.moneyType.toLowerCase() === 'usdt') multipl = usdt_qc;
                    else multipl = qc_qc;

                    kline_result.data.forEach((datum, index) => total += datum[4] * datum[5] * multipl[index]);
                }

                let index;
                if (task.qs.market.split('_')[1] === 'btc') index = 2;
                else if (task.qs.market.split('_')[1] === 'usdt') index = 3;
                else index = 1;

                statistics[index] = Number((total / 10000).toFixed(1));
            }

            statistics[4] = Number((statistics[1] + statistics[2] + statistics[3]).toFixed(1));
            symbols_kline.push(statistics);

            log.info({ lv: 'INFO', message: statistics.join(', ') });
        }
        catch (err) {
            fail_symbols.push(symbol);
            log.info({ lv: 'ERROR', message: err.message, desc: symbol });
        }
    }

    // 循环处理失败交易对
    for (let symbol of fail_symbols) {
        try {
            const statistics = new Array(5);
            statistics[0] = symbol;

            // 循环处理该交易对在不同平台的价格
            for (let task of yield_opt(symbol, size)) {

                let total = 0;

                // 获取该交易对在该平台的价格
                const kline_result = await request.send(task);

                // 如果有返回结果
                if (kline_result.symbol === symbol) {
                    let multipl;

                    if (kline_result.moneyType.toLowerCase() === 'btc') multipl = btc_qc;
                    else if (kline_result.moneyType.toLowerCase() === 'usdt') multipl = usdt_qc;
                    else multipl = qc_qc;

                    kline_result.data.forEach((datum, index) => total += datum[4] * datum[5] * multipl[index]);
                }

                let index;
                if (task.qs.market.split('_')[1] === 'btc') index = 2;
                else if (task.qs.market.split('_')[1] === 'usdt') index = 3;
                else index = 1;

                statistics[index] = Number((total / 10000).toFixed(1));
            }

            statistics[4] = Number((statistics[1] + statistics[2] + statistics[3]).toFixed(1));
            symbols_kline.push(statistics);

            log.info({ lv: 'INFO', message: `${symbol} -> ${statistics.toString()}` });
        }
        catch (err) {
            log.info({ lv: 'ERROR', message: err.message, desc: `${symbol} 失败两次` });
        }
    }

    return symbols_kline.sort((a, b) => a[4] - b[4]);
}

function yield_opt(symbol, size) {
    const platforms = ['qc', 'btc', 'usdt'];
    return platforms.map((platform) => {
        return {
            host: 'api.zb.com'
            , path: '/data/v1/kline'
            , qs: {
                type: '5min'
                , size: size
                , market: `${symbol}_${platform}`
            }
        }
    });
}

async function fetch_qc_in_qc(size) {
    return new Array(size).fill(1);
}

async function fetch_btc_in_qc(size) {
    const ret = await request.send({
        host: 'api.zb.com'
        , path: '/data/v1/kline'
        , qs: {
            type: '5min'
            , size: size
            , market: 'btc_qc'
        }
    });

    return ret.data.map((datum) => datum[4]);
}

async function fetch_usdt_in_qc(size) {
    const ret = await request.send({
        host: 'api.zb.com'
        , path: '/data/v1/kline'
        , qs: {
            type: '5min'
            , size: size
            , market: 'usdt_qc'
        }
    });

    return ret.data.map((datum) => datum[4]);
}