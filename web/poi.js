const { isNoData, one, none, many } = require("./db");
const { narrowPOI } = require("./utils");

async function list(pageNum, pageSize) {
    let pois = await many(
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
            totalCount = await one("Select count(*) From POI").then((r) =>
                parseInt(r.count)
            );

            if (isNoData(err)) return [];
            else throw err;
        });
    pois.map((i) => narrowPOI(i));

    return { pois, totalCount };
}
function create(source_id, source_type = "default", tags = {}, lat, lng) {
    let tagsField = JSON.stringify(tags).replace(/'/g, "''");
    let ST_Point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;
    return one(
        `
            Insert Into POI 
            (source_id, source_type, tags, point, updated_at) 
            Values ( ${source_id}, '${source_type}', '${tagsField}', ${ST_Point}, now() ) 
            Returning id`
    ).then((r) => r.id);
}
function update(sourceId, sourceType = "default", tags = {}, lat, lng) {
    let tagsField = JSON.stringify(tags).replace(/'/g, "''");
    let point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;

    return none(`
    Insert Into POI
        (source_id, source_type, tags, point, updated_at)
    Values
        (${sourceId}, '${sourceType}', '${tagsField}', ${point}, now())
    On conflict(source_id, source_type)
    Do Update 
        Set
            tags='${tagsField}',
            point=${point},
            updated_at=now()`);
}

function remove(sourceId, sourceType) {
    let typeCnd = sourceType ? ` And source_type=${sourceType}` : "";
    return none(`Delete From POI Where source_id=${sourceId} ${typeCnd}`);
}

async function info(sourceId, sourceType) {
    let typeCnd = sourceType ? ` And source_type=${sourceType}` : "";
    let poi = await one(
        `
            Select *, ST_AsText(point) as point 
            From POI Where source_id=${sourceId} ${typeCnd}`
    ).catch((err) => {
        if (isNoData(err)) return false;
        else throw err;
    });
    return narrowPOI(poi);
}

module.exports = {
    list,
    info,
    create,
    update,
    remove,
};
