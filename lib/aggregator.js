'use strict';
const log = require('./log');
const cache = require('./cache');
const zb_handler = require('./zb_handler');

class Aggregator {

    constructor(ss) {
        this.ss = ss;
        this.sockets = new Map();

        this.init();
        this.init_ws_server();
    }

    async init() {
        await this.load_symbols();
        await this.fetch_zb_kline();
    }

    async load_symbols() {
        try {
            this.symbols = await zb_handler.fetch_symbols();
            log.info({ lv: 'INFO', message: 'symbols load finished' });
        }
        catch (err) {
            log.info({ lv: 'ERROR', message: err.message, desc: 'load_symbols error' });
            this.init();
        }
    }

    async fetch_zb_kline() {
        try {
            for (let interval of [5, 15, 30]) {
                cache.set_cache(interval, await zb_handler.symbols_to_kline(this.symbols, interval));
                for (let socket of this.sockets.values()) socket.emit('change', interval);
                console.log('\n');
            }
        }
        catch (err) {
            log.info({ lv: 'ERROR', message: err.message, desc: 'fetch_zb_kline error' });
            this.init();
        }

        this.timer = setTimeout(this.fetch_zb_kline.bind(this), 0);
    }

    init_ws_server() {
        this.ss.on('connection', (socket) => {
            this.sockets.set(socket.id, socket);

            socket.on('disconnect', () => this.sockets.delete(socket.id));

            socket.on('kline', (interval) => socket.emit('kline', cache.get_cache(interval)));
        });
    }
}

module.exports = Aggregator;