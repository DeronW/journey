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

app.get("/admin/create-table", async (req, res) => {
    await db.createTable();
    res.json({ code: 0 });
});

app.get("/admin/import-china-bundary", async (req, res) => {
    await db.importRegionBundary();
    res.json({ code: 0 });
});

app.get("/admin/import-scennic-points", async (req, res) => {
    await db.importScenicPoints();
    res.json({ code: 0 });
});

app.get("/admin/reset-all", async (req, res) => {
    await db.resetAll();
    res.json({ code: 0 });
});

app.get("/admin/bundary/china", (req, res) => {
    res.json({ code: 0, data: MAINLAND_BUNDARY });
});

app.post("/aggregate", async (req, res) => {
    let form = req.body,
        points = [];

    for (let i = 0; i < form.length; i++) {
        let { lat, lng, radius = 10 } = form[i];
        if (isNaN(lat) || isNaN(lng))
            return res.json({ code: 400, data, errmsg: "wrong points" });
        points.push({ lat, lng, radius });
    }

    if (points == null) return res.json({ code: 400, data: null, errmsg: "" });
    let exitedBorder = await db.isExitBorder(points);
    let { pois, polygon } = await db.queryPOIs(points);
    res.json({ code: 0, data: { exitedBorder, pois, polygon }, errmsg: "" });
});

app.listen(3000, "0.0.0.0", () => {
    logger.info(`Server started 0.0.0.0:3000`);
});
