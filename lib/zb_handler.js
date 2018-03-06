'use strict';
const log = require('./log');
const request = require('./request');

exports.fetch_symbols = async () => {
    const symbols = new Set();
    const markets = await request.send({ host: 'api.zb.com', path: '/data/v1/markets' });
    Object.keys(markets).forEach((market) => symbols.add(market.split('_')[0]));
    return [...symbols].sort((a, b) => {
        if (a > b) return 1;
        else return - 1;
    });
}

exports.symbols_to_kline = async (symbols, interval) => {
    const size = Math.floor(interval / 5);
    const fail_symbols = [];
    const symbols_kline_5 = [];
    const symbols_kline_10 = [];
    const symbols_kline_15 = [];
    const symbols_kline_30 = [];

    const qc_qc = await fetch_qc_in_qc(size);
    const btc_qc = await fetch_btc_in_qc(size);
    const usdt_qc = await fetch_usdt_in_qc(size);

    // 循环处理交易对
    for (let symbol of symbols) {
        try {
            const statistics_5 = new Array(5);
            const statistics_10 = new Array(5);
            const statistics_15 = new Array(5);
            const statistics_30 = new Array(5);

            statistics_5[0] = symbol;
            statistics_10[0] = symbol;
            statistics_15[0] = symbol;
            statistics_30[0] = symbol;

            // 循环处理该交易对在不同平台的价格
            for (let task of yield_opt(symbol, size)) {

                let total_5 = 0;
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
                        if (index === 5) total_5 += datum[4] * datum[5] * multipl[index];
                        if (index >= 4) total_10 += datum[4] * datum[5] * multipl[index];
                        if (index >= 3) total_15 += datum[4] * datum[5] * multipl[index];
                        total_30 += datum[4] * datum[5] * multipl[index];
                    });
                }

                let index;
                if (task.qs.market.split('_')[1] === 'btc') index = 2;
                else if (task.qs.market.split('_')[1] === 'usdt') index = 3;
                else index = 1;

                statistics_5[index] = Number((total_5 / 10000).toFixed(1));
                statistics_10[index] = Number((total_10 / 10000).toFixed(1));
                statistics_15[index] = Number((total_15 / 10000).toFixed(1));
                statistics_30[index] = Number((total_30 / 10000).toFixed(1));
            }

            statistics_5[4] = Number((statistics_5[1] + statistics_5[2] + statistics_5[3]).toFixed(1));
            statistics_10[4] = Number((statistics_10[1] + statistics_10[2] + statistics_10[3]).toFixed(1));
            statistics_15[4] = Number((statistics_15[1] + statistics_15[2] + statistics_15[3]).toFixed(1));
            statistics_30[4] = Number((statistics_30[1] + statistics_30[2] + statistics_30[3]).toFixed(1));

            symbols_kline_5.push(statistics_5);
            symbols_kline_10.push(statistics_10);
            symbols_kline_15.push(statistics_15);
            symbols_kline_30.push(statistics_30);

            log.info(statistics_5.join(', '));
            log.info(statistics_10.join(', '));
            log.info(statistics_15.join(', '));
            log.info(statistics_30.join(', '));
        }
        catch (err) {
            fail_symbols.push(symbol);
            log.info({ lv: 'ERROR', message: err.message, desc: symbol });
        }
    }

    // 循环处理失败交易对
    for (let symbol of fail_symbols) {
        try {
            const statistics_5 = new Array(5);
            const statistics_10 = new Array(5);
            const statistics_15 = new Array(5);
            const statistics_30 = new Array(5);

            statistics_5[0] = symbol;
            statistics_10[0] = symbol;
            statistics_15[0] = symbol;
            statistics_30[0] = symbol;

            // 循环处理该交易对在不同平台的价格
            for (let task of yield_opt(symbol, size)) {

                let total_5 = 0;
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
                        if (index === 5) total_5 += datum[4] * datum[5] * multipl[index];
                        if (index >= 4) total_10 += datum[4] * datum[5] * multipl[index];
                        if (index >= 3) total_15 += datum[4] * datum[5] * multipl[index];
                        total_30 += datum[4] * datum[5] * multipl[index];
                    });
                }

                let index;
                if (task.qs.market.split('_')[1] === 'btc') index = 2;
                else if (task.qs.market.split('_')[1] === 'usdt') index = 3;
                else index = 1;

                statistics_5[index] = Number((total_5 / 10000).toFixed(1));
                statistics_10[index] = Number((total_10 / 10000).toFixed(1));
                statistics_15[index] = Number((total_15 / 10000).toFixed(1));
                statistics_30[index] = Number((total_30 / 10000).toFixed(1));
            }

            statistics_5[4] = Number((statistics_5[1] + statistics_5[2] + statistics_5[3]).toFixed(1));
            statistics_10[4] = Number((statistics_10[1] + statistics_10[2] + statistics_10[3]).toFixed(1));
            statistics_15[4] = Number((statistics_15[1] + statistics_15[2] + statistics_15[3]).toFixed(1));
            statistics_30[4] = Number((statistics_30[1] + statistics_30[2] + statistics_30[3]).toFixed(1));

            symbols_kline_5.push(statistics_5);
            symbols_kline_10.push(statistics_10);
            symbols_kline_15.push(statistics_15);
            symbols_kline_30.push(statistics_30);

            log.info(statistics_5.join(', '));
            log.info(statistics_10.join(', '));
            log.info(statistics_15.join(', '));
            log.info(statistics_30.join(', '));
        }
        catch (err) {
            log.info({ lv: 'ERROR', message: err.message, desc: symbol });
        }
    }

    return {
        '05': symbols_kline_5.sort((a, b) => b[4] - a[4])
        , '10': symbols_kline_10.sort((a, b) => b[4] - a[4])
        , '15': symbols_kline_15.sort((a, b) => b[4] - a[4])
        , '30': symbols_kline_30.sort((a, b) => b[4] - a[4])
    }
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