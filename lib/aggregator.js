'use strict';
const log = require('./log');
const cache = require('./cache');
const zb_handler = require('./zb_handler');

class Aggregator {

    constructor(ss) {
        this.ss = ss;
        this.sockets = new Map();
        this.fetch_zb_kline();
        this.init_ws_server();
    }

    async fetch_zb_kline() {
        try {
            console.time('tasks');
            const symbols = await zb_handler.fetch_symbols();
            const kline_results = await zb_handler.symbols_to_kline(symbols, 30)
            cache.set_cache(5, kline_results['05']);
            cache.set_cache(10, kline_results['10']);
            cache.set_cache(15, kline_results['15']);
            cache.set_cache(30, kline_results['30']);
            for (let socket of this.sockets.values()) socket.emit('change');
            console.timeEnd('tasks');
        }
        catch (err) {
            log.info({ lv: 'ERROR', message: err.message, desc: 'fetch_zb_kline error' });
        }
        finally {
            this.timer = setTimeout(this.fetch_zb_kline.bind(this), 0);
        }
    }

    init_ws_server() {
        this.ss.on('connection', (socket) => {
            this.sockets.set(socket.id, socket);
            for (let socket of this.sockets.values()) socket.emit('online', this.sockets.size);

            socket.on('disconnect', () => {
                this.sockets.delete(socket.id);
                for (let socket of this.sockets.values()) socket.emit('online', this.sockets.size);
            });

            socket.on('kline', (interval) => socket.emit('kline', cache.get_cache(interval)));
        });
    }
}

module.exports = Aggregator;