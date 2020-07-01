# Web Server

### dev

Running PostGIS indenpendently

docker run --name gis -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -d postgis/postgis:11-3.0-alpine

### bulid docker and upload to hub

```shell

cd web
set tag 1.0
docker build --tag journey .
docker tag journey delongw/journey:$tag
docker push delongw/journey:$tag

```

### Save Docker Image to local

https://docs.docker.com/engine/reference/commandline/image_save/

```shell
set tag 1.0
docker save -o ~/Downloads/image.$tag.tar delongw/journey:$tag
```