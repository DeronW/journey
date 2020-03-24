let {
    POSTGIS_HOST = "postgis",
    POSTGIS_PORT = 5432,
    POSTGIS_USER = "postgres",
    POSTGIS_PASSWORD = "mysecretpassword",
    POSTGIS_DATABASE = "postgres"
} = process.env;

POSTGIS_HOST = "localhost";
POSTGIS_PASSWORD = "mysecretpassword";

module.exports = {
    POSTGIS_HOST,
    POSTGIS_PORT,
    POSTGIS_USER,
    POSTGIS_PASSWORD,
    POSTGIS_DATABASE
};
