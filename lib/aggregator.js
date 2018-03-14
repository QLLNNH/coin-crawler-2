'use strict';
const log = require('./log');
const cache = require('./cache');
const Zb = require('./zb');

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

            socket.on('kline', (interval) => socket.emit('kline', cache.get_cache(interval)));
        });
    }
}

module.exports = Aggregator;