const ENV = require("./env");
const pgp = require("pg-promise")();
const fs = require("fs");
const csv = require("fast-csv");
const logger = require("./getlogger")("db");

const DATABASE_CONFIG = {
    host: ENV.POSTGIS.HOST,
    port: ENV.POSTGIS.PORT,
    database: ENV.POSTGIS.DATABASE,
    user: ENV.POSTGIS.USER,
    password: ENV.POSTGIS.PASSWORD
};

let db = pgp(DATABASE_CONFIG);

(async function connect() {
    try {
        let r = await db.one("select now()");
        logger.info(`connect postgis success [${r.now}]`);
    } catch (e) {
        logger.info(`connect postgis error:${JSON.stringify(e)}, retrying...`);
        setTimeout(connect, 3000);
    }
})();

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
            location geometry(POINT,4326),
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
        source_id, tag, latitude, longitude, location, created_at, updated_at
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

function calculateCarpet(points) {
    let polygon = [];
    if (points.length == 1) {
        let p = points[0],
            D = points[0].radius || 10;

        return [
            { lat: p.lat - D, lng: p.lng + D },
            { lat: p.lat + D, lng: p.lng + D },
            { lat: p.lat + D, lng: p.lng - D },
            { lat: p.lat - D, lng: p.lng - D }
        ];
    }

    for (let i = 1; i < points.length; i++) {
        let p1 = points[i - 1],
            p2 = points[i],
            x1 = p1.lat,
            y1 = p1.lng,
            x2 = p2.lat,
            y2 = p2.lng;
        let alpha = "??";
        Math.sin();

        polygon.push([
            { lat: x1.lat - D, lng: p.lng + D },
            { lat: p.lat + D, lng: p.lng + D },
            { lat: p.lat + D, lng: p.lng - D },
            { lat: p.lat - D, lng: p.lng - D }
        ]);
    }

    return polygon;
}

async function threadLock() {
    let r = await db.one("select now()");
    let t = await new Promise(r => setTimeout(r, 2000));
    return [r, t];
}

module.exports = {
    DATABASE_CONFIG,
    testConnection,
    importScenicPoints,
    createTable,
    importChinaBundary,
    querySetup,
    resetAll,
    isExitBorder,
    threadLock
};
