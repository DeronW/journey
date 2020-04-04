# Usage

### 先根安装 Python3

### 安装依赖库

```shell
pip3 install -r requirements.txt
```

### 集成测试

```shell
pytest --capture=tee-sys test.py
```

### 压力测试

```shell
locust -f locustfile.py
```

然后打开浏览器 http://localhost:8089/，设置压力测试执行参数。

当前笔记本单机压力测试并发数量： 30~40