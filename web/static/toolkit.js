function createTable() {
    if (!confirm("erase ALL database data and create new tables?")) return;
    operate("/admin/create-table");
}

function reset() {
    if (!confirm("reset all data?")) return;
    if (!confirm("sure?")) return;
    operate("/admin/reset-all");
}

function importChinaBundary() {
    if (!confirm("re-import China bundary?")) return;
    operate("/admin/import-china-bundary");
}

function importScenicPoints() {
    if (!confirm("import scenic points?")) return;
    operate("/admin/import-scennic-points");
}

function operate(path) {
    $.post(path, {}, () => location.reload());
    readyToRefresh();
}

function readyToRefresh() {
    function write(n) {
        document.getElementById("body").innerHTML = `
    <div>
        数据处理中...${n}s <br />
        <a href="#" onClick="location.reload()">手动刷新</a>
    </div>
    `;
        if (n > 0) setTimeout(() => write(n - 1), 1000);
        else location.reload();
    }
    write(30);
}

function selectedFileChange() {
    var file = document.getElementById("fileForUpload").files[0];
    if (file) {
        var reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        let el = document.getElementById("preview");
        reader.onload = function (evt) {
            el.innerHTML = evt.target.result;
        };
        reader.onerror = function (evt) {
            el.innerHTML = "error reading file";
        };
    }
}

let currentPolyline,
    currentPolygon,
    Markers = [];

function Q1() {
    let form;
    try {
        form = JSON.parse($("#f1").val());
        form.debug = true
    } catch (e) {
        $("#r1").text(JSON.stringify(e));
        return;
    }

    $.ajax({
        url: "/aggregate",
        method: "post",
        contentType: "application/json",
        data: JSON.stringify(form),
        dataType: "json",
        success: function (data) {
            drawPolygon(data.debug.polygon);
            drawMarkers(data.pois);
            $("#r1").text(JSON.stringify(data.pois, null, 4));

            let info = JSON.parse(JSON.stringify(data));
            delete info.pois;
            $("#r2").text(JSON.stringify(info, null, 4));
        },
        fail: function(e){
            console.log(e)
        }
    });

    drawPolyline(form.points);
}

let map;

function initMap() {
    map = new BMap.Map("map", {
        enableBizAuthLogo: false,
    });
    map.enableScrollWheelZoom(true);
    // 创建点坐标
    map.centerAndZoom(new BMap.Point(116.404, 39.915), 5);
    // 初始化地图，设置中心点坐标和地图级别

    $.getJSON("/admin/bundary/china", (data) => {
        let line = data.map((i) => new BMap.Point(i[0], i[1]));
        let polyline = new BMap.Polyline(line, {
            strokeColor: "blue",
            strokeWeight: 3,
            strokeOpacity: 0.5,
        });
        map.addOverlay(polyline);
    });
}

function drawPolyline(points) {
    map.removeOverlay(currentPolyline);
    let line = points.map((i) => new BMap.Point(i.lng, i.lat));
    currentPolyline = new BMap.Polyline(line, {
        strokeColor: "green",
        strokeWeight: 3,
        strokeOpacity: 0.5,
    });
    map.addOverlay(currentPolyline);
}

function drawPolygon(polygonStr) {
    map.removeOverlay(currentPolygon);
    let points = polygonStr
        .substr(9, polygonStr.length - 11)
        .split(",")
        .map((i) => i.split(" "));
    points = points.map((i) => new BMap.Point(i[0], i[1]));

    currentPolygon = new BMap.Polyline(points, {
        strokeColor: "blue",
        strokeWeight: 6,
        strokeOpacity: 0.5,
    });
    map.addOverlay(currentPolygon);
}

function drawMarkers(pois) {
    Markers.forEach((i) => map.removeOverlay(i));
    Markers = [];
    for (let i = 0; i < pois.length; i++) {
        let { lat, lng, tag } = pois[i];
        let point = new BMap.Point(lng, lat),
            marker = new BMap.Marker(point);
        Markers.push(marker);
        map.addOverlay(marker);
    }
}

$(function () {
    initMap();
});
