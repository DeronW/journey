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
        initialization
    });
});

app.get("/list", async (req, res) => {
    let { pageNum, pageSize } = req.query;
    let pois = await db.POI.list(pageNum, pageSize);
    let total = await POI.count();
    res.json({ pageNum, pageSize, totalCount: parseInt(total.count), pois });
});

app.post("/poi/create", async (req, res) => {
    let { source_id, source_type, tag, point } = req.body;
    let id = await db.POI.create(source_id, source_type, tag, point);
    res.json({ id });
});

app.get("/poi/:id/delete", async (req, res) => {
    await db.POI.delete(req.params.id);
    res.end();
});

app.post("/poi/:id/update", async (req, res) => {
    let { source_id, source_type, tag, point } = req.body;
    db.POI.update(source_id, source_type, tag, point);
    return res.end();
});

app.get("/poi/:id", async (req, res) => {
    let poi = await db.POI.info(req.params.id);
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
    let {
        distance = 10000,
        points = [],
        pageNum = 1,
        pageSize = 20
    } = req.body;

    if (points.lenght == 0)
        return res.status(400).end("point should not be empty");
    if (pageNum < 1 || pageSize < 1)
        return res.status(400).end("pageNum & pageSize wrong");
    for (let i = 0; i < points.length; i++) {
        let { lat, lng } = points[i];
        if (isNaN(lat) || isNaN(lng))
            return res.status(400).end("wrong parameters");
    }

    let exitedBorder = await db.isExitBorder(points);
    let { pois, polygon } = await db.queryPOIs(
        points,
        distance,
        pageNum,
        pageSize
    );
    res.json({ exitedBorder, pois, polygon });
});

app.listen(3000, "0.0.0.0", () => {
    logger.info(`Server started 0.0.0.0:3000`);
});
