const CONFIG = require("./config");
const pgp = require("pg-promise")();
var log4js = require("log4js");
var logger = log4js.getLogger("db");

const db = pgp(CONFIG.postgis);
const { QueryResultError, queryResultErrorCode } = pgp.errors;

// 测试数据库链接情况

console.log(1111)
db.one("select now()").then(data => {
    logger.info("Connected Postgres at", data.now);
}).catch(e => console.error(e));

function isNoData(err) {
    return err instanceof QueryResultError && err.code === queryResultErrorCode.noData;
}

function initialize(){

    let sql = `
create table china (
    id serial primary key,
    location geography(point, 4326)
)
    `
}

module.exports = {};
