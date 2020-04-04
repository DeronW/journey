# myPOI

### 算法说明

TODO

### 注意事项

1. 不包含权限认证功能 ，所有接口均可直接调用，因此强烈建议仅在内网部署使用
2. 无状态服务，接口返回仅与录入数据有关，因此支持水平扩展

### API 接口

查看 api.md

### 安装说明

查看 install.md

### 任务列表

-   [x] PostGIS
    -   [x] Setup & Table initialize
    -   [x] Polygon query
    -   [x] Fixtures import, China boundary & Points
-   [x] API
    -   [x] aggragate
    -   [x] poi/\*
    -   [x] admin/\*
-   [ ] Dashboard
    -   [x] map preview
    -   [x] point CRUD
-   [ ] Documents
    -   [x] database
    -   [x] api
    -   [ ] install
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
| 04 月 15 日 | 交付           |                    |      |

交付内容

-   [ ] 全部源码
-   [ ] 测试结果
-   [ ] 安装说明文档
-   [ ] 项目人工交接

### References

GIS Type
https://postgis.net/docs/manual-3.0/using_postgis_dbmanagement.html#Geography_Basics

PostGIS ST\_\* functions
https://postgis.net/docs/manual-1.5/ch08.html

Core query function, ST_Buffer
https://postgis.net/docs/manual-1.5/ST_Buffer.html

大地坐标系 4326
http://epsg.io/4326

在线地图使用的坐标系 3857
http://epsg.io/3857 伪墨卡托投影

当前项目使用的坐标系：**4326** GCS_WGS_1984
