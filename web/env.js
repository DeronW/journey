let {
    POSTGRES_HOST = "postgis",
    POSTGRES_PORT = 5432,
    POSTGRES_USER = "postgres",
    POSTGRES_PASSWORD = "mysecretpassword",
    POSTGRES_DB = "postgres"
} = process.env;

module.exports = {
    POSTGIS: {
        HOST: POSTGRES_HOST,
        PORT: POSTGRES_PORT,
        DATABASE: POSTGRES_DB,
        USER: POSTGRES_USER,
        PASSWORD: POSTGRES_PASSWORD
    }
};
