const ENV = require("./env");
const pgp = require("pg-promise")();
const logger = require("./getlogger")("db");

const DATABASE_CONFIG = {
    host: ENV.POSTGIS.HOST,
    port: ENV.POSTGIS.PORT,
    database: ENV.POSTGIS.DATABASE,
    user: ENV.POSTGIS.USER,
    password: ENV.POSTGIS.PASSWORD,
};

let db = pgp(DATABASE_CONFIG);

function many(sql) {
    return db.many(sql);
}
function one(sql) {
    return db.one(sql);
}
function none(sql) {
    return db.none(sql);
}

(async function connect() {
    try {
        let r = await db.one("Select now()");
        logger.info(`Connect Postgis success [${r.now}]`);
    } catch (e) {
        logger.info(`Connect Postgis error:${JSON.stringify(e)}, Retrying...`);
        setTimeout(connect, 3000);
    }
})();

function exist(sql) {
    return db
        .one(sql)
        .then(() => true)
        .catch((err) => {
            if (isNoData(err)) return false;
            else throw err;
        });
}

const { QueryResultError, queryResultErrorCode } = pgp.errors;
function isNoData(err) {
    return (
        err instanceof QueryResultError &&
        err.code === queryResultErrorCode.noData
    );
}

function testConnection() {
    // 测试数据库链接情况
    return db.one("Select now()").then(
        (data) => data.now,
        (err) => logger.error(err)
    );
}

module.exports = {
    DATABASE_CONFIG,
    many,
    none,
    one,
    exist,
    isNoData,
    testConnection,
};
