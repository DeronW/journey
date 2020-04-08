const fs = require("fs");
const csv = require("fast-csv");
const xml2js = require("xml2js");

async function getProvincesBundary() {
    function compress(ring) {
        const LIMIT = 200;
        let points = ring.split(","),
            juncturePoint = points[0];
        points.pop(); // MUST drop the last point
        let step = Math.ceil(points.length / LIMIT);
        if (step > 1) border = points.filter((_, index) => index % step == 0);
        else border = points;
        border.push(juncturePoint);
        return border;
    }

    let content = await new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/fixtures/bundary.xml`, (err, data) =>
            err ? reject(err) : resolve(data)
        );
    });

    let provinces = [];
    let bundary = await xml2js.parseStringPromise(content);

    bundary.Country.province.forEach((p) => {
        let { code, name, rings } = p.$;
        if (rings) provinces.push({ code, name, rings: compress(rings) });
    });

    return provinces;
}

async function getRegionDict() {
    let rows = await new Promise(function (resolve, reject) {
        let rows = [];
        fs.createReadStream(`${__dirname}/fixtures/sun_region_info.csv`)
            .pipe(csv.parse({ headers: true }))
            .on("error", (error) => reject(error))
            .on("data", (row) => rows.push(row))
            .on("end", (rowCount) => {
                resolve(rows);
            });
    });

    let postcode = {};

    rows.forEach((i) => {
        postcode[i.area_code] = {
            city: i.area_name,
            province: i.province,
        };
    });
    return postcode;
}

async function getPOIs() {
    let region = await getRegionDict();
    let rows = await new Promise(function (resolve, reject) {
        let rows = [];
        fs.createReadStream(`${__dirname}/fixtures/points.csv`)
            .pipe(csv.parse({ headers: true }))
            .on("error", (error) => reject(error))
            .on("data", (row) => rows.push(row))
            .on("end", (rowCount) => {
                resolve(rows);
            });
    });

    rows = rows.map((i) => {
        let tags = {
            name: i.scenic_name,
        };
        let postcode = i.area_recall.split(",").pop();
        if (postcode) {
            let { city, province } = region[postcode];
            Object.assign(tags, { city, province });
        }

        return {
            source_id: parseInt(i.scenic_id),
            lat: parseFloat(i.lat),
            lng: parseFloat(i.lng),
            tags,
            tagsJSON: JSON.stringify(tags).replace(/'/g, "''"),
        };
    });

    rows = rows.filter((i) => !isNaN(i.lat) && !isNaN(i.lng));

    return rows;
}

function replacePointWithLatlng(poi) {
    let fix6 = (f) => parseInt(parseFloat(f) * 1000000) / 1000000;
    let t = poi.point.substr(6, poi.point.length - 6).split(" "),
        lat = fix6(t[1]),
        lng = fix6(t[0]);
    delete poi.point;
    poi.lat = lat;
    poi.lng = lng;
    return poi;
}

module.exports = {
    getProvincesBundary,
    getPOIs,
    replacePointWithLatlng,
};
