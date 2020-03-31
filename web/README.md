### for test

docker run --name gis -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -d postgis/postgis:11-3.0-alpine

### bulid docker

```shell

cd web
set tag 0.1
docker build --tag tortuous .
docker tag tortuous delongw/tortuous:$tag
docker push delongw/tortuous:$tag

```

### test

curl --header "Content-Type: application/json" --request POST --data '[ { "lat": 30, "lng": 120 }, { "lat": 33, "lng": 100 } ]' http://localhost:3000/aggregate
