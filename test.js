'use strict';

const rank = function () {
    const cache = {};
    return {
        fetch: () => cache
        , increase: (symbol) => cache[symbol] ++
        , decrease: (symbol) => cache[symbol] --
        , del_ranking: (symbol) => delete cache[symbol]
        , get_ranking: (symbol) => cache.hasOwnProperty(symbol) ? cache[symbol] : undefined
        , set_ranking: (symbol, ranking) => cache[symbol] = ranking
    };
}();

const sequence = function () {
    const cache = [];
    const bs = (target, h, e) => {
        if (e === - 1) {
            cache.push(target);
            return 0;
        }

        if (target[4] >= cache[h][4]) {
            cache.splice(h, 0, target);
            return h;
        }

        else if (cache[e][4] >= target[4]) {
            cache.splice(e + 1, 0, target);
            return e + 1;
        }

        else {
            const mid = Math.floor((e - h) / 2) + h;

            if (cache[mid][4] === target[4]) {
                cache.splice(mid + 1, 0, target);
                return mid + 1;
            }

            else if (cache[mid][4] > target[4]) {
                return bs(target, mid + 1, e);
            }

            else {
                return bs(target, h, mid - 1);
            }
        }
    }
    return {
        fetch: () => cache
        , delete: (start) => cache.splice(start, 1)
        , insert: (target) => bs(target, 0, cache.length - 1)
        , fetch_next: (start) => cache.slice(start + 1).map((item) => item[0])
    }
}();

function handler(zb_kline) {
    const symbol = zb_kline.symbol;
    const target = zb_kline['05'];
    const rank_old = rank.get_ranking(symbol);

    if (rank_old !== undefined) {
        sequence.fetch_next(rank_old).forEach((symbol) => rank.decrease(symbol));
        rank.del_ranking(symbol);
        sequence.delete(rank_old);
    }

    const rank_new = sequence.insert(target);
    rank.set_ranking(symbol, rank_new);

    sequence.fetch_next(rank_new).forEach((symbol) => rank.increase(symbol));

    console.log(rank.fetch());
    console.log(sequence.fetch());
}

setInterval(() => {
    for (let symbol of ['a', 'b', 'c', 'd', 'e']) {
        const msg = {
            symbol: symbol
            , '05': randow_data()
        };
        msg['05'].unshift(symbol);
        handler(msg);
    }
}, 0);

function randow_data() {
    return [Math.floor(Math.random() * 500), Math.floor(Math.random() * 300), Math.floor(Math.random() * 200), Math.floor(Math.random() * 1000)]
}