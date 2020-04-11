# 安装说明

参考以下过程，逐步执行

### 选择操作系统

推荐使用 Ubuntu18.04(64 位) 版本。可以使用其他支持 Docker 的操作系统，但是根据架构（32、64、arm、linux...）不同需要编译对应版本。以下说明均以`Ubuntu18.04(64位)`操作系统为例。

### 系统软件安装

更新系统，并安装 docker

```shell
# ubuntu
sudo su
apt update
apt -y upgrade
apt -y intall docker docker-compose
```

```shell
# centos
sudo su
yum -y upgrade
yum -y intall docker docker-compose
```


### 创建项目目录

可以选择任意目录，以下为举例说明

```
cd /srv
sudo su
mkdir poi
```

### 创建项目配置文件

把项目代码中 `project` 目录中的文件(docker-compose.yml 和 postgres.env 两个文件)，拷贝到上一步新建的 poi 目录中。修改`docker-compose.yml`中的{TAG}字段，改为想要运行的项目的版本。

版本选择，参考 docker hub 地址：https://hub.docker.com/repository/docker/delongw/tortuous ，推荐使用其中的最新版

### 启动服务

```
docker-compose -p poi up -d
```

启动后，服务进入 daemon 模式。通过 docker 指令来查看服务运行状态。

```shell
docker-compose ps
```

输出结果如下：

        Name                   Command               State           Ports
    -------------------------------------------------------------------------------
    poi_postgis_1   docker-entrypoint.sh postgres    Up      0.0.0.0:5432->5432/tcp
    poi_web_1       docker-entrypoint.sh /bin/ ...   Up      0.0.0.0:3000->3000/tcp

### 服务部署成功

**重要**：
服务部署成功后，要对服务进行初始化。通过浏览器，访问启动的 Web 服务的 `/toolkit` 路径，进行初始化操作。

# Quick Deploy

快速安装服务，一键部署。首先申请一个独立 ECS 服务器，使用 Ubuntu18.04 版本的操作系统, 然后运行以下脚本服务。**注意**，运行前要把`{WEB_IMAGE}`参数改为对应的镜像版本。这里可以使用 `delongw/tortuous:1.0-beta.5`

### Ubuntu 版本

先更新系统软件并安装 docker

```shell
sudo su
apt update
apt -y upgrade
apt -y install docker docker-compose
```

```shell
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
        image: delongw/tortuous:1.0-beta.5
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

### CentOS 版本

`CentOS 7.7`

先更新系统软件并安装 docker

```shell
sudo su
yum -y upgrade
yum -y install docker docker-compose
systemctl start docker
```

然后再启动服务

```shell
cd /srv
if [ -d "./poi" ];then
    rm -r poi
fi
mkdir poi
cd poi
cat > docker-compose.yml << EOF
version: "3"
services:
    web:
        image: delongw/tortuous:1.0-beta.5
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

### 仅 Docker 安装

不使用 docker-compose，仅通过 docker，可以使用下一安装方式

首先运行 PostGIS 镜像

```shell
docker run --name gis -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -d postgis/postgis:11-3.0-alpine
```

然后运行 web 服务镜像，此处需要配置环境变量，并选择指定的 web 服务镜像版本

```shell
docker run --name poi -p 3000:3000 -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_HOST=localhost -d delongw/tortuous:1.0-beta
```

### 源码安装

首先运行 PostGIS 服务，可以使用 docker 也可以使用其他方法。

进入 web 服务目录，启动服务即可。有开发和正式服务两种启动模式：

开发模式：

```shell
npm run dev
```

正式服务模式：

```shell
npm run prod
```

# FAQ

### 私有镜像安装

根据 docker 的功能，可以切换成私有镜像，私有镜像需要自行配置镜像服务器地址及拉取过程的安全校验。使用私有镜像，修改`docker-compose.yml` 中 web 服务的镜像地址即可

### 端口开放

如果使用了云服务，比如阿里云，则需要打开服务器的防火墙端口，以上配置文件中使用的 3000 端口，否则访问会被云服务的防火墙拦住。

### docker 配置文件

docker 的配置属于 docker 本身功能，不是该项目功能，如何熟练的配置 docker 需要额外练习，这里不再赘述

### 测试

项目中包含了 test 目录，其中使用 Python 编写了接口测试和压力测试两种测试，详情参见 test 目录中的 README.md 内容

### 性能说明

图形检索对 CPU 消耗较高，对内存依赖较少。当前的服务采用异步模型，因此能够较大发挥硬件性能，服务器压力集中在 POI 的检索过程

### 水平扩展

创建多个服务实例，即可实现水平扩展。服务之间不共享数据或状态。
