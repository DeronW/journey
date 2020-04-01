const ENV = require("./env");
const pgp = require("pg-promise")();
const fs = require("fs");
const csv = require("fast-csv");
const xml2js = require("xml2js");
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
        let r = await db.one("Select now()");
        logger.info(`Connect Postgis success [${r.now}]`);
    } catch (e) {
        logger.info(`Connect Postgis error:${JSON.stringify(e)}, Retrying...`);
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
    return (
        err instanceof QueryResultError &&
        err.code === queryResultErrorCode.noData
    );
}

function testConnection() {
    // 测试数据库链接情况
    return db.one("Select now()").then(
        data => data.now,
        err => logger.error(err)
    );
}

async function querySetup() {
    let hasTable = await exist(
        `Select 1 From pg_tables Where schemaname = 'public' And tablename = 'setup'`
    );
    let steps = {
        tableCreated: false,
        chinaBoundaryImported: false,
        scenicPointsImported: false
    };
    if (hasTable) {
        let rows = await db.many("Select * From Setup");
        rows.forEach(row => {
            if (row.phase == "table") steps.tableCreated = row.complete;
            if (row.phase == "bundary")
                steps.chinaBoundaryImported = row.complete;
            if (row.phase == "points")
                steps.scenicPointsImported = row.complete;
        });
    }
    return steps;
}

async function createTable() {
    let sql = [
        `Create Table Setup ( phase VARCHAR(32), complete bool )`,
        `Insert Into Setup (phase, complete) Values ('table', true), ('bundary', false), ('points', false)`,
        `Create Table Region (
            id SERIAL PRIMARY KEY,
            code VARCHAR(32) NOT NULL UNIQUE,
            name VARCHAR(64) NOT NULL UNIQUE,
            border GEOMETRY(POLYGON, 4326)
        )`,
        `
        CREATE TABLE POI(
            id SERIAL PRIMARY KEY,
            source_id INT NOT NULL,
            source_type VARCHAR(32),
            tag JSONB,
            point GEOMETRY(POINT, 4326),
            updated_at timestamp
        )
        `,
        `Create Index region_gis_index On Region USING GIST(border)`,
        `Create Index poi_gis_index On POI USING GIST(point)`,
        `Create Index poi_tag_jsonb_index On POI USING GIN(tag)`
    ];
    await resetAll();
    for (let i = 0; i < sql.length; i++) {
        await db.none(sql[i]);
    }
}

async function importScenicPoints() {
    let rows = await new Promise(function(resolve, reject) {
        let rows = [];
        fs.createReadStream(`${__dirname}/fixtures/points.csv`)
            .pipe(csv.parse({ headers: true }))
            .on("error", error => reject(error))
            .on("data", row => rows.push(row))
            .on("end", rowCount => {
                resolve(rows);
            });
    });

    await db.none(`Delete From POI`);

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
        return `(${source_id}, '${tag}', ${point}, now())`;
    });
    values = values.filter(i => !!i).join(",");

    await db.none(`Insert Into POI (
        source_id, tag, point, updated_at
    ) Values ${values}`);
    await db.none(`Update Setup Set complete=true Where phase='points'`);
}

async function resetAll() {
    await db.none("Drop Table If Exists POI");
    await db.none("Drop Table If Exists Region");
    await db.none("Drop Table If Exists Setup");
}

async function isExitBorder(points) {
    let line = points.map(i => `${i.lng} ${i.lat}`).join(","),
        fragments = points
            .map(
                (i, index) =>
                    `ST_Contains(border, ST_GeomFromText('POINT(${i.lng} ${i.lat})', 4326)) as point${index}`
            )
            .join(",");

    let sql = `
        Select 
            ST_Contains(border, ST_GeomFromText('LINESTRING(${line})',4326)) as line,
            ${fragments}
        From (SELECT border FROM region WHERE code = '86') as bundary
        `;
    let r = await db.one(sql);
    return r;
}

function calculateCarpet(points) {
    let multiPolygon = [];

    function singlePointRect({ lat, lng, radius }) {
        let D = radius;
        return [
            { lat: lat - D, lng: lng + D },
            { lat: lat + D, lng: lng + D },
            { lat: lat + D, lng: lng - D },
            { lat: lat - D, lng: lng - D }
        ];
    }

    for (let i = 1; i < points.length; i++) {
        let p1 = points[i - 1],
            p2 = points[i],
            D1 = p1.radius,
            D2 = p2.radius;
        let a = Math.abs(p2.lat - p1.lat),
            b = Math.abs(p2.lng - p1.lng),
            c = Math.sqrt(a * a + b * b);
        if (c == 0) {
            // c will equal 0 only when p1 equal p2
            multiPolygon.push(singlePointRect(p1));
            continue;
        }
        let sinα = a / c,
            cosα = b / c;

        multiPolygon.push([
            { lat: p1.lat + cosα * D1, lng: p1.lng - sinα * D1 },
            { lat: p2.lat + cosα * D2, lng: p2.lng - sinα * D2 },
            { lat: p2.lat - cosα * D2, lng: p2.lng + sinα * D2 },
            { lat: p1.lat - cosα * D1, lng: p2.lng + sinα * D1 }
        ]);
    }

    if (points.length == 1) multiPolygon.push(singlePointRect(points[0]));

    return multiPolygon;
}

async function queryPOIs(points, distance, pageNum, pageSize) {
    // distance, unit: kilometer
    let line = points.map(i => `${i.lng} ${i.lat}`).join(","),
        offset = (pageNum - 1) * pageSize,
        buffer = `ST_Buffer( 
            ST_GeomFromText('LINESTRING(${line})', 4326)::geography, 
            ${distance}, 
            'endcap=flat join=mitre mitre_limit=1.0')
        `;
    let { polygon } = await db.one(` Select ST_AsText(${buffer}) as polygon`);
    let pois = await db.many(`
    Select source_id, tag, ST_AsText(point) as point From (
        Select *, ST_Contains(ST_GeomFromText('${polygon}', 4326), point) from POI ) as a 
    Where a.st_contains = true
    Order By id Asc
    Offset ${offset}
    Limit ${pageSize}
    `);
    pois.map(i => {
        let t = i.point.substr(6, i.point.length - 6).split(" ");
        i.point = { lat: parseFloat(t[1]), lng: parseFloat(t[0]) };
    });

    return {
        polygon,
        pois
    };
}

async function threadLock(seconds) {
    let r = await db.one("Select now()");
    let t = await new Promise(r => setTimeout(r, seconds * 1000));
    return [r, t];
}

async function importRegionBundary() {
    await importChinaRegion();
    await importStateRegion();
}

async function importChinaRegion() {
    const points = require("./fixtures/mainland");
    let border = points.map(i => `${i[0]} ${i[1]}`);
    border.push(points[0][0] + " " + points[0][1]);
    border = border.join(",");
    await db.none(
        `insert into Region (code, name, border) values ('86', '中国', ST_GeomFromText('POLYGON((${border}))', 4326))`
    );
    await db.none(`update Setup set complete=true where phase='bundary'`);
}

async function importStateRegion() {
    function importBundary(code, name, ring) {
        const LIMIT = 200;
        let points = ring.split(","),
            juncturePoint = points[0];
        points.pop(); // MUST drop the last point
        let step = Math.ceil(points.length / LIMIT);
        if (step > 1) border = points.filter((_, index) => index % step == 0);
        else border = points;
        border.push(juncturePoint);
        border = border.join(",");

        return db.none(
            `insert into Region (code, name, border) values ('${code}','${name}', ST_GeomFromText('POLYGON((${border}))', 4326))`
        );
    }

    let content = await new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/fixtures/bundary.xml`, (err, data) =>
            err ? reject(err) : resolve(data)
        );
    });

    let bundary = await xml2js.parseStringPromise(content);
    let provinces = bundary.Country.province;
    for (let i = 0; i < provinces.length; i++) {
        let { code, name, rings } = provinces[i].$;
        if (rings) await importBundary(code, name, rings);
    }
}

const POI = {
    list: function(pageNum, pageSize) {
        pageSize = parseInt(pageSize) || 20;
        pageNum = (parseInt(pageNum) || 1) - 1;
        return db.many(`
        Select id, source_id, source_type, tag, ST_AsText(point) as point
        From POI Order By id Asc Offset ${pageNum * pageSize} Limit ${pageSize}
        `);
    },
    create: function(source_id, source_type, tag, point) {
        let tagField = JSON.stringify(tag).replace(/'/g, "''");
        let ST_Point = `ST_GeomFromText('POINT(${point.lng} ${point.lat})', 4326)`;
        return db
            .one(
                `
        Insert Into POI 
        (source_id, source_type, tag, point) 
        Values ( ${source_id}, '${source_type}', '${tagField}', ${ST_Point} ) 
        Returning id`
            )
            .then(r => r.id);
    },
    update: function(id, source_id, source_type, tag, point) {
        let tagField = JSON.stringify(tag).replace(/'/g, "''");
        let ST_Point = `ST_GeomFromText('POINT(${point.lng} ${point.lat})', 4326)`;
        return db.none(`
    Update POI Set
        source_id=${source_id},
        source_type='${source_type}',
        tag='${tagField}',
        point=${ST_Point}
    Where id=${id}`);
    },
    delete: id => db.none(`Delete From POI Where id=${id}`),
    info: id =>
        db.one(
            `Select *, ST_AsText(point) as plain_point 
            From POI Where id=${id}`
        ),
    count: () => db.one("Select count(*) From POI").then(r => r.count)
};

module.exports = {
    DATABASE_CONFIG,
    POI,
    testConnection,
    importScenicPoints,
    createTable,
    importRegionBundary,
    querySetup,
    resetAll,
    isExitBorder,
    threadLock,
    calculateCarpet,
    queryPOIs
};
