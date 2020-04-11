# Tortuous

Search POIs contained in a buffered polygon constitute from serial of input points

Use World Geodetic System 1984(GSP) http://epsg.io/4326

### Install

Install Docker & Docker-Compose on your OS, make sure port 3000 and 5432 area not occupied.
Clone this repository, and then just run:

```shell
docker-compose up
```

Done! Congratulations, you can use it now.

If you want to run is daemon, try this:

```shell
# cd into your project path
# start
docker-compose -p poi up -d

# and stop
docker-compose stop
```

### Usage

Open your browser and address http://localhost:3000/toolkit
