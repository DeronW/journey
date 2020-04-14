const { isNoData, one, none, many } = require("./db");
const { narrowPOI, tagsToString } = require("./utils");

async function list(pageNum, pageSize) {
    let pois = await many(
        `
        Select 
            id, source_id, tags, 
            ST_AsText(point) as point,
            count(*) OVER() AS total_count
        From POI Order By id Asc Offset ${pageNum * pageSize} Limit ${pageSize}
        `
    )
        .then((pois) => {
            totalCount = parseInt(pois[0].total_count);
            pois.map((i) => narrowPOI(i));
            return pois;
        })
        .catch(async (err) => {
            totalCount = await one("Select count(*) From POI").then((r) =>
                parseInt(r.count)
            );

            if (isNoData(err)) return [];
            else throw err;
        });

    return { pois, totalCount };
}

function create(sourceId, tags = {}, lat, lng) {
    let tagsField = tagsToString(tags);
    let ST_Point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;
    return one(`
    Insert Into POI (source_id, tags, point, updated_at) 
    Values ( ${sourceId}, '${tagsField}', ${ST_Point}, now() ) 
    On Conflict(source_id)
    Do Nothing
    Returning id
        `)
        .then((r) => r.id)
        .catch((err) => {
            if (isNoData(err)) return null;
            else throw err;
        });
}
function update(sourceId, tags = {}, lat, lng) {
    let tagsField = tagsToString(tags);
    let point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;

    return none(`
    Insert Into POI (source_id, tags, point, updated_at)
    Values (${sourceId}, '${tagsField}', ${point}, now())
    On Conflict(source_id)
    Do Update 
        Set tags='${tagsField}', point=${point}, updated_at=now()`);
}

function remove(sourceId) {
    return none(`Delete From POI Where source_id=${sourceId}`);
}

function info(sourceId) {
    return one(`
    Select *, ST_AsText(point) as point 
    From POI Where source_id=${sourceId}`)
        .then((r) => narrowPOI(r))
        .catch((err) => {
            if (isNoData(err)) return false;
            else throw err;
        });
}

module.exports = {
    list,
    info,
    create,
    update,
    remove,
};
