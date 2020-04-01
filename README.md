# tortuous

### Dev FAQ

PostGIS Docker: https://hub.docker.com/r/postgis/postgis

### Env tools

Docker: 19.03.5

### 数据库设计

Points 表

| 字段名      | 类型     | 用途               |
| ----------- | -------- | ------------------ |
| id          | 自增主键 |                    |
| source_id   | int      | 外部库主键         |
| source_type | varchar  | 外部库主键对应类型 |
| tag         | jsonb    | 标签，用于过滤使用 |
| laitude     | float    | 纬度               |
| longitude   | float    | 经度               |
| created_at  | time     | 创建时间           |
| updated_at  | time     | 更新时间           |

Bundary 表

| 字段名   | 类型     | 用途 |
| -------- | -------- | ---- |
| id       | 自增主键 |      |
| name     | string   | 名称 |
| location | polygno  | 范围 |

### 接口文档

统一说明

POST 请求类型均为 json 数据格式，需要添加 Content-Type: application/json 格式的 header

#### 获取路线附近的点

    POST /aggregate

参数

```json
{
    "radius": "", // meters
    "points": [
        { "lat": 10, "lng": 20 },
        { "lat": 20, "lng": 30 },
        { "lat": 30, "lng": 40 }
    ],
    "filter": {
        "tag_1": "",
        "tag_2": ""
    }
}
```

返回

```json
{ "code": 0, "errmsg": "", "data": ["point_id..."] }
```

#### 删除一个点

    POST /:id/delete

参数

point id

返回

```json
{ "code": 0, "errmsg": "", "data": null }
```

#### 更新一个点

    POST /:id/update

参数

point id，点的 id；data，Point 信息

返回

```json
{ "code": 0, "errmsg": "", "data": null }
```

##### 创建一个点

    POST /create

参数

```json
{
    "source_id": 0,
    "source_type": "new",
    "tag": {
        "price": 2
    },
    "point": {
        "lat": 1,
        "lng": 1
    }
}
```

返回

```json
{ "code": 0, "errmsg": "", "data": { "point_id": 123 } }
```

##### 所有的列表

    GET /list

参数

pageSize=1000page=1

返回

```json
{ "pageNum": 1, "pageSize": 1000, "points": "<Point 信息列表>", "totalPage": 3 }
```

##### 查询某一个点

GET /:id

参数

    id

返回

```json
< Point 信息>
```

备注，Point 信息见下面数据格式说明

```json
{
    "source_id": 1,
    "source_type": "xxx",
    "tag": {
        "level": "AAAA",
        "avarage_price": 200,
        "type": "nature"
    },
    "latitude": 39.1234,
    "longitude": 120.1234,
    "created_at": 1581234567,
    "updated_at": 1582134567
}
```

### 算法说明

TODO：complete detail

### 注意事项

1. 本服务不包含权限认证功能

### 安装说明

TODO

### Task List

-   [x] PostGIS
    -   [x] Setup & Table initialize
    -   [x] Polygon query
    -   [x] Fixtures import, China boundary & Points
-   [x] API
    -   [x] aggragate
    -   [x] list
    -   [x] create
    -   [x] read
    -   [x] update
    -   [x] delete
    -   [x] logging
-   [ ] Operation
    -   [x] Docker Compose
    -   [x] Docker Startup
    -   [x] Deployment Shell
    -   [x] Scale Up
-   [ ] Dashboard
    -   [x] map preview
    -   [ ] point CRUD
    -   [ ] upload CSV
-   [ ] Test
    -   [ ] unit test
    -   [ ] performance test

### 开发计划

| 时间        | 目标           | 交付内容           | 备注 |
| ----------- | -------------- | ------------------ | ---- |
| 03 月 20 日 | 沟通阶段       | 需求文档           |      |
| 03 月 23 日 | 开发阶段（一） | 检索数据功能       |      |
| 03 月 29 日 | 开发阶段（二） | 接口功能+后台      |      |
| 04 月 05 日 | 测试+文档      | 性能测试、说明文档 |      |
| 04 月 09 日 | 改进           | 需求调整和完善     | 预留 |
| 04 月 15 日 | 交付           |                    |

交付内容

-   [ ] 全部源码
-   [ ] 测试结果
-   [ ] 安装说明文档
-   [ ] 项目人工交接

### Reference

GIS type
https://postgis.net/docs/manual-3.0/using_postgis_dbmanagement.html#Geography_Basics

PostGIS ST\_\* functions
https://postgis.net/docs/manual-1.5/ch08.html

Core query function, ST_Buffer
https://postgis.net/docs/manual-1.5/ST_Buffer.html

大地坐标系 4326
http://epsg.io/4326

在线地图使用的坐标系 3857
http://epsg.io/3857 伪墨卡托投影

当前项目使用的坐标系
4326 GCS_WGS_1984  