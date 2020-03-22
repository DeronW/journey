const express = require("express");
const bodyParser = require("body-parser");
const log4js = require("log4js");

const CONFIG = require("./config");
const app = express();
// const db = require("./db");

log4js.configure({
    appenders: { console: { type: "console" } },
    categories: { default: { appenders: ["console"], level: "info" } }
});

const logger = log4js.getLogger("app");

app.use(bodyParser.json()); // for parsing application/json
app.use(log4js.connectLogger(logger));

app.get("/", function(req, res) {
    res.send(`OK, ${new Date()}`);
});

app.listen(3000);
logger.info("Server started");
