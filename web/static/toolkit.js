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
    $.getJSON(path, () => location.reload());
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

let currentPolyline;

function Q1() {
    let points;
    try {
        points = JSON.parse($("#f1").val());
    } catch (e) {
        $("#r1").text(JSON.stringify(e));
        return;
    }
    console.log(points);

    // $.post(
    //     "/aggregate",
    //     JSON.stringify(points),
    //     function(data) {
    //         $("#r1").text(JSON.stringify(data.data));
    //     },
    //     "json"
    // );
    $.ajax({
        url: "/aggregate",
        method: "post",
        contentType: "application/json",
        data: JSON.stringify(points),
        dataType: "json",
        success: function(data) {
            console.log(data);
        }
    });

    map.removeOverlay(currentPolyline);
    currentPolyline = drawPolyline(points);
}

let map;

function initMap() {
    map = new BMap.Map("map", {
        enableBizAuthLogo: false
    });
    map.enableScrollWheelZoom(true);
    // 创建点坐标
    map.centerAndZoom(new BMap.Point(116.404, 39.915), 5);
    // 初始化地图，设置中心点坐标和地图级别

    $.getJSON("/admin/bundary/china", data => {
        let line = data.data.map(i => new BMap.Point(i[0], i[1]));
        let polyline = new BMap.Polyline(line, {
            strokeColor: "blue",
            strokeWeight: 3,
            strokeOpacity: 0.5
        });
        map.addOverlay(polyline);
    });
}

function drawPolyline(points) {
    let line = points.map(i => new BMap.Point(i.lng, i.lat));
    let polyline = new BMap.Polyline(line, {
        strokeColor: "green",
        strokeWeight: 3,
        strokeOpacity: 0.5
    });
    map.addOverlay(polyline);
    return line;
}

$(function() {
    initMap();
});
