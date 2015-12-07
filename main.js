"use strict";

var table;

// this will be used for submitsubmitting POST data to server
// should be -1 if the item submitted is new (doesn't exist in db)
// should be a specific id for an existing item if it's an UPDATE
var currentItemId = -1;

// used in login process
var logInProcess = false;

const newItemForModal = {
    'title': '',
    'deadlinedate': new moment().format("YYYY-MM-DD"),
    'priority': "4",
    'responsible': '',
    'description': '',
    'author': '',
    'projectid': "1"
};

var dataSet;
var dataSources;

function setUItoLoggedOut() {
    docCookies.removeItem("username");
    docCookies.removeItem("token");
    $("#userstatus").text("Not logged in");
    $("#authHolder").show();
    $("#userInfo").hide();
    $("#loginButton").show();
    $("#logoutButton").hide();
    $("#username").val("");
    $("#password").val("");
}

function logoutSuccessCallback(response) {
    if (response['code'] == 200) {
        setUItoLoggedOut();
    }
    else {
        console.log("there was a problem in logoutSuccessCallback")
    }
}

function logOut() {
    /*
     delete cookies for auth.
     reload page
     */
    docCookies.removeItem("username");
    docCookies.removeItem("token");
    location.reload(true);
}

function submitNewHistory() {
    function submitHistorySuccessCallback(response, textStatus, request, dataToSubmit) {
        console.log(textStatus + " while posting history");
        dataToSubmit['memberid'] = getMemberIDfromValue(docCookies.getItem("username"));
        addNewHistoryToList(dataToSubmit, true);
    }

    function submitHistoryFail(xhr, textStatus, thrownError) {
        console.log(textStatus + " while posting history");
        alertModal(textStatus + " while updating task status.");
    }

    var url = "/tasks/" + currentItemId + "/history";
    var dataToSubmit = {
        "itemstatusid": null,
        "itemid": null,
        "statusdate": new moment().format(""),
        "statuskey": $("#newStatusNumber").val(),
        "memberid": null,
    };
    $.ajax({
            url: url,
            type: 'POST',
            data: JSON.stringify(dataToSubmit),
            contentType: "application/json; charset=utf-8",
            headers: {"Authorization": "Bearer " + docCookies.getItem('token')},
            success: function (response, textStatus, request) {
                submitHistorySuccessCallback(response, textStatus, request, dataToSubmit);
            },
            error: function (xhr, textStatus, thrownError) {
                submitHistoryFail(xhr, textStatus, thrownError);
            }
        }
    )

}

function submitNewComment() {
    var url = "/tasks/" + currentItemId + "/comments";
    var dataToSubmit = {
        "itemcommentid": null,
        "itemid": null,
        "memberid": null,
        "postdate": new moment().format(""),
        "body": $("#newcomment").val(),
        "lastchangedate": null
    };

    function submitCommentFail(xhr, textStatus, thrownError) {
        console.log(textStatus + " while posting comment");
        alertModal(textStatus + " while posting comment");
    }

    function submitCommentSuccessCallback(response, textStatus, request, data) {
        console.log(textStatus + " posting comment ");
        data['memberid'] = getMemberIDfromValue(docCookies.getItem("username"));
        addNewCommentToList(data, true);
    }

    $.ajax({
        url: url,
        type: 'POST',
        data: JSON.stringify(dataToSubmit),
        contentType: "application/json; charset=utf-8",
        headers: {"Authorization": "Bearer " + docCookies.getItem('token')},
        success: function (response, textStatus, request) {
            submitCommentSuccessCallback(response, textStatus, request, dataToSubmit);
        },
        error: function (xhr, textStatus, thrownError) {
            submitCommentFail(xhr, textStatus, thrownError);
        }
    });
}

function prepareModalForNewTask() {
    currentItemId = -1;
    setDataInModal(newItemForModal);
    $("#responsible").val(getMemberIDfromValue(docCookies.getItem("username")));
    $("#content").hide();
}

function setUItoLoggedIn() {
    var username = docCookies.getItem("username");
    $("#userstatus").text(username);
    $("#authHolder").hide();
    $("#loggedInAs").text("Logged in as " + username);
    $("#userInfo").show();
    $("#loginButton").hide();
    $("#logoutButton").show();
}

function authenticationResponseHandler(response, username) {
    console.log(JSON.stringify(response));
    console.log(response);
    $("#authModal").modal("hide");
    docCookies.setItem("token", response['token'], null, null, null, true);
    docCookies.setItem("username", username);
    setUItoLoggedIn();
    if (logInProcess === true) {
        //$("#authModal").data('modal').options.keyboard = true;
        //$("#authModal").data('modal').options.backdrop = true;
        //$("#authModal").modal({
        //    backdrop: true,
        //    keyboard: true
        //});
        logInProcess = false;
        $("#authModal button.close").show();
        $("#authModal button.btn-default").show();
        loadDocument();
    }

}

function tryAuthenticate() {
    var username = $("#username").val();
    var password = $("#password").val();
    var encoded = btoa(username + ":" + password);
    console.log(encoded);
    $("#authmessage").text("");
    $.ajax({
        url: '/users/token',
        type: 'GET',
        contentType: "application/json; charset=utf-8",
        headers: {"Authorization": "Basic " + encoded},
        success: function (response) {
            authenticationResponseHandler(response, username);
        },
        error: function (xhr, textStatus, thrownError) {
            // add some red text html to the modal
            // saying 'try again'
            console.log(xhr, textStatus, thrownError);
            $("#authmessage").text("Failure. Try again");
        }
    });
}

function alertModal(message) {
    $("#alertMessage").text(message);
    $("#alertModal").modal("toggle");
}

function submitTaskFromModal() {
    var thisItemId = currentItemId;
    //validate if deadline field is empty or invalid data
    var deadline_in_form = $('#deadline').data("DateTimePicker").date();
    if (deadline_in_form !== null && deadline_in_form !== "") {
        deadline_in_form = deadline_in_form.format("YYYY-MM-DD");
    }
    var data = {
        'title': $("#title").val(),
        'priority': $('#priority').val(),
        'deadlinedate': deadline_in_form,
        'projectid': $('#projectid').val(),
        'description': $('#description').val(),
        'memberid': $('#responsible').val(),
        'authorid': $('#author').val()
    };
    var dataToSubmit = JSON.stringify(data);
    var url = "/tasks/";
    if (thisItemId !== -1) {
        url = "/tasks/" + thisItemId;
    }
    console.log("submit to " + url + dataToSubmit);

    function submitTaskSuccessCallback(response, textStatus, request, thisItemId, dataToSubmit) {
        console.log(textStatus + " on submit task. " + JSON.stringify(response));

        if (request.status === 201) {
            if (thisItemId === -1) {
                // we have created a new task
                // we get the id assigned to the newly
                // created task from the response
                thisItemId = response['id'];
                dataToSubmit['id'] = thisItemId;
                dataToSubmit['authorid'] = getMemberIDfromValue(docCookies.getItem("username"));
                addNewRow(thisItemId, dataToSubmit);
            }
            else {
                // we have updated an existing task
                dataToSubmit['id'] = thisItemId;
                setDataInRowById(thisItemId, dataToSubmit);
            }

        }
    }

    function submitTaskFail(xhr, textStatus, thrownError) {
        if (xhr.status === 401) {
            alertModal("Not logged in");
        }
        else if (xhr.status === 403) {
            alertModal("No permission on that resource");
        }
        else {
            alertModal("Something went wrong. Please try again later");
        }
    }

    $.ajax({
        url: url,
        type: 'POST',
        data: dataToSubmit,
        contentType: "application/json; charset=utf-8",
        headers: {"Authorization": "Bearer " + docCookies.getItem('token')},
        success: function (response, textStatus, request) {
            submitTaskSuccessCallback(response, textStatus, request, thisItemId, data);
        },
        error: function (xhr, textStatus, thrownError) {
            submitTaskFail(xhr, textStatus, thrownError);
        }
    });
}

function replaceIdsWithValuesInDataSet(dataSet) {
    function replaceIdsWithValues(dataObject) {
        // we replace the ID numbers we get from the server
        // with the names from the dictionary mapping we will store client-side
        var responsible_id = dataObject['responsible'];
        var author_id = dataObject['author'];
        var projectid = dataObject['projectid'];
        var priority = dataObject['priority'];
        if (responsible_id != null) {
            dataObject['responsible'] = dataSources['responsible'][responsible_id];
        }
        if (author_id != null) {
            dataObject['author'] = dataSources['responsible'][author_id];
        }
        if (projectid != null) {
            dataObject['projectid'] = dataSources['projectlist'][projectid];
        }
        if (priority != null) {
            dataObject['priority'] = dataSources['priority'][priority];
        }
        return dataObject;

    }

    for (var i = 0; i < dataSet.length; i++) {
        dataSet[i] = replaceIdsWithValues(dataSet[i]);
    }
    return dataSet;
}

function addTextFieldsFromIds(dataObject, field) {
    var dataSource = null;
    if (field == 'memberid' || field == 'authorid') {
        dataSource = 'responsible';
    }
    else if (field == "projectid") {
        dataSource = "projectlist";
    }
    else {
        dataSource = field;
    }
    var id = dataObject[field];
    var text = undefined;
    if (id !== null && id != undefined) {
        text = dataSources[dataSource][id];
    }
    if (text === undefined) {
        text = "";
    }
    var text_field = field + "_text";
    dataObject[text_field] = text;
    return dataObject
}


function addValueFieldsToRowObject(dataObject) {
    var fields_to_check = ['authorid', 'memberid', 'projectid', 'priority'];
    for (var i in fields_to_check) {
        dataObject = addTextFieldsFromIds(dataObject, fields_to_check[i]);
    }
    // should it be global?
    function addUserDateFormatToRowObject(dataObject) {
        var deadlinedate_text = "";
        if (dataObject['deadlinedate'] !== null &&
            dataObject['deadlinedate'] !== "") {
            var date = new Date(dataObject['deadlinedate']);
            deadlinedate_text = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
        }
        dataObject['deadlinedate'] = deadlinedate_text;
        return dataObject;
    }

    dataObject = addUserDateFormatToRowObject(dataObject);
    return dataObject;
}

function idExistsInTableRows(idToCheck) {
    return table.row("#" + idToCheck).data() != undefined;

}

function setAdditionalIDField(dataObject) {
    // WORKAROUND: dataTables does not read the ID field
    // to be displayed as column
    dataObject['ID'] = dataObject['DT_RowId'];
    return dataObject;
}

function prepareTaskRowFromDb(jsonDataObject, newTaskId) {
    //"columns": [
    //    {"data": "id"},
    //    {"data": "title"},
    //    {"data": "description"},
    //    {"data": "deadlinedate"},
    //    {"data": "responsible_text"},
    //    {"data": "author_text"},
    //    {"data": "projectid_text"},
    //    {"data": "priority_text"}
    //],
    jsonDataObject = addValueFieldsToRowObject(jsonDataObject);
    jsonDataObject['DT_RowId'] = newTaskId;
    //jsonDataObject = setAdditionalIDField(jsonDataObject);
    return jsonDataObject;
}

function addNewRow(newTaskId, jsonDataObject) {
    jsonDataObject = prepareTaskRowFromDb(jsonDataObject, newTaskId);
    table.row.add(jsonDataObject);
    table.draw();
}

function setDataInRowById(DT_RowId, dataObject) {
    dataObject = addValueFieldsToRowObject(dataObject);
    dataObject['DT_RowId'] = DT_RowId;
    dataObject = setAdditionalIDField(dataObject);
    console.log("trying to update row " + DT_RowId + " with data " + JSON.stringify(dataObject));
    table.row("#" + DT_RowId).data(dataObject);
}

function iterateDataSources() {
    for (var key in dataSources) {
        if (dataSources.hasOwnProperty(key)) {
            console.log(key + " -> " + dataSources[key]);
            var subobj = dataSources[key];
            for (var subkey in subobj) {
                if (subobj.hasOwnProperty(subkey)) {
                    console.log(subkey + " -> " + subobj[subkey]);
                }
            }
        }
    }
}

function onClickTableRow(e) {
    currentItemId = e.innerText;
    console.log('clicked on row with id ', currentItemId);
    updateDataInModalFromId();
    toggleModal();
    $("#content").show();
}

function replaceValuesWithIds(modalDataObject) {
    var thisPriority = modalDataObject['priority'];
    var thisProjectid = modalDataObject['projectid'];
    var thisResponsible = modalDataObject['responsible'];
    var thisAuthor = modalDataObject['author'];

    for (var i in dataSources['priority']) {
        if (dataSources['priority'][i] === thisPriority) {
            modalDataObject['priority'] = i;
        }
    }
    for (var j in dataSources['projectid']) {
        if (dataSources['projectid'][j] === thisProjectid) {
            modalDataObject['projectid'] = j;
        }
    }
    for (var k in dataSources['responsible']) {
        if (dataSources['responsible'][k] === thisResponsible) {
            modalDataObject['responsible'] = k;
        }
        if (dataSources['responsible'][k] === thisAuthor) {
            modalDataObject['author'] = k;
        }
    }
    return modalDataObject;
}

function updateDataInModalFromId() {
    var modalDataObject = table.row("#" + currentItemId).data();
    setDataInModal(modalDataObject);
    $.ajax({
        url: '/tasks/' + currentItemId + '/comments',
        async: true,
        dataType: 'json',
        headers: {"Authorization": "Bearer " + docCookies.getItem('token')},
        success: function (comments) {
            console.log("got comments from server: " + JSON.stringify(comments));
            fillCommentSection(comments);
        }
    });
    $.ajax({
        url: '/tasks/' + currentItemId + '/history',
        async: true,
        dataType: 'json',
        headers: {"Authorization": "Bearer " + docCookies.getItem('token')},
        success: function (historyEntries) {
            console.log("got history from server: " + JSON.stringify(historyEntries));
            fillHistorySection(historyEntries);
        }
    });
}

function toggleModal() {
    $("#createNewModal").modal('toggle');
}

function setDataInModal(modalDataObject) {
    $('#priority').val(modalDataObject["priority"]);
    $('#deadline').data("DateTimePicker").date(modalDataObject['deadlinedate']);
    $("#projectid").val(modalDataObject["projectid"]);
    $("#title").val(modalDataObject["title"]);
    $('#description').val(modalDataObject['description']);
    $("#responsible").val(modalDataObject["memberid"]);
    console.log('data modal has been updated with ' + JSON.stringify(modalDataObject));
}

function getPriorityIDfromValue(priority) {
    for (var x in dataSources['priority']) {
        if (dataSources['priority'][x] === priority) {
            return x;
        }
    }
}

function getProjectIDfromValue(projectid) {
    for (var x in dataSources['projectid']) {
        if (dataSources['projectid'][x] === projectid) {
            return x;
        }
    }
}

function getMemberIDfromValue(member) {
    for (var x in dataSources['responsible']) {
        if (dataSources['responsible'][x] === member) {
            return x;
        }
    }
}

function generateSelectOptionsForPriority() {
    var prioritySelect = $("#priority");
    prioritySelect.find("option").remove().end();
    for (var x in dataSources['priority']) {
        var opt = document.createElement('option');
        opt.value = x;
        opt.innerHTML = dataSources['priority'][x];
        prioritySelect.append(opt);
    }
}

function generateSelectOptionsForProjectList() {
    var projectSelect = $("#projectid");
    projectSelect.find("option").remove().end();
    for (var x in dataSources['projectlist']) {
        var opt = document.createElement('option');
        opt.value = x;
        opt.innerHTML = dataSources['projectlist'][x];
        projectSelect.append(opt);
    }
}

function generateSelectOptionsForResponsible() {
    var responsibleSelect = $("#responsible");
    responsibleSelect.find("option").remove().end();
    for (var x in dataSources['responsible']) {
        var opt = document.createElement('option');
        opt.value = x;
        opt.innerHTML = dataSources['responsible'][x];
        responsibleSelect.append(opt);
    }
}

function initializeEditables() {

    generateSelectOptionsForPriority();

    generateSelectOptionsForProjectList();

    generateSelectOptionsForResponsible();
}

function addNewCommentToList(comment, fromPosting) {
    var commentsContainer = $("#commentsList");
    var cmdiv = '<div class="row task-modal-list-item">' + dataSources['responsible'][comment.memberid] + ", at " + new moment(comment.postdate).format("YYYY-MM-DD, HH:mm") + "</div>";
    cmdiv += "<div class='row'>" + comment.body + "</div>";
    if (fromPosting === true) {
        commentsContainer.prepend(cmdiv);
    }
    else {
        commentsContainer.append(cmdiv);
    }
}

function fillCommentSection(comments) {
    var commentsContainer = $("#commentsList");
    commentsContainer.html("");
    for (var i in comments) {
        addNewCommentToList(comments[i], false);
    }
}

function addNewHistoryToList(history, fromPosting) {
    var historyContainer = $("#historyList");
    var hsdiv = '<div class="row task-modal-list-item">';
    hsdiv += "Set to " + parseInt(history.statuskey) * 20 + "% by " + dataSources['responsible'][history.memberid] + " at " + new moment(history.statusdate).format("YYYY-MM-DD, HH:mm");
    hsdiv += '</div>';
    historyContainer.prepend(hsdiv);
}

function fillHistorySection(historyEntries) {
    var historyContainer = $("#historyList");
    historyContainer.html("");
    for (var i in historyEntries) {
        addNewHistoryToList(historyEntries[i], false);
    }
}

function checkTokenAndUsernameCombinationCallback(response) {
    if (response['code'] === 200) {
        setUItoLoggedIn();
    }
    else {
        setUItoLoggedOut();
        alertModal("There was a problem with your credentials. Please try logging in again");
    }
}

function checkTokenAndUsernameCombination() {
    var dataToSubmit = JSON.stringify(
        {
            "username": docCookies.getItem("username"),
            "token": docCookies.getItem("token")
        }
    );
    $.ajax({
        url: '/check',
        type: 'POST',
        data: dataToSubmit,
        contentType: "application/json; charset=utf-8",
        success: checkTokenAndUsernameCombinationCallback
    });
}

function checkForTokenCookie() {
    if (docCookies.hasItem("token") === true && docCookies.hasItem("username") === true) {
        checkTokenAndUsernameCombination();
    }
    else {
        setUItoLoggedOut();
    }

}

function loadRowsFromDataSet(dataSet) {
    for (var x in dataSet) {
        var row = dataSet[x];
        addNewRow(row['DT_RowId'], row);
    }
}

function onGetInitSuccess(data) {
    // Setup - add a text input to each footer cell
    // but they become header cells due to the CSS added in index.html
    //   <tfoot style="display: table-header-group;">
    $('#example tfoot th').each(function () {
        var title = $('#example thead th').eq($(this).index()).text();
        $(this).html('<input style="width: 100%;" type="text" placeholder="search..." />');
    });

    console.log('got data from /init');
    dataSources = data['dataSources'];
    dataSet = data['data'];
    for (var i in dataSet) {
        dataSet[i] = prepareTaskRowFromDb(dataSet[i], dataSet[i]['id']);
    }
    table = $('#example').DataTable({
        "dom": 'C<"clear"><"toolbar">lfrtip',
        "data": dataSet,
        "columns": [
            {"data": "id"},
            {"data": "title"},
            {"data": "description"},
            {"data": "deadlinedate"},
            {"data": "memberid_text"},
            {"data": "authorid_text"},
            {"data": "projectid_text"},
            {"data": "priority_text"}
        ],
        "order": [[3, "desc"]]
    });

    $("div.toolbar").html('<button id="userstatus" type="button" class="btn btn-info btn-lg" data-toggle="modal" data-target="#authModal">Not logged in</button><div id="otherdiv"></div><div id="create-new"  data-toggle="modal" data-target="#createNewModal" onclick="prepareModalForNewTask();"></div>');

    $("#create-new").html('<p style="font-size: 3em;">+</p>');

    setUItoLoggedIn();

    //on click functionality
    $(".countTable table").on('click', "tr td:nth-child(1)", function () {
        onClickTableRow(this);
    });

    // Apply the search
    table.columns().every(function () {
        var that = this;

        $('input', this.footer()).on('keyup ', function () {
            that
                .search(this.value)
                .draw();
        });
    });

    dataSources = dataSources;
    initializeEditables();

    $("body").removeClass("loading");
};

function loadDocument() {

    var opts = {
        lines: 13 // The number of lines to draw
        , length: 28 // The length of each line
        , width: 14 // The line thickness
        , radius: 42 // The radius of the inner circle
        , scale: 1 // Scales overall size of the spinner
        , corners: 1 // Corner roundness (0..1)
        , color: '#000' // #rgb or #rrggbb or array of colors
        , opacity: 0.25 // Opacity of the lines
        , rotate: 0 // The rotation offset
        , direction: 1 // 1: clockwise, -1: counterclockwise
        , speed: 1.5 // Rounds per second
        , trail: 100 // Afterglow percentage
        , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
        , zIndex: 2e9 // The z-index (defaults to 2000000000)
        , className: 'spinner' // The CSS class to assign to the spinner
        , top: '50%' // Top position relative to parent
        , left: '50%' // Left position relative to parent
        , shadow: true // Whether to render a shadow
        , hwaccel: true // Whether to use hardware acceleration
        , position: 'absolute' // Element positioning
    };
    var target = document.getElementById('foo');
    var spinner = new Spinner(opts).spin(target);
    $("body").addClass("loading");

    console.log("starting task load...");
    $.ajax({
        type: "GET",
        url: "/init",
        headers: {"Authorization": "Bearer " + docCookies.getItem('token')},
        success: function (data) {
            onGetInitSuccess(data);
        },
        error: function (xhr, textStatus, thrownError) {
            console.log(xhr, textStatus, thrownError);
        }
    });
}

function startLoginProc() {
    logInProcess = true;
    setUItoLoggedOut();
    $("#authModal button.close").hide()
    $("#authModal button.btn-default").hide();
    $("#authModal").modal({
        backdrop: 'static',
        keyboard: false
    });
    $("#authModal").modal("show");
}

function beforeLoadDocument() {
    var token = docCookies.getItem("token");
    // TODO token verify via send
    if (token === "" || token === null) {
        startLoginProc();
    } else {
        loadDocument();
    }
}

$(document).ready(function () {
    beforeLoadDocument();
});
