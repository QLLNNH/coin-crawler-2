'use strict';
const cache = require('./cache');
const zb_handler = require('./zb_handler');

(async function () {
    const symbols = await zb_handler.fetch_symbols();

    cache.set_cache(5, await zb_handler.symbols_to_kline(symbols.slice(0, 5), 5));
    cache.set_cache(15, await zb_handler.symbols_to_kline(symbols.slice(0, 5), 15));
    cache.set_cache(30, await zb_handler.symbols_to_kline(symbols.slice(0, 5), 30));
    console.log()
}());