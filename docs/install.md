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
sudo mkdir mypoi
sudo chown -R www.wwww mypoi
cd mypoi
copy_project_file_to_current_path
docker-compose up
```
