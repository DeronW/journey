const express = require("express");
const bodyParser = require("body-parser");
const log4js = require("log4js");
const path = require("path");

const app = express();
const db = require("./db");

log4js.configure({
    appenders: { console: { type: "console" } },
    categories: { default: { appenders: ["console"], level: "info" } }
});

const logger = log4js.getLogger("app");
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
    await db.importChinaBundary();
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

app.post("/aggregate", async (req, res) => {
    console.log(req.body);
    let data = {},
        errmsg = "";
    let form = req.body,
        points;

    for (let i = 0; i < points.length; i++) {
        let p = points[i];
        if (isNaN(p.lat) || isNaN(p.lng))
            return res.json({ code: 400, data, errmsg: "wrong points" });
        points.push({ latitude: p.lat, lng: p.longitude, radius: p.radius || 10 });
    }

    db.isExitBorder(points);

    res.json({ code: 0, data, errmsg });
});

const PORT = 3000;
app.listen(PORT);
logger.info(`Server started :${PORT}`);
