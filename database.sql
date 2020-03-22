-- 创建数据库的初始命令


create table china
(
    id serial primary key,
    location geography(point, 4326) 
)

insert into china location values( ST_GeographyFromText('SRID=4326; POINT()'))