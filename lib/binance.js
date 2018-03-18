'use strict';
const request = require('./request');

(async function () {
    const ret = await request.send_s({ host: 'api.binance.com', path: '/api/v1/exchangeInfo' });
    ret.symbols.forEach((symbol) => {
        console.log(`${symbol.baseAsset}, ${symbol.quoteAsset}`);
    });
    console.log(ret.symbols.length);
})();

