# 安装说明

支持两种安装方法，下载代码库直接运行或从 docker hub 中拉去镜像安装。两种方法都依赖 Docker 功能。下面安装方法描述的是通过 docker hub 拉去镜像的安装方法。如果要依赖私有镜像，那么需要注册自己的私有镜像地址

### 操作系统

推荐使用 Ubuntu18.04(64 位) 版本，或其它支出 Docker 的操作系统

一下说明均以`Ubuntu18.04(64位)`操作系统为例

**注意**：如果使用了云服务，比如阿里云，则需要打开服务器的防火墙端口，否则访问会被云服务的防火墙拦住。

### 环境配置

```shell
sudo su
apt update
apt upgrade
apt intall docker docker-compose
```

### 创建项目目录

```
sudo su
cd /srv
mkdir poi
```

### 创建项目配置文件

手动把项目代码中 project 目录中的文件拷贝到 poi 目录中，并修改{TAG}字段，改为当前项目的版本。参考 docker hub 地址：https://hub.docker.com/repository/docker/delongw/tortuous 使用其中的最新版

### 启动服务

```
docker-compose -p poi up -d
```

# Quick Deploy

如果想快速安装服务，可以申请一个独立 ECS, 然后运行以为服务。
apply a Ubuntu18 OS, and then just copy the shell and run

```shell
apt update
echo yes | apt upgrade
echo yes | apt install docker docker-compose
cd /srv
if [ ! -d "./poi" ];then
    rm -r poi
fi
mkdir poi
cd poi
cat > docker-compose.yml << EOF
version: "3"
services:
    web:
        image: delongw/tortuous:1.0-beta
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
EOF
cat > postgres.env << EOF
POSTGRES_PASSWORD=mysecretpassword
POSTGRES_USER=postgres
POSTGRES_DB=postgres
POSTGRES_HOST=postgis
EOF
docker stop $(docker ps -aq)
docker-compose -p poi up -d
echo complete

```

# Manually Deploy

Running PostGIS indenpendently first

```shell
docker run --name gis -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -d postgis/postgis:11-3.0-alpine
```

Running 

```shell
docker run --name poi -p 3000:3000 -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_HOST=localhost -d delongw/tortuous:1.0-beta
```