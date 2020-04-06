const ENV = require("./env");
const pgp = require("pg-promise")();
const logger = require("./getlogger")("db");
const utils = require("./utils");

const DATABASE_CONFIG = {
    host: ENV.POSTGIS.HOST,
    port: ENV.POSTGIS.PORT,
    database: ENV.POSTGIS.DATABASE,
    user: ENV.POSTGIS.USER,
    password: ENV.POSTGIS.PASSWORD,
};

let db = pgp(DATABASE_CONFIG);

function many(sql) {
    // logger.debug(sql);
    return db.many(sql);
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

const { QueryResultError, queryResultErrorCode } = pgp.errors;

function exist(sql) {
    return db
        .one(sql)
        .then(() => true)
        .catch((err) => {
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
        (data) => data.now,
        (err) => logger.error(err)
    );
}

async function querySetup() {
    let hasTable = await exist(
        `Select 1 From pg_tables Where schemaname = 'public' And tablename = 'setup'`
    );
    let steps = {
        tableCreated: false,
        chinaBoundaryImported: false,
        scenicPointsImported: false,
    };
    if (hasTable) {
        let rows = await db.many("Select * From Setup");
        rows.forEach((row) => {
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
            tags JSONB,
            point GEOMETRY(POINT, 4326),
            updated_at timestamp
        )
        `,
        `Create Index region_gis_index On Region USING GIST(border)`,
        `Create Index poi_gis_index On POI USING GIST(point)`,
        `Create Index poi_tags_jsonb_index On POI USING GIN(tags)`,
    ];
    await resetAll();
    for (let i = 0; i < sql.length; i++) {
        await db.none(sql[i]);
    }
}

async function importScenicPoints() {
    let rows = await utils.getPOIs();

    await db.none(`Delete From POI`);

    let values = rows
        .map((i) => {
            let { source_id, tagsJSON, lat, lng } = i;
            let point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;
            return `(${source_id}, '${tagsJSON}', ${point}, now())`;
        })
        .join(",");

    await db.none(`
    Insert Into POI (
        source_id, tags, point, updated_at
    ) Values ${values}`);
    await db.none(`Update Setup Set complete=true Where phase='points'`);
}

async function resetAll() {
    await db.none("Drop Table If Exists POI");
    await db.none("Drop Table If Exists Region");
    await db.none("Drop Table If Exists Setup");
}

function isTransboundary(points) {
    let line = points.map((i) => `${i.lng} ${i.lat}`).join(","),
        fragments = points
            .map(
                (i, index) =>
                    `not ST_Contains(border, ST_GeomFromText('POINT(${i.lng} ${i.lat})', 4326)) as point${index}`
            )
            .join(",");

    let sql = `
        Select 
            not ST_Contains(border, ST_GeomFromText('LINESTRING(${line})',4326)) as line,
            ${fragments}
        From (SELECT border FROM region WHERE code = '86') as bundary
        `;
    return db.one(sql);
}

function calculateCarpet(points) {
    let multiPolygon = [];

    function singlePointRect({ lat, lng, radius }) {
        let D = radius;
        return [
            { lat: lat - D, lng: lng + D },
            { lat: lat + D, lng: lng + D },
            { lat: lat + D, lng: lng - D },
            { lat: lat - D, lng: lng - D },
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
            { lat: p1.lat - cosα * D1, lng: p2.lng + sinα * D1 },
        ]);
    }

    if (points.length == 1) multiPolygon.push(singlePointRect(points[0]));

    return multiPolygon;
}

function replacePointWithLatlng(poi) {
    let fix6 = (f) => parseInt(parseFloat(f) * 1000000) / 1000000;
    let t = poi.point.substr(6, poi.point.length - 6).split(" "),
        lat = fix6(t[1]),
        lng = fix6(t[0]);
    delete poi.point;
    poi.lat = lat;
    poi.lng = lng;
}

async function queryPOIsWithPolylineBuffer(
    points,
    distance,
    pageNum,
    pageSize,
    filter,
    filterType,
    debug
) {
    // https://postgis.net/docs/ST_Buffer.html
    // distance, unit: kilometer
    let line = points.map((i) => `${i.lng} ${i.lat}`).join(","),
        offset = (pageNum - 1) * pageSize,
        buffer = `Select ST_Buffer( 
            ST_GeomFromText('LINESTRING(${line})', 4326)::geography, 
            ${distance}, 
            'endcap=flat join=mitre mitre_limit=1.0')::geometry as buffer`;

    let tagsCnd = convertFilterToConditions(filter, filterType);
    let totalCount;
    let pois = await many(
        `Select 
                source_id, tags, 
                ST_AsText(point) as point,
                count(*) OVER() AS total_count 
            From (
                Select *, ST_Contains(buffer, point) 
                From POI, (${buffer}) as buffer ) as tbl
            Where tbl.st_contains = true And ${tagsCnd}
            Order By id Asc
            Offset ${offset}
            Limit ${pageSize}`
    )
        .then((pois) => {
            totalCount = parseInt(pois[0].total_count);
            pois.map((i) => delete i.total_count);
            return pois;
        })
        .catch(async (err) => {
            totalCount = await db
                .one(
                    `
                Select count(*) 
                From (
                    Select ST_Contains(buffer, point) 
                    From POI, (${buffer}) as buffer ) as tbl
                Where tbl.st_contains = true
                `
                )
                .then((r) => parseInt(r.count));

            if (isNoData(err)) return [];
            else throw err;
        });

    pois.map((i) => replacePointWithLatlng(i));

    let polygon;
    if (debug) {
        let t = await db.one(
            `Select ST_AsText(buffer) as polygon From (${buffer}) as tbl`
        );
        polygon = t.polygon;
    }

    return {
        polygon,
        pois,
        totalCount,
    };
}

function convertFilterToConditions(filter, filterType) {
    let tagsCnd = "True";
    if (!filter) return tagsCnd;

    let toS = (obj) => JSON.stringify(obj).replace(/'/g, "''");

    if (filterType == "and") {
        tagsCnd = `tags @> '${toS(filter)}'`;
    } else if (filterType == "or") {
        tagsCnd = Object.keys(filter).map(
            (i) => `tags @> '${toS({ [i]: filter[i] })}'`
        );
        tagsCnd = `(${tagsCnd.join(" Or ")})`;
    }
    return tagsCnd;
}

async function queryPOIsWithBoundingCircle(
    points,
    pageNum,
    pageSize,
    filter,
    filterType,
    debug
) {
    //  https://postgis.net/docs/ST_MinimumBoundingCircle.html
    let line = points.map((i) => `${i.lng} ${i.lat}`).join(","),
        offset = (pageNum - 1) * pageSize;

    let tagsCnd = convertFilterToConditions(filter, filterType);

    let circle = `Select ST_MinimumBoundingCircle( ST_Collect(ST_GeomFromText('LINESTRING(${line})', 4326)), 2 ) as circle`;

    let totalCount;
    let pois = await db
        .many(
            `Select 
                source_id, tags, 
                ST_AsText(point) as point,
                count(*) OVER() AS total_count From (
                    Select *, ST_Contains( circle, point ) 
                    From POI, (${circle}) as circle ) as tbl
            Where tbl.st_contains = true And ${tagsCnd}
            Order By id Asc
            Offset ${offset}
            Limit ${pageSize}`
        )
        .then((pois) => {
            totalCount = parseInt(pois[0].total_count);
            pois.map((i) => delete i.total_count);
            return pois;
        })
        .catch(async (err) => {
            totalCount = await db
                .one(
                    `
            Select count(*) 
            From (
                Select ST_Contains(circle, point) 
                From POI, (${circle}) as circle ) as tbl
            Where tbl.st_contains = true And ${tagsCnd}
            `
                )
                .then((r) => parseInt(r.count));

            if (isNoData(err)) return [];
            else throw err;
        });
    pois.map((i) => replacePointWithLatlng(i));

    let polygon;
    if (debug) {
        let t = await db.one(
            `Select ST_AsText(circle) as polygon From (${circle}) as tbl`
        );
        polygon = t.polygon;
    }

    return {
        polygon,
        pois,
        totalCount,
    };
}

async function threadLock(seconds) {
    let r = await db.one("Select now()");
    let t = await new Promise((r) => setTimeout(r, seconds * 1000));
    return [r, t];
}

async function importRegionBundary() {
    await importChinaRegion();
    await importStateRegion();
}

async function importChinaRegion() {
    const points = require("./fixtures/mainland");
    let border = points.map((i) => `${i[0]} ${i[1]}`);
    border.push(points[0][0] + " " + points[0][1]);
    border = border.join(",");
    await db.none(
        `insert into Region (code, name, border) values ('86', '中国', ST_GeomFromText('POLYGON((${border}))', 4326))`
    );
    await db.none(`update Setup set complete=true where phase='bundary'`);
}

async function importStateRegion() {
    let bundaries = await utils.getProvincesBundary();
    for (let i = 0; i < bundaries.length; i++) {
        let { code, name, rings } = bundaries[i],
            border = rings.join(",");

        await db.none(
            `insert into Region (code, name, border) values ('${code}','${name}', ST_GeomFromText('POLYGON((${border}))', 4326))`
        );
    }
}

const POI = {
    list: async function (pageNum, pageSize) {
        let pois = await db
            .many(
                `
        Select 
            id, source_id, source_type, tags, 
            ST_AsText(point) as point,
            count(*) OVER() AS total_count
        From POI Order By id Asc Offset ${pageNum * pageSize} Limit ${pageSize}
        `
            )
            .then((pois) => {
                totalCount = parseInt(pois[0].total_count);
                pois.map((i) => delete i.total_count);
                return pois;
            })
            .catch(async (err) => {
                totalCount = await db
                    .one("Select count(*) From POI")
                    .then((r) => parseInt(r.count));

                if (isNoData(err)) return [];
                else throw err;
            });
        pois.map((i) => replacePointWithLatlng(i));

        return { pois, totalCount };
    },
    create: function (source_id, source_type = null, tags = {}, lat, lng) {
        let tagsField = JSON.stringify(tags).replace(/'/g, "''");
        let ST_Point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;
        return db
            .one(
                `
            Insert Into POI 
            (source_id, source_type, tags, point, updated_at) 
            Values ( ${source_id}, ${source_type}, '${tagsField}', ${ST_Point}, now() ) 
            Returning id`
            )
            .then((r) => r.id);
    },
    update: function (id, source_id, source_type = null, tags = {}, lat, lng) {
        let tagsField = JSON.stringify(tags).replace(/'/g, "''");
        let ST_Point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;

        return db.none(`
        Update POI Set
            source_id=${source_id},
            source_type=${source_type},
            tags='${tagsField}',
            point=${ST_Point},
            updated_at=now()
        Where id=${id}`);
    },
    delete: (id) => db.none(`Delete From POI Where id=${id}`),
    info: async function (id) {
        let poi = await db
            .one(
                `
            Select *, ST_AsText(point) as point 
            From POI Where id=${id}`
            )
            .catch((err) => {
                if (isNoData(err)) return false;
                else throw err;
            });
        if (poi) replacePointWithLatlng(poi);
        return poi;
    },
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
    isTransboundary,
    threadLock,
    calculateCarpet,
    queryPOIsWithPolylineBuffer,
    queryPOIsWithBoundingCircle,
};
