# 安装说明

支持两种安装方法，下载代码库直接运行或从 docker hub 中拉去镜像安装。两种方法都依赖 Docker 功能。

### 选择操作系统

依赖支持 Docker 的操作系统。
本文使用 Ubuntu 18.06 作为演示安装操作系统

当前使用软件版本

    Docker: 19.03.x
    Docker-Compose 1.25.x

### 配置环境

```shell
sudo apt update
sudo apt upgrade
sudo apt intall docker docker-compose
cd /srv
sudo mkdir poi
cd poi
# 创建 docker-compose 文件
touch docker-compose.yml
# 创建配置文件
touch postgis.env
sudo chown -R www.wwww mypoi
```

#### docker-compose.yml 示例

```yaml
version: "3"
services:
    web:
        image: delongw/tortuous:{TAG}
        restart: always
        ports: 
            - "3000:3000"
        depends_on:
            - "postgis"
        env_file: postgres.env
    postgis:
        image: postgis/postgis:11-3.0-alpine
        restart: always
        ports: 
            - "5432:5432"
        env_file: postgres.env
```

web的docker镜像配置需要修改成自己配置和

#### postgis.env 示例

```text
# define PostGIS env
POSTGRES_PASSWORD=mysecretpassword
POSTGRES_USER=postgres
POSTGRES_DB=postgres
POSTGRES_HOST=postgis
```