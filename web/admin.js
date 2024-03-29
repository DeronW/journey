const { exist, none, many } = require("./db");
const utils = require("./utils");
const csv = require("fast-csv");

async function querySetup() {
    let hasTable = await exist(
        `Select 1 From pg_tables Where schemaname = 'public' And tablename = 'setup'`
    );
    let steps = {
        tableCreated: false,
        boundaryImported: false,
        scenicPointsImported: false,
    };
    if (hasTable) {
        let rows = await many("Select * From Setup");
        rows.forEach((row) => {
            if (row.phase == "table") steps.tableCreated = row.complete;
            if (row.phase == "bundary") steps.boundaryImported = row.complete;
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
            source_id INT NOT NULL UNIQUE,
            tags JSONB,
            point GEOMETRY(POINT, 4326),
            updated_at timestamp
        )
        `,
        `Create Index region_gis_index On Region USING GIST(border)`,
        `Create Index poi_gis_index On POI USING GIST(point)`,
        `Create Index poi_source_id_index On POI USING HASH(source_id)`,
        `Create Index poi_tags_jsonb_index On POI USING GIN(tags)`,
    ];
    await resetAll();
    for (let i = 0; i < sql.length; i++) {
        await none(sql[i]);
    }
}

async function importScenicPoints(buffer, erase, overwrite) {
    let rows = await new Promise((resolve, reject) => {
        let rows = [];
        csv.parseString(buffer, { headers: true })
            .on("error", (err) => reject(err))
            .on("data", (row) => rows.push(row))
            .on("end", () => resolve(rows));
    });

    if (erase) await none(`Delete From POI`);

    let values = rows
        .map((i) => {
            let { source_id, tags, lat, lng } = i;
            let point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;
            return `(${source_id}, '${tags || "{}"}', ${point}, now())`;
        })
        .join(",");

    let merge = "Nothing";
    if (overwrite)
        merge =
            "Update Set tags=excluded.tags, point=excluded.point, updated_at=now() ";

    await none(`
    Insert Into POI (
        source_id, tags, point, updated_at
    ) Values ${values}
    On Conflict(source_id)
    Do ${merge} 
    `);
    await none(`Update Setup Set complete=true Where phase='points'`);
}

async function resetAll() {
    await none("Drop Table If Exists POI");
    await none("Drop Table If Exists Region");
    await none("Drop Table If Exists Setup");
}

async function importChinaRegion() {
    const points = require("./fixtures/mainland");
    let border = points.map((i) => `${i[0]} ${i[1]}`);
    border.push(points[0][0] + " " + points[0][1]);
    border = border.join(",");
    await none(
        `insert into Region (code, name, border) values ('86', '中国', ST_GeomFromText('POLYGON((${border}))', 4326))`
    );
    await none(`update Setup set complete=true where phase='bundary'`);
}

async function importStateRegion() {
    let bundaries = await utils.getProvincesBundary();
    for (let i = 0; i < bundaries.length; i++) {
        let { code, name, rings } = bundaries[i],
            border = rings.join(",");

        await none(
            `insert into Region (code, name, border) values ('${code}','${name}', ST_GeomFromText('POLYGON((${border}))', 4326))`
        );
    }
}

async function importRegionBundary() {
    await importChinaRegion();
    await importStateRegion();
}

async function initialize() {
    let initialization = await querySetup();
    if (initialization.tableCreated == false) {
        await createTable();
        await importRegionBundary();
    }
}
// check initialze status, run it when server startd
initialize();

module.exports = {
    querySetup,
    importScenicPoints,
    createTable,
    importRegionBundary,
    resetAll,
};
