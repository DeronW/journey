# 接口文档

## 统一说明

    POST 请求类型均为 json 数据格式，需要添加在请求中添加 header 字段：Content-Type: application/json

`POI` 对象数据格式说明，下文中使用 `{POI}` 来表示该对象

```json
{
    "source_id": 1, // int类型
    "source_type": "xxx", // string类型
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

## POI 管理接口

### POI 列表

请求

    GET /poi/list?pageNum=1&pageSize=2

URL 参数

    * pageNum：获取第几页内容
    * pageSize：每页多少个元素

返回

```json
{
    "pageNum": 1,
    "pageSize": 2,
    "totalCount": 17176,
    "points": ["{POI}"]
}
```

示例

```shell
curl "http://localhost:3000/poi/list?pageNum=1&pageSize=2"

# {"pageNum":0,"pageSize":2,"totalCount":17176,"pois":[{"id":2,"source_id":2,"source_type":null,"tags":{"name":"仁龙坝冰川","rank":0,"name_en":"renlongba"},"lat":29.288548,"lng":96.929896},{"id":3,"source_id":3,"source_type":null,"tags":{"name":"格聂之眼","rank":0,"name_en":"niegezhiyan"},"lat":29.80845,"lng":99.605095}]}
```

### 查询某一个点

请求

    GET /poi/:id

参数

    id：POI的id

返回

```json
{
    "id": 2,
    "source_id": 2,
    "source_type": null,
    "tags": { "name": "仁龙坝冰川", "rank": 0, "name_en": "renlongba" },
    "updated_at": "2020-03-31T03:55:18.760Z",
    "lat": 29.288548,
    "lng": 96.929896
}
```

示例：

```shell
curl "http://localhost:3000/poi/2"
# {"id":2,"source_id":2,"source_type":null,"tags":{"name":"仁龙坝冰川","rank":0,"name_en":"renlongba"},"updated_at":"2020-03-31T03:55:18.760Z","lat":29.288548,"lng":96.929896}
```

#### 删除一个点

请求

    POST /poi/:id/delete

URL 参数

-   id：POI 的 id（注意，不是 source_id）

返回：无

示例

```shell
curl -X POST "http://localhost:3000/poi/2/delete"
```

#### 更新一个点

请求

    POST /poi/:id/update

URL 参数

-   id：POI 的 id（注意，不是 source_id）

Body 参数

-   {POI}

返回：无

示例

```shell
curl -X POST "http://localhost:3000/poi/2/update" -H "Content-Type: application/json" --data '{"source_id": -1, "lat": 1, "lng": 1}'
```

##### 创建一个点

请求

    POST /poi/create

Body 参数

    {POI}

返回

```json
{ "id": 1 }
// 返回新创建的POI的id
```

示例

```shell
curl -X POST "http://localhost:3000/poi/create" -H "Content-Type: application/json" --data '{"source_id": -1, "lat": 1, "lng": 1}'
```

### Admin 管理类接口

略，这部分接口用于开发使用，不需要暴露

## 业务接口

获取路线附近的点

请求

    POST /aggregate

参数

```json
{
    "points": [
        { "lat": 30, "lng": 120 },
        { "lat": 31, "lng": 121 },
        { "lat": 26, "lng": 120 }
    ],
    "distance": 10000,
    "pageSize": 4,
    "pageNum": 1
}
```

参数说明

-   points：途经点坐标，数组类型每组数据必须包含 lat 和 lng 参数，必选参数
-   pageNum：结果分页中的页数，可选参数，默认 1
-   pageSize：结果分页中每页的结果数量，可选参数，默认 1000
-   distance：路径附近景点的搜索距离，可选参数，默认值 10000，单位米
-   mode：图形检索模式，可选参数，枚举类型 polylineBuffer/bundingCircle，默认 auto
-   filter：用于过滤标签，只选择完全等于标签的景点对象，可选参数，默认 {}
-   debug: 返回更多调试信息，可选参数，默认值 false，注意：打开后会导致接口效率下降 1.5 倍左右

返回

```json
{
    "pois": [
        // 路径周边在「distance」范围内的景点
        {
            "source_id": 256,
            "tags": {
                "name": "枫泾古镇",
                "rank": 0,
                "name_en": "Fengjing Ancient Town"
            },
            "lat": 30.892765,
            "lng": 121.022922
        },
        {
            "source_id": 323,
            "tags": {
                "name": "练塘古镇",
                "rank": 0,
                "name_en": "Liantang Ancient Town"
            },
            "lat": 31.013573,
            "lng": 121.051569
        },
        {
            "source_id": 330,
            "tags": {
                "name": "寻梦园",
                "rank": 0,
                "name_en": "Dream Garden Herb Farm"
            },
            "lat": 31.047305,
            "lng": 121.096738
        },
        {
            "source_id": 338,
            "tags": {
                "name": "金泽古镇",
                "rank": 0,
                "name_en": ""
            },
            "lat": 31.04180420656,
            "lng": 120.92872062279
        }
    ],
    "debug": {
        "polygon": "POLYGON((120.976096320576 31.1099223831419,121.114584888213 31.0526316896348,120.098319299523 25.9844777459729,119.901661816882 26.0154529635895,120.830677375599 30.6952438703413,120.078528738429 29.9412351715907,119.921379638315 30.0587110226732,120.976096320576 31.1099223831419))",
        "transboundary": {
            "line": false, // 整条路线是是否有超出大陆国境的部分
            "point0": true, // 点0 是否大陆外
            "point1": true, // 点1 是否在大陆外
            "point2": false
        },
        "duration": "90ms" // 路线吗查询耗时
    }
}
```

示例

```shell
curl -X POST "http://localhost:3000/aggregate" -H "Content-Type: application/json" --data '{"pageSize": 2,"points": [{"lat": 30, "lng": 120}, {"lat": 29, "lng": 115}]}'
```

带过滤条件的请求

```shell
curl -X POST "http://localhost:3000/aggregate" -H "Content-Type: application/json" --data '{"pageSize": 2,"points": [{"lat": 30, "lng": 120}, {"lat": 29, "lng": 115}], "filter": {"rank": 0, "name_en": "Longmen Ancient Town"}}'
```
