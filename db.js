// const CONFIG = require("./config");
const ENV = require("./env");
const pgp = require("pg-promise")();
const log4js = require("log4js");
const logger = log4js.getLogger("db");

const db = pgp({
    host: ENV.POSTGIS_HOST,
    port: ENV.POSTGIS_PORT,
    database: ENV.POSTGIS_DATABASE,
    user: ENV.POSTGIS_USER,
    password: ENV.POSTGIS_PASSWORD
});

const { QueryResultError, queryResultErrorCode } = pgp.errors;

// 测试数据库链接情况

db.one("select now()")
    .then(data => {
        logger.info("Connected Postgres at", data.now);
    })
    .catch(e => console.error(e));

function isNoData(err) {
    return err instanceof QueryResultError && err.code === queryResultErrorCode.noData;
}

function initialize() {
    let sql = `
create table china (
    id serial primary key,
    location geography(point, 4326)
)
    `;
}

module.exports = {};
