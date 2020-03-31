const express = require("express");
require("express-async-errors");
const bodyParser = require("body-parser");
const log4js = require("log4js");
const path = require("path");
const MAINLAND_BUNDARY = require("./fixtures/mainland");

const app = express();
const db = require("./db");

const logger = require("./getlogger")("app");
const UP_TIME = new Date();

app.set("views", "./views");
app.set("view engine", "html");
app.engine("html", require("hbs").__express);
app.disable("view cache");
app.use("/static", express.static(path.join(__dirname, "static")));

app.use(bodyParser.json()); // for parsing application/json
app.use(
    log4js.connectLogger(logger, {
        level: "info",
        context: true,
        format: ":status :method :url"
    })
);

app.get("/ping", (req, res) => res.send("pong"));

app.get("/toolkit", async (req, res) => {
    let upTime = Math.round((new Date() - UP_TIME) / (1000 * 60));
    upTime = `${parseInt(upTime / 60)}h ${upTime % 60}m`;

    let database = db.DATABASE_CONFIG;
    database.connection = (await db.testConnection()) ? "success" : "failed";

    let initialization = await db.querySetup();
    res.render("index.hbs", {
        database,
        upTime,
        initialization
    });
});

app.get("/list", async (req, res) => {
    let { pageNum, pageSize } = req.query;
    pageSize = parseInt(pageSize) || 20;
    pageNum = parseInt(pageNum) || 0;
    let pois = await db.instance.many(`
    Select id, source_id, source_type, tag, ST_AsText(point) as point
    From POI Order By id Asc Offset ${pageNum * pageSize} Limit ${pageSize}
    `);
    let total = await db.instance.one("Select count(*) From POI");
    res.json({ pageNum, pageSize, totalCount: parseInt(total.count), pois });
});

app.post("/poi/create", async (req, res) => {
    let { source_id, source_type, tag, point } = req.body;
    let tagField = JSON.stringify(tag).replace(/'/g, "''");
    let ST_Point = `ST_GeomFromText('POINT(${point.lng} ${point.lat})', 4326)`;
    let { id } = await db.instance.one(`
    Insert Into POI (source_id, source_type, tag, point) Values (
        ${source_id}, '${source_type}', '${tagField}', ${ST_Point}
    ) Returning id`);

    res.json({ id });
});

app.get("/poi/:id/delete", async (req, res) => {
    let { id } = req.params;
    await db.instance.none(`Delete From POI Where id=${id}`);
    res.end();
});

app.post("/poi/:id/update", async (req, res) => {
    let { id } = req.params;
    let { source_id, source_type, tag, point } = req.body;
    let tagField = JSON.stringify(tag).replace(/'/g, "''");
    let ST_Point = `ST_GeomFromText('POINT(${point.lng} ${point.lat})', 4326)`;
    await db.instance.none(`
    Update POI Set
        source_id=${source_id},
        source_type='${source_type}',
        tag='${tagField}',
        point=${ST_Point}
    Where id=${id}`);
    return res.end();
});

app.get("/poi/:id", async (req, res) => {
    let { id } = req.params;
    let poi = await db.instance.one(
        `Select *, ST_AsText(point) as plain_point From POI Where id=${id}`
    );
    res.json(poi);
});

app.get("/admin/create-table", async (req, res) => {
    await db.createTable();
    res.end();
});

app.get("/admin/import-china-bundary", async (req, res) => {
    await db.importRegionBundary();
    res.end();
});

app.get("/admin/import-scennic-points", async (req, res) => {
    await db.importScenicPoints();
    res.end();
});

app.get("/admin/reset-all", async (req, res) => {
    await db.resetAll();
    res.end();
});

app.get("/admin/bundary/china", (req, res) => {
    res.json(MAINLAND_BUNDARY);
});

app.post("/aggregate", async (req, res) => {
    let form = req.body,
        points = [];

    for (let i = 0; i < form.length; i++) {
        let { lat, lng, radius = 10 } = form[i];
        if (isNaN(lat) || isNaN(lng))
            return res.json({ code: 400, errmsg: "wrong points" });
        points.push({ lat, lng, radius });
    }

    if (points == null) return res.json({ code: 400, errmsg: "" });
    let exitedBorder = await db.isExitBorder(points);
    let { pois, polygon } = await db.queryPOIs(points);
    res.json({ exitedBorder, pois, polygon });
});

app.listen(3000, "0.0.0.0", () => {
    logger.info(`Server started 0.0.0.0:3000`);
});
