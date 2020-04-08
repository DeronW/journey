const { one, none, many, isNoData } = require("./db");
const utils = require("./utils");

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
    return one(sql);
}

function assembleSqlStatements({
    mode,
    points,
    distance,
    pageNum,
    pageSize,
    filter,
    filterType,
    shrink,
}) {
    let line = points.map((i) => `${i.lng} ${i.lat}`).join(","),
        offset = (pageNum - 1) * pageSize;

    if (mode == "polylineBuffer") {
        // https://postgis.net/docs/ST_Buffer.html
        // distance, unit: kilometer
        polygon = `
        Select ST_Buffer( 
            ST_GeomFromText('LINESTRING(${line})', 4326)::geography, 
            ${distance}, 
            'endcap=flat join=mitre mitre_limit=1.0'
        )::geometry as polygon`;
    } else if (mode == "bundingCircle" && shrink == 1) {
        polygon = `
        Select ST_MinimumBoundingCircle( 
            ST_Collect(ST_GeomFromText('LINESTRING(${line})', 4326)), 4 
        ) as polygon`;
    } else if (mode == "bundingCircle" && shrink != 1) {
        let p1 = points[0],
            p2 = points[points.length - 1],
            radians = -Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat);
        polygon = `
            Select 
                ST_Rotate(
                    ST_Translate(
                        ST_Scale(circle, ${shrink}, 1),
                        ST_X(center) * ${1 - shrink}, 0
                    ),
                    ${radians},
                    center
                ) as polygon
            From (
                Select circle, ST_Centroid(circle) as center
                From (
                    Select ST_MinimumBoundingCircle( 
                        ST_Collect(
                            ST_GeomFromText('LINESTRING(${line})', 4326)), 
                            4 
                    ) as circle
                ) as tbl
            ) as tbl2
            `;
    } else {
        throw TypeError(`mode must be 'polylineBuffer' or 'bundingCircle'`);
    }

    let tagsCnd = convertFilterToConditions(filter, filterType);

    let querySql = `
    Select 
        source_id, tags, 
        ST_AsText(point) as point,
        count(*) OVER() AS total_count 
    From (
        Select *, ST_Contains(polygon, point) 
        From POI, (${polygon}) as polygon ) as tbl
    Where tbl.st_contains = true And ${tagsCnd}
    Order By id Asc
    Offset ${offset}
    Limit ${pageSize}`;

    let countSql = `
    Select count(*) 
    From (
        Select ST_Contains(polygon, point) 
        From POI, (${polygon}) as polygon 
        Where ${tagsCnd}) as tbl
    Where tbl.st_contains = true
    `;

    let polygonSql = `Select ST_AsText(polygon) as polygon From (${polygon}) as tbl`;

    return {
        querySql,
        countSql,
        polygonSql,
    };
}

async function smartQuery({
    mode,
    points,
    distance,
    pageNum,
    pageSize,
    filter,
    filterType,
    shrink,
    debug,
}) {
    let startAt = new Date().getTime();

    if (mode == "auto") mode = "polylineBuffer";

    let { polygonSql, querySql, countSql } = assembleSqlStatements({
        mode,
        points,
        distance,
        pageNum,
        pageSize,
        filter,
        filterType,
        shrink,
    });

    let { pois, totalCount } = await many(querySql)
        .then((points) => {
            let totalCount = parseInt(points[0].total_count);
            points = points.map((i) => {
                delete i.total_count;
                return utils.replacePointWithLatlng(i);
            });
            return { pois: points, totalCount };
        })
        .catch(async (err) => {
            if (isNoData(err)) {
                let totalCount = await one(countSql).then((r) =>
                    parseInt(r.count)
                );
                return { pois: [], totalCount };
            } else throw err;
        });
    let data = { pageNum, pageSize, pois, totalCount };

    if (debug) {
        data.debug = {
            polygon: await one(polygonSql).then((r) => r.polygon),
            transboundary: await isTransboundary(points),
            duration: new Date().getTime() - startAt + "ms",
        };
    }

    return data;
}

module.exports = {
    smartQuery,
};