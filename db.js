const CONFIG = require("./config");
const pgp = require("pg-promise")();
var log4js = require("log4js");
var logger = log4js.getLogger("db");

const db = pgp(CONFIG.postgres);
const { QueryResultError, queryResultErrorCode } = pgp.errors;

// 测试数据库链接情况

db.one("select now()").then(data => {
    logger.info("Connected Postgres at", data.now);
});

function isNoData(err) {
    return err instanceof QueryResultError && err.code === queryResultErrorCode.noData;
}

// 检查 openid 是否在有效期内
function getAreaIdByOpenId(openid) {
    return db
        .one(
            `
select area_id 
from cox_server.area_wechat_accounts 
where openid=$1 and expired_at > now()
`,
            [openid]
        )
        .then(data => data.area_id)
        .catch(err => {
            if (isNoData(err)) return null;
            else throw err;
        });
}

function bindNewArea({ areaId, openid, type }) {
    let timeRange = "";
    switch (type) {
        case "permanent":
            timeRange = "10 y";
            break;
        case "daily":
            timeRange = "1 day";
            break;
        case "temp":
            timeRange = "10 minutes";
            break;
        default:
            throw Err("错误的二维码类型");
    }

    return db
        .tx(async t => {
            await t.none(
                `
update cox_server.area_wechat_accounts 
set expired_at=now() 
where openid=$1 and expired_at > now()
`,
                [openid]
            );
            await t.none(
                `
insert into cox_server.area_wechat_accounts(area_id, openid, expired_at)
    values($1, $2, now() + INTERVAL '${timeRange}')
on conflict (area_id, openid) do 
    update set expired_at=now() + INTERVAL '${timeRange}'
`,
                [areaId, openid]
            );

            let row = await t.one(
                `
select area_id from cox_server.area_wechat_accounts 
where openid=$1 and expired_at > now()
`,
                [openid]
            );
            return row.area_id;
        })
        .catch(err => {
            logger.error(err);
            // should ROLLBACK here
            throw err;
        });
}

module.exports = {
    getAreaIdByOpenId,
    bindNewArea
};
