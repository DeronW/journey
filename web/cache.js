class Cache {
    constructor(maxQ = 1) {
        this._obj = {};
        this._keys = [];
        this.maxQ = maxQ;
    }
    get(key) {
        return this._obj[key];
    }
    add(key, value) {
        this._obj[key] = value;
        this._keys.push(key);
        if (this._keys.length > this.maxQ) {
            let oldKey = this._keys.shift();
            this.remove(oldKey);
        }
    }
    remove(key) {
        delete this._obj[key];
    }
}

const cache = new Cache();

module.exports = cache;
