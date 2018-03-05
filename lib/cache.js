'use strict';
const cache = { min_5: [], min_15: [], min_30: [] };

exports.get_cache = (m) => {
    return cache[`min_${m}`];
}

exports.set_cache = (m, arr) => {
    cache[`min_${m}`] = arr;
}