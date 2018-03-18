'use strict';
const Zb = require('./zb');
const log = require('./log');
const cache = require('./cache');

class Aggregator {

    constructor(ss) {
        this.ss = ss;
        this.sockets = new Map();
        this.fetch_zb_kline();
        this.init_ws_server();
    }

    async fetch_zb_kline() {
        this.zb = new Zb();
        this.zb.on('zb_kline', (zb_kline) => {
            ['05', '10', '15', '30'].forEach((interval) => cache.set_cache(interval, zb_kline.symbol, zb_kline[interval]));
            for (let socket of this.sockets.values()) socket.emit('zb_kline', zb_kline);
        });
    }

    init_ws_server() {
        this.ss.on('connection', (socket) => {
            this.sockets.set(socket.id, socket);
            for (let socket of this.sockets.values()) socket.emit('online', this.sockets.size);

            socket.on('disconnect', () => {
                this.sockets.delete(socket.id);
                for (let socket of this.sockets.values()) socket.emit('online', this.sockets.size);
            });

            socket.on('load_cache', (interval) => socket.emit('load_cache', cache.get_cache(interval)));
        });
    }
}

module.exports = Aggregator;