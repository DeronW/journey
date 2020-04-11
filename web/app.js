const express = require("express");
require("express-async-errors");
const bodyParser = require("body-parser");
const log4js = require("log4js");
const path = require("path");
const MAINLAND_BUNDARY = require("./fixtures/mainland");

const app = express();
const db = require("./db");
const POI = require("./poi");
const admin = require("./admin");
const aggregate = require("./aggregate");
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

app.get("/ping", (req, res) => res.send("pong"));

app.get("/", (req, res) => res.redirect("/toolkit"));

app.get("/toolkit", async (req, res) => {
    let upTime = Math.round((new Date() - UP_TIME) / (1000 * 60)),
        days = parseInt(upTime / 60 / 24),
        hours = parseInt(upTime % (60 * 24)),
        minutes = upTime % 60;

    let database = JSON.parse(JSON.stringify(db.DATABASE_CONFIG));
    database.connection = (await db.testConnection()) ? "success" : "failed";
    let initialization = await admin.querySetup();
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
    let { pois, totalCount } = await POI.list(pageNum, pageSize);
    pois.map((i) => {
        if (!i.source_type) delete i.source_type;
    });
    res.json({ code: 200, data: { pageNum, pageSize, totalCount, pois } });
});

app.post("/poi/create", async (req, res) => {
    let { source_id, source_type, tags, lat, lng } = req.body;
    if (!source_id || isNaN(lat) || isNaN(lng))
        return res.status(400).end("wrong params");

    try {
        let id = await POI.create(source_id, source_type, tags, lat, lng);
    } catch (e) {
        if (e.code == "23505")
            return res.status(409).end("source_id already exist");
    }
    res.json({ data: { source_id }, code: 200 });
});

app.post("/poi/delete", async (req, res) => {
    let { source_type, source_id } = req.query;
    await POI.remove(source_id, source_type);
    res.json({ code: 200 });
});

app.post("/poi/update", async (req, res) => {
    let { source_id, source_type, tags, lat, lng } = req.body;
    if (!source_id || isNaN(lat) || isNaN(lng))
        return res.status(400).end("wrong params");
    POI.update(source_id, source_type, tags, lat, lng);
    return res.json({ code: 200 });
});

app.get("/poi/info", async (req, res) => {
    let { source_type, source_id } = req.query;
    let poi = await POI.info(source_id, source_type);

    if (poi) {
        delete poi.source_type;
        res.json({ code: 200, data: poi });
    } else res.status(404).end(`source_id ${source_id} not exist`);
});

app.post("/admin/create-table", async (req, res) => {
    await admin.createTable();
    res.end();
});

app.post("/admin/import-china-bundary", async (req, res) => {
    await admin.importRegionBundary();
    res.end();
});

app.post("/admin/import-scennic-points", async (req, res) => {
    await admin.importScenicPoints();
    res.end();
});

app.post("/admin/reset-all", async (req, res) => {
    await admin.resetAll();
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
        filter = null,
        filterType = "and",
        orderBy = "startPoint",
        shrink = 1,
        debug = false,
    } = req.body;

    if (points.length == 0)
        return res.status(400).end("illegal: points should not be empty");
    if (pageNum < 1 || pageSize < 1)
        return res.status(400).end("illegal: pageNum & pageSize wrong");
    if (["auto", "polylineBuffer", "bundingCircle"].indexOf(mode) < 0)
        return res.status(400).end("illegal: wrong mode ");
    if (shrink > 1 || shrink < 0)
        return res.status(400).end("illegal: shrink should be > 0 and < 1");

    for (let i = 0; i < points.length; i++) {
        let { lat, lng } = points[i];
        if (isNaN(lat) || isNaN(lng))
            return res.status(400).end("wrong parameters");
    }

    let data = await aggregate.smartQuery({
        mode,
        points,
        distance,
        pageNum,
        pageSize,
        filter,
        filterType,
        orderBy,
        shrink,
        debug,
    });

    res.json({ code: 200, data });
});

app.listen(3000, "0.0.0.0", () => {
    logger.info(`Server started 0.0.0.0:3000`);
});
