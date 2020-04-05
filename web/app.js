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
        format: ":status :method :url",
    })
);

app.use(function (err, req, res, next) {
    logger.error(err.stack);
    res.status(500).send("Something broke!");
});

app.get("/ping", (req, res) => res.send("pong"));

app.get("/toolkit", async (req, res) => {
    let upTime = Math.round((new Date() - UP_TIME) / (1000 * 60)),
        days = parseInt(upTime / 60 / 24),
        hours = parseInt(upTime % (60 * 24)),
        minutes = upTime % 60;

    let database = JSON.parse(JSON.stringify(db.DATABASE_CONFIG));
    database.connection = (await db.testConnection()) ? "success" : "failed";
    let initialization = await db.querySetup();
    res.render("index.hbs", {
        database,
        upTime: `${days}d ${hours}h ${minutes}m`,
        initialization,
    });
});

app.get("/poi/list", async (req, res) => {
    let { pageNum, pageSize } = req.query;
    pageSize = parseInt(pageSize) || 20;
    pageNum = (parseInt(pageNum) || 1) - 1;
    let { pois, totalCount } = await db.POI.list(pageNum, pageSize);
    res.json({ pageNum, pageSize, totalCount, pois });
});

app.post("/poi/create", async (req, res) => {
    let { source_id, source_type, tag, lat, lng } = req.body;
    if (!source_id || isNaN(lat) || isNaN(lng))
        return res.status(400).end("wrong params");
    let id = await db.POI.create(source_id, source_type, tag, lat, lng);
    res.json({ id });
});

app.post("/poi/:id/delete", async (req, res) => {
    await db.POI.delete(req.params.id);
    res.end();
});

app.post("/poi/:id/update", async (req, res) => {
    let { source_id, source_type, tag, lat, lng } = req.body;
    if (!source_id || isNaN(lat) || isNaN(lng))
        return res.status(400).end("wrong params");
    db.POI.update(req.params.id, source_id, source_type, tag, lat, lng);
    return res.end();
});

app.get("/poi/:id", async (req, res) => {
    let poi = await db.POI.info(req.params.id);
    if (poi) res.json(poi);
    else res.status(404).end();
});

app.post("/admin/create-table", async (req, res) => {
    await db.createTable();
    res.end();
});

app.post("/admin/import-china-bundary", async (req, res) => {
    await db.importRegionBundary();
    res.end();
});

app.post("/admin/import-scennic-points", async (req, res) => {
    await db.importScenicPoints();
    res.end();
});

app.post("/admin/reset-all", async (req, res) => {
    await db.resetAll();
    res.end();
});

app.get("/admin/bundary/china", (req, res) => {
    res.json(MAINLAND_BUNDARY);
});

app.post("/aggregate", async (req, res) => {
    let {
            distance = 10000,
            points = [],
            pageNum = 1,
            pageSize = 1000,
            mode = "auto",
            debug = false,
        } = req.body,
        startAt = new Date().getTime();

    if (points.length == 0)
        return res.status(400).end("point should not be empty");
    if (pageNum < 1 || pageSize < 1)
        return res.status(400).end("pageNum & pageSize wrong");

    for (let i = 0; i < points.length; i++) {
        let { lat, lng } = points[i];
        if (isNaN(lat) || isNaN(lng))
            return res.status(400).end("wrong parameters");
    }

    if (mode == "auto") mode = "polylineBuffer";
    let result;
    if (mode == "polylineBuffer") {
        result = await db.queryPOIsWithPolylineBuffer(
            points,
            distance,
            pageNum,
            pageSize,
            debug
        );
    } else if (mode == "bundingCircle") {
        result = await db.queryPOIsWithBoundingCircle(
            points,
            pageNum,
            pageSize,
            debug
        );
    } else return res.status(400).end("wrong mode parameter");
    let { pois, polygon, totalCount } = result;
    let data = { pageSize, pageSize, pois, totalCount };
    if (debug)
        data.debug = {
            polygon,
            transboundary: await db.isTransboundary(points),
            duration: new Date().getTime() - startAt + "ms",
        };
    res.json(data);
});

app.listen(3000, "0.0.0.0", () => {
    logger.info(`Server started 0.0.0.0:3000`);
});
