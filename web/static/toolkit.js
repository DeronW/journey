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

function Q1() {
    let data = JSON.parse($("#f1").val())
    console.log(data)
    $.post(
        "/aggregate",
        data,
        function(data) {
            $("#r1").text(JSON.stringify(data.data));
        },
        "json"
    );
}
