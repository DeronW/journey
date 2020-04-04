# Web Server

### dev

Running PostGIS indenpendently

docker run --name gis -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -d postgis/postgis:11-3.0-alpine

### bulid docker

```shell

cd web
set tag 0.2
docker build --tag tortuous .
docker tag tortuous delongw/tortuous:$tag
docker push delongw/tortuous:$tag

```
