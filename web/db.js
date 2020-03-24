const ENV = require("./env");
const pgp = require("pg-promise")();
const log4js = require("log4js");
const fs = require("fs");
const csv = require("fast-csv");
const logger = log4js.getLogger("db");

const DATABASE_CONFIG = {
    host: ENV.POSTGIS_HOST,
    port: ENV.POSTGIS_PORT,
    database: ENV.POSTGIS_DATABASE,
    user: ENV.POSTGIS_USER,
    password: ENV.POSTGIS_PASSWORD
};

const db = pgp(DATABASE_CONFIG);

const { QueryResultError, queryResultErrorCode } = pgp.errors;

function exist(sql) {
    return db
        .one(sql)
        .then(() => true)
        .catch(err => {
            if (isNoData(err)) return false;
            else throw err;
        });
}

function isNoData(err) {
    return err instanceof QueryResultError && err.code === queryResultErrorCode.noData;
}

function testConnection() {
    // 测试数据库链接情况
    return db.one("select now()").then(
        data => data.now,
        err => logger.error(err)
    );
}

async function querySetup() {
    let hasTable = await exist(
        `SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'setup'`
    );
    let steps = {
        tableCreated: false,
        chinaBoundaryImported: false,
        scenicPointsImported: false
    };
    if (hasTable) {
        let rows = await db.many("select * from setup");
        rows.forEach(row => {
            if (row.phase == "table") steps.tableCreated = row.complete;
            if (row.phase == "bundary") steps.chinaBoundaryImported = row.complete;
            if (row.phase == "points") steps.scenicPointsImported = row.complete;
        });
    }
    return steps;
}

async function createTable() {
    // return db.tx("my-transaction", async t => {
    //     t.none(`
    //     drop table points

    //     `);
    // });
    let sql = [
        `drop table if exists Points`,
        `drop table if exists Region`,
        `drop table if exists Setup`,
        `CREATE TABLE Setup ( phase varchar(32), complete bool )`,
        `insert into setup (phase, complete) values ('table', true), ('bundary', false), ('points', false)`,
        `create table region (
            id SERIAL PRIMARY KEY,
            name varchar(32),
            border geometry(POLYGON, 4326)
        )`,
        `
        CREATE TABLE Points(
            id SERIAL PRIMARY KEY,
            source_id int not null,
            source_type varchar(32),
            tag jsonb,
            latitude float,
            longitude float,
            point geometry(POINT,4326),
            created_at timestamp,
            updated_at timestamp
        )
        `,
        `create index region_gis_index on Region using gist(border)`,
        `create index points_gis_index on points using gist(point)`,
        `create index points_tag_jsonb_index on points using gin(tag)`
    ];
    for (let i = 0; i < sql.length; i++) {
        await db.none(sql[i]);
    }
}

async function importChinaBundary() {
    const points = require("./fixtures/china");
    let border = points.map(i => `${i[0]} ${i[1]}`);
    border.push(points[0][0] + " " + points[0][1]);
    border = border.join(",");
    await db.none(
        `insert into Region (name, border) values ('china', ST_GeomFromText('POLYGON((${border}))', 4326))`
    );
    await db.none(`update Setup set complete=true where phase='bundary'`);
}

function readScenicPoints() {
    return new Promise(function(resolve, reject) {
        let rows = [];
        fs.createReadStream(`${__dirname}/fixtures/points.csv`)
            .pipe(csv.parse({ headers: true }))
            .on("error", error => reject(error))
            .on("data", row => rows.push(row))
            .on("end", rowCount => {
                resolve(rows);
            });
    });
}

async function importScenicPoints() {
    let rows = await readScenicPoints();

    await db.none(`delete from Points`);
    let values = rows.map(i => {
        let source_id = parseInt(i.scenic_id),
            lat = parseFloat(i.lat),
            lng = parseFloat(i.lng),
            tag = JSON.stringify({
                name: i.scenic_name,
                rank: parseInt(i.rank),
                name_en: i.english
            }).replace(/'/g, "''"),
            point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;
        if (isNaN(lat) || isNaN(lng) || isNaN(i.rank)) return null;
        return `(${source_id}, '${tag}', ${lat}, ${lng}, ${point}, now(), now())`;
    });
    values = values.filter(i => !!i).join(",");

    await db.none(`insert into Points (
        source_id, tag, latitude, longitude, point, created_at, updated_at
    ) values ${values}`);
    await db.none(`update Setup set complete=true where phase='points'`);
}

async function resetAll() {
    await db.none(`drop table if exists Points`);
    await db.none(`drop table if exists Setup`);
    await db.none(`drop table if exists Region`);
}

async function isExitBorder(points) {
    let line = points.map(i => `${i.lng} ${i.lat}`).join(",");

    let r = await db.one(`
        SELECT ST_Contains(
            (SELECT border FROM region WHERE name = 'china'), 
            ST_GeomFromText('LINESTRING(${line})',4326));
        `);
    return !r.st_contains;
}
// isExitBorder([
//     { lat: 30, lng: 120 },
//     { lat: 31, lng: 121 }
// ]);

module.exports = {
    DATABASE_CONFIG,
    testConnection,
    importScenicPoints,
    createTable,
    importChinaBundary,
    querySetup,
    resetAll,
    isExitBorder
};
