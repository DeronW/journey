# myPOI

### 算法说明

TODO: 算法需要优化说明

### 注意事项

1. 不包含权限认证功能 ，所有接口均可直接调用，因此强烈建议仅在内网部署使用
2. 无状态服务，接口返回仅与录入数据有关，因此支持水平扩展

### API 接口

查看 api.md

### 安装说明

查看 install.md

### 初始化数据

### 任务列表

-   [x] PostGIS
    -   [x] Setup & Table initialize
    -   [x] Polygon query
    -   [x] Fixtures import, China boundary & Points
-   [x] API
    -   [x] aggragate
    -   [x] poi/\*
    -   [x] admin/\*
-   [x] Dashboard
    -   [x] map preview
    -   [x] point CRUD
-   [x] Documents
    -   [x] database
    -   [x] api
    -   [x] install
-   [x] Test
    -   [x] integrate test
    -   [x] performance test

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

-   [x] 全部源码
-   [x] 测试结果
-   [x] 安装说明文档
-   [ ] 项目人工交接
