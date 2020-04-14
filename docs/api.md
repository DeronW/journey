# 接口文档

## 统一说明

字符集：UTF-8

POST 请求类型均为 json 数据格式，需要添加在请求中添加 header 字段：

    Content-Type: application/json

`POI` 对象数据格式说明，下文中使用 `{POI}` 来表示该对象

```json
{
    "source_id": 1, // int类型
    "tags": {
        // JSON类型
        "level": "AAAA",
        "avarage_price": 200,
        "type": "nature"
    },
    "lat": 39.1234, // float类型
    "lng": 120.1234 // float类型
}
```

POI 对象字段说明

| 字段      | 类型  | 必填 | 默认值 | 说明       |
| --------- | ----- | ---- | ------ | ---------- |
| source_id | int   | 是   |        | 源数据 id  |
| lat       | float | 是   |        | 纬度       |
| lng       | float | 是   |        | 经度       |
| tags      | JSON  | 否   | {}     | POI 的标签 |

tags：**只支持一级深度**，用来保存景点的外部信息，查询时会如实返回 tags 内所有内容，同时支持 tags 的按全等匹配条件查询

`Point`对象数据格式说明

```json
{
    "lat": 1,
    "lng": 1
}
```

Point 对象字段说明

| 字段 | 类型  | 说明 |
| ---- | ----- | ---- |
| lat  | float | 纬度 |
| lng  | float | 经度 |

## 服务器可用性探测接口

用途：服务运行状态监控点

请求

    GET /ping

返回

    pong

## POI 管理接口

### POI 列表

请求

    GET /poi/list?pageNum=1&pageSize=2

URL 参数

| 字段    | 类型 | 必填 | 默认 | 说明              |
| ------- | ---- | ---- | ---- | ----------------- |
| pageNum | int  | 否   | 1    | 第几页，从 1 开始 |
| pageSize | int  | 否   | 1000 | 每页多少条数据    |

返回

```json
{
    "code": 200,
    "data": {
        "pageNum": 1,
        "pageSize": 2,
        "totalCount": 17176,
        "points": ["{POI}", "{POI}"]
    }
}
```

请求实例

```shell
curl "http://localhost:3000/poi/list?pageNum=1&pageSize=2"

#=> {"code":200,"data":{"pageNum":0,"pageSize":2,"totalCount":17172,"pois":[{"source_id":1,"tags":{"city":"丁青县","name":"孜珠寺","province":"西藏自治区"},"lat":95.859511,"lng":31.240949},{"source_id":2,"tags":{"city":"八宿县","name":"仁龙坝冰川","province":"西藏自治区"},"lat":29.288548,"lng":96.929896}]}}
```

### 创建一个点

请求

    POST /poi/create

Body 参数

    {POI对象}

返回

```json
{
    "data": { "source_id": 17173 },
    "code": 200
}
// 返回新创建的POI的id
```

失败情况：source_id 具有唯一约束，如果重复创建会导致失败。失败时会返回 HTTP Status Code：409

示例

```shell
curl -X POST "http://localhost:3000/poi/create" -H "Content-Type: application/json" --data '{"source_id": -1, "lat": 1, "lng": 1}'

#=> {"data":{"source_id":-1},"code":200}
```

### 查询某一个点

请求

    GET /poi/info?source_id=1

URL 参数

| 字段      | 类型 | 必填 | 默认 | 说明      |
| --------- | ---- | ---- | ---- | --------- |
| source_id | int  | 是   |      | 源数据 id |

返回

```json
{
    "code": 200,
    "data": {
        "source_id": 2,
        "tags": {
            "city": "八宿县",
            "name": "仁龙坝冰川",
            "province": "西藏自治区"
        },
        "lat": 29.288548,
        "lng": 96.929896
    }
}
```

失败情况：source_id 不存在时会导致失败。失败时会返回 HTTP Status Code：404

示例：

```shell
curl "http://localhost:3000/poi/info?source_id=2"
# {"code":200,"data":{"source_id":2,"tags":{"city":"八宿县","name":"仁龙坝冰川","province":"西藏自治区"},"lat":29.288548,"lng":96.929896}}
```

```shell
curl "http://localhost:3000/poi/info?source_id=-2"
#=> source_id -2 not exist
```

### 更新一个点

请求

    POST /poi/update

Body 参数

    {POI对象}

返回

```json
{ "code": 200 }
```

**注意**：如果更新时 POI 不存在，则会创建一个新的

示例

```shell
curl -X POST "http://localhost:3000/poi/update" -H "Content-Type: application/json" --data '{"source_id": -1, "lat": 1, "lng": 1}'
#=> {"code":200}
```

### 删除一个点

请求

    POST /poi/delete?source_id=1

URL 参数

| 字段      | 类型 | 必填 | 默认 | 说明      |
| --------- | ---- | ---- | ---- | --------- |
| source_id | int  | 是   |      | 源数据 id |

返回

```json
{ "code": 200 }
```

示例

```shell
curl -X POST "http://localhost:3000/poi/delete?source_id=1"
# {"code":200}
```

## 业务接口

核心业务只有这一个借口，获取路线附近的点

请求

    POST /aggregate

参数

```json
{
    "points": [
        { "lat": 31, "lng": 121 },
        { "lat": 26, "lng": 120 }
    ],
    "distance": 10000,
    "pageSize": 2,
    "pageNum": 1,
    "filter": {
        "rank": 0,
        "city": "北京"
    }
}
```

参数说明

| 字段       | 类型           | 必填 | 默认值           | 说明            |
| ---------- | -------------- | ---- | ---------------- | --------------- |
| points     | [{Point}] 数组 | 是   |                  |                 |
| pageNum    | int            | 否   | 1                |                 |
| pageSize   | int            | 否   | 1000             |                 |
| distance   | int            | 否   | 10000            | 单位：米        |
| mode       | string         | 否   | "polylineBuffer" | 枚举类型        |
| filter     | JSON           | 否   |                  | 过滤标签使用    |
| filterType | string         | 否   | "and"            | or 或 and       |
| shrink     | float          | 否   | 1                | 0 < shrink <= 1 |
| debug      | boolean        | 否   | false            | 测试使用        |

详细说明：

-   points：起点、终点坐标，数组中每个元素都是{Point}对象
-   pageNum：结果分页中的页数
-   pageSize：结果分页中每页的结果数量
-   distance：路径附近景点的搜索距离
-   mode：图形检索模式， polylineBuffer/bundingCircle ，默认为polylineBuffer
-   filter：用于过滤标签，只选择完全等于标签的景点对象，可选参数，默认 {}
-   filterType: 标记 filter 的检索关系，只有两种类型 or 或者 and，默认是 and
-   shrink: 曲线型缩放比例，必须大于 0，并且小于或等于 1，比例参照物是起点和终点的距离
-   debug: 返回更多调试信息，可选参数，默认值 false

**注意**：打开 debug 后会导致接口性能下降 2 倍

#### 标签过滤说明

通过 filter 和 filterType 的组合来实现标签的过滤。标签是创建 POI 时的 tags 参数，这是一个只有一级深度的 JSON 结构。过滤时通过 filter 与 tags 内容匹配，过滤出要查询的 POI。

举例说明

tags 中的内容

```json
{
    "人文": true,
    "历史": true,
    "风景": true
}
```

参数

```json
{
    "filter": {
        "人文": true,
        "购物": true
    },
    "filterType": "and"
}
```

结果，没有匹配到测试内容

参数

```json
{
    "filter": {
        "人文": true,
        "购物": true
    },
    "filterType": "or"
}
```

结果，可以匹配到测试内容

示例

```shell
curl -X POST "http://localhost:3000/aggregate" -H "Content-Type: application/json" --data '{"pageSize": 2,"points": [{"lat": 30, "lng": 120}, {"lat": 29, "lng": 115}], "filter": {"name": "桐洲岛"}}'
#=> {"code":200,"data":{"pageNum":1,"pageSize":2,"pois":[{"source_id":3311,"tags":{"city":"杭州市","name":"桐洲岛","province":"浙江省"},"lat":29.8899,"lng":119.811962}],"totalCount":1}}
```

### POI 检索方法

目前支持 2 种检索方式，一种是矩形检索，一种是椭圆形检索。分别需要两种参数组合

#### 矩形检索

`mode` 参数为 polylineBuffer 时，将坐标点连线，然后在线的两侧各扩展`distance` 参数距离，成为一个矩形，然后搜索矩形内部的 POI

**注意**：此时 `shrink` 参数无效

参数

```json
{
    "points": [
        { "lat": 31, "lng": 121 },
        { "lat": 26, "lng": 120 }
    ],
    "mode": "polylineBuffer",
    "distance": 10000
}
```

示例

```shell
curl -X POST "http://localhost:3000/aggregate" -H "Content-Type: application/json" --data '{"pageSize": 2,"points": [{"lat": 30, "lng": 120}, {"lat": 29, "lng": 115}]}'
#=> {"code":200,"data":{"pageNum":1,"pageSize":2,"pois":[{"source_id":3236,"tags":{"city":"杭州市","name":"龙门古镇","province":"浙江省"},"lat":29.907164,"lng":119.958125},{"source_id":3311,"tags":{"city":"杭州市","name":"桐洲岛","province":"浙江省"},"lat":29.8899,"lng":119.811962}],"totalCount":35}}
```

#### 曲线型检索

`mode` 参数为 bundingCircle 时，将坐标点连线，然后以线为直径，形成圆形，再根据`shrink` 参数，对圆形进行变形，然后搜索曲线内部的 POI

**注意**：此时 `distance` 参数无效

参数

```json
{
    "points": [
        { "lat": 31, "lng": 121 },
        { "lat": 26, "lng": 120 }
    ],
    "mode": "bundingCircle",
    "shrink": 0.5
}
```

```shell
curl -X POST "http://localhost:3000/aggregate" -H "Content-Type: application/json" --data '{"pageSize": 2,"points": [{"lat": 30, "lng": 120}, {"lat": 29, "lng": 115}], "mode": "bundingCircle", "shrink": 0.5}'
#=> {"code":200,"data":{"pageNum":1,"pageSize":2,"pois":[{"source_id":3225,"tags":{"city":"杭州市","name":"千岛湖景区","province":"浙江省"},"lat":29.593886,"lng":119.032091},{"source_id":3236,"tags":{"city":"杭州市","name":"龙门古镇","province":"浙江省"},"lat":29.907164,"lng":119.958125}],"totalCount":1158}}
```

### 带 Debug 参数

请求参数

```json
{
    "points": [
        { "lat": 30, "lng": 120 },
        { "lat": 29, "lng": 115 }
    ],
    "debug": true
}
```

```shell
curl -X POST "http://localhost:3000/aggregate" -H "Content-Type: application/json" --data '{"pageSize": 2,"points": [{"lat": 30, "lng": 120}, {"lat": 29, "lng": 115}], "debug": true}'
```

返回

```json
{
    "code": 200,
    "data": {
        "pageNum": 1,
        "pageSize": 2,
        "pois": [
            {
                "source_id": 3236,
                "tags": {
                    "city": "杭州市",
                    "name": "龙门古镇",
                    "province": "浙江省"
                },
                "lat": 29.907164,
                "lng": 119.958125
            },
            {
                "source_id": 3311,
                "tags": {
                    "city": "杭州市",
                    "name": "桐洲岛",
                    "province": "浙江省"
                },
                "lat": 29.8899,
                "lng": 119.811962
            }
        ],
        "totalCount": 35,
        "debug": {
            "polygon": "POLYGON((115.024974845894 28.9124963209261,114.974978660288 29.0874959067086,119.979108677148 30.0883018216075,120.020861072393 29.9116963793449,115.024974845894 28.9124963209261))",
            "transboundary": {
                "line": false,
                "point0": false,
                "point1": false
            },
            "duration": "106ms"
        }
    }
}
```

## Admin 管理类接口

略，这部分接口用于开发使用，不需要暴露
