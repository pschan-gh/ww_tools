var hwsets = [];
var sortField = 'undefined';
var groupField = 'undefined';
var headerNames = [];
var baseQuery;
var clickedArray = {};
var highlightHue = 0;
var logList = [];

var lastSelected;
var checkBoxes;

var maskSID = 1;
var salt = Math.random();

var url = new URL(window.location.href);
maskSID = url.searchParams.get("maskSID") ? url.searchParams.get("maskSID") : maskSID;

const wwFields = ['sid', 'answer', 'index', 'unixtime', 'time', 'hwset', 'prob' , 'result', 'score'];

const dbFields = ['`sid`', '`answer`', '`index`', '`unixtime`', '`time`', '`hwset`', '`prob`' , '`result`', '`score`'];

const entryRegexp = /^(.*?)\t(\d+)\t(.*?)$/;
const dqRegex = /\"/ig;


// https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function readSingleFile(e) {
    hwsets = [];
    $("#hwset").html('<option value="Select ...">Select ...</option>');
    $('th').attr('clicked', 0);
    $('th').find('triangle').hide();
    sortField = 'undefined';
    $('th').off();
    $('#hwset').off();
    $('#problem').off();
    $('#problem_set').off();

    $('#controlPanel').hide();
    $('td').css('color', '#eee');
    $('#hover_msg').html('Loading Database...<img style="width:5em" src="Loading_icon.gif"/>');
    $('#hover_msg').show();

    var file = e.target.files[0];
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;
        // displayContents(contents);
        initializeDB(contents);
    }
    reader.readAsText(file);
}

//https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

function initializeDB(contents) {
    // $('th').find('.triangle').hide();
    $('th').css('background-color', '');
    $('th').css('color', '');
    $('th').find('a').css('color', '');
    $('th').find('div').css('color', '');
    $('td').css('border-left', '');
    $('td').css('border-right', '');
    $('td').css('color', '#000');
    $('tbody').html('');


    var contents = contents.replace(/,/g, '_');

    var dbName = 'alDB' + contents.hashCode();
    console.log('DB NAME: ' + dbName);

    // var schemaBuilder = lf.schema.create(dbName, 1);
    // schemaBuilder.createTable('LogTable').addColumn('sid', lf.Type.STRING).addColumn('answer', lf.Type.STRING).addColumn('index', lf.Type.INTEGER).addColumn('unixtime', lf.Type.INTEGER).addColumn('time', lf.Type.STRING).addColumn('hwset', lf.Type.STRING).addColumn('prob', lf.Type.INTEGER).addColumn('result', lf.Type.STRING).
    // addPrimaryKey(['index']).
    // addIndex('idxSID', ['sid'], false, lf.Order.DESC);

    config = {
        locateFile: filename => `js/${filename}`
    }
    initSqlJs(config).then(function(SQL){
        var db = new SQL.Database();
        let meta;
        let logTable = 'LogTable';

        // db.run("CREATE TABLE DataTable (" + colQuery + ");");
        db.run("CREATE TABLE LogTable (`sid` char, `answer` blob, `index` int PRIMARY KEY, `unixtime` int, `time` char, `hwset` char, `prob` int, `result` char, `score` char);");

        // let results = db.exec("SELECT * FROM LogTable ");
        logList = contents.split(/\r?\n/);

        logList.forEach(entry => {
            var match = entryRegexp.exec(entry);
            if (typeof(match) !== 'undefined' && match !== null)  {
                hwset = match[1].split(/\|/)[2];
                if (!(hwsets.includes(hwset))) {
                    console.log('NEW HWSET');
                    console.log(hwsets);
                    hwsets.push(hwset);
                    var o = new Option("option text", "value");
                    /// jquerify the DOM object 'o' so we can use the html method
                    $(o).html(hwset);
                    $(o).val(hwset);
                    $("#hwset").append(o);
                }
            }
        });

        $('#messages').html('<strong>Database Loaded.</strong>');
        $('#hover_msg').hide();


        $('#hwset').on('change', function() {
            // setTimeout(function() {
            //     $('.progress').show();
            //     progress = 0;
            //     $('.progress-bar').attr('valuenow', '0');
            //     $('.progress-bar').css('width', '0' + '%');
            // }, 0);
            // baseQuery = "select(table.time, table.sid, table.result, table.answer).from(table).where(table.hwset.eq('" + $(this).val() +"'))";
            let hwset = $(this).val();
            setTimeout(function() {
                loadData(db, 'LogTable', logList, 'hwset', hwset, function(database) { updateProblems(database, logTable, $('#hwset').val()); eventListeners(database, logTable);});
            }, 0);
        });
                // updateProblems(db, logTable, $('#hwset').val());


        $('#controlPanel').css('display', 'inline-block');
        // updateProblems(db, logTable, $('#hwset').val());
    });

}

function eventListeners(database, logTable) {
    $('#problem_sel').off();
    $('#problem_sel').on('change', function() {
        let problem = $(this).val();
        // baseQuery = "select(table.time, table.unixtime, table.sid, table.result, table.answer).from(table).where(lf.op.and(table.hwset.eq('" + $('#hwset').val() +"'), table.prob.eq('" + problem + "')))";
        baseQuery = "SELECT `time`, `unixtime` , `sid`, `result`, `score`, `answer` FROM " + logTable + " WHERE `hwset` = '" + $('#hwset').val() + "' AND `prob` = '" + problem + "'";
        $('#query').val(baseQuery);
        clickedArray['time'] = -1;
        queryHWSet(database, logTable, baseQuery, 'time');
        $('#export').show();

    });
    $('#submit').off();
    $('#submit').on('click', function() {
        baseQuery = $('#query').val();
        queryHWSet(database, logTable, baseQuery, 'unixtime');
    });
}
const chunkSize = 5000;
// var progress = 0;
// function updateDB(database, logTable, loglist, field, value, total, callback) {
//     var answer, utime, metaData, time, sid, hwset, result;
//     var prob = 0;
//     let datum = [];
//     let match;
//     let queryINSERT = '';
//     if (loglist.length < 1) {
//         callback(database);
//         return;
//     }
//     // console.log(loglist);
//     // console.log(loglist.slice(0, 200));
//     let list = loglist.slice(0, chunkSize);
//     for (let i = 0; i < list.length - 1; i++) {
//         match = entryRegexp.exec(list[i]);
//         if (typeof(match) !== 'undefined' && match !== null)  {
//             answer = match[3].replace(dqRegex, "").replace(/\t/g, ';').replace(/[^a-z0-9\s\;\+\-\_\^\(\)\[\]\*\/\\]/ig, ''); //.replace(/inf/g, '\\infty');
//             utime = match[2];
//             metaData = match[1].split(/\|/);
//             time = metaData[0];
//             sid = maskSID == 0 ? metaData[1] : CryptoJS.MD5(metaData[1] + salt).toString(CryptoJS.enc.Hex).slice(0, 8);
//             hwset = metaData[2];
//             prob = parseInt(metaData[3]);
//             result = metaData[4];
//             if (typeof(result) == 'undefined' || result == null) {
//                 result = '1';
//             }
//             row = {
//                 'index': i,
//                 'unixtime': utime,
//                 'sid': "'" + sid + "'",
//                 'answer': "'" + answer + "'",
//                 'time': "'" + time + "'",
//                 'hwset': "'" + hwset + "'",
//                 'prob': prob,
//                 'result': "'" + result + "'",
//                 'score': "'" + Math.round(100*(result.match(/1/g) || []).length/(result.length)) + '%' + "'"
//             };
//
//             if (row[field] != "'" + value + "'") {
//                 continue;
//             }
//
//             // console.log(row);
//
//             datum = [];
//             wwFields.forEach(field => {
//                 datum.push(row[field]);
//             });
//             queryINSERT += "INSERT OR REPLACE INTO " + logTable + " (" + dbFields.join(",") + ") VALUES (" + datum.join(",") + ");";
//         }
//
//     }
//     let dbChain = database;
//
//     // setTimeout(function() {
//     //     if (queryINSERT != '' ) {
//     //         // console.log(queryINSERT);
//     //         dbChain = database.run(queryINSERT);
//     //     }
//     //     updateDB(dbChain, logTable, loglist.slice(chunkSize), field, value, total, callback);
//     //     // console.log(total);
//     //     progress += 100*(chunkSize/total);
//     //     // console.log(progress);
//     //     $('.progress-bar').attr('valuenow', progress);
//     //     $('.progress-bar').css('width', progress + '%');
//     // }, 0);
//     if (queryINSERT != '' ) {
//         // console.log(queryINSERT);
//         dbChain = database.run(queryINSERT);
//     }
//     updateDB(dbChain, logTable, loglist.slice(chunkSize), field, value, total, callback);
//     // console.log(total);
//     progress += 100*(chunkSize/total);
//     // console.log(progress);
//     $('.progress-bar').attr('valuenow', progress);
//     $('.progress-bar').css('width', progress + '%');
// }

function loadData(db, table, loglist, field, value, callback = function() {return 0;}) {
    var row;
    // var rows = [];
    var logTable = table;
    var answer, utime, metaData, time, sid, hwset, result;
    var prob = 0;
    let queryINSERT = '';
    let datum = [];
    let progress;


    console.log(loglist.length);
    // updateDB(db, table, loglist, field, value, loglist.length, callback);
    for (var i = 0; i < loglist.length - 1; i++) {

        var match = entryRegexp.exec(logList[i]);
        if (typeof(match) !== 'undefined' && match !== null)  {
            answer = match[3].replace(dqRegex, "").replace(/\t/g, ';').replace(/[^a-z0-9\s\;\+\-\_\^\(\)\[\]\*\/\\]/ig, ''); //.replace(/inf/g, '\\infty');
            utime = match[2];
            metaData = match[1].split(/\|/);
            time = metaData[0];
            sid = maskSID == 0 ? metaData[1] : CryptoJS.MD5(metaData[1] + salt).toString(CryptoJS.enc.Hex).slice(0, 8);
            hwset = metaData[2];
            prob = parseInt(metaData[3]);
            result = metaData[4];
            if (typeof(result) == 'undefined' || result == null) {
                result = '1';
            }
            row = {
                'index': i,
                'unixtime': utime,
                'sid': "'" + sid + "'",
                'answer': "'" + answer + "'",
                'time': "'" + time + "'",
                'hwset': "'" + hwset + "'",
                'prob': prob,
                'result': "'" + result + "'",
                'score': "'" + Math.round(100*(result.match(/1/g) || []).length/(result.length)) + '%' + "'"
            };

            if (row[field] != "'" + value + "'") {
                continue;
            }

            // console.log(row);
            if (i % chunkSize == 0) {
                if (queryINSERT != '' ) {
                    // console.log('INSERT');
                    // console.log(queryINSERT);
                    // setTimeout(function() {
                    //     progress = 100*i/loglist.length;
                    //     $('.progress-bar').attr('valuenow', progress);
                    //     $('.progress-bar').css('width', progress + '%');
                    // }, 0);
                    db.run(queryINSERT);
                }
                queryINSERT = '';
            }

            datum = [];
            wwFields.forEach(field => {
                datum.push(row[field]);
            });
            queryINSERT += "INSERT OR REPLACE INTO " + logTable + " (" + dbFields.join(",") + ") VALUES (" + datum.join(",") + ");";
        }
    }
    if (queryINSERT != '') {
        // console.log(queryINSERT);
        db.run(queryINSERT);
    }
    callback(db);
    // $('.progress').hide();
}

function queryHWSet(db, table, query, field, target = 'mainTable') {

	$('#' + target + ' th').css('background-color', '');
	$('#' + target + ' th').css('color', '');
	$('#' + target + ' th').find('a').css('color', '');
	$('#' + target + ' th').find('div').css('color', '');
	$('#' + target + ' td').css('border-left', '');
	$('#' + target + ' td').css('border-right', '');
	$('#' + target + ' td').css('color', '#eee');

	$('.check_all').prop('checked', false);
	$('.chkbox').prop('checked', false);


	$('#hover_msg').html('Running Query... <img style="width:5em" src="Loading_icon.gif"/>');
	$('#hover_msg').show();

	var logTable = table;
	var prev_row = null;
	var bgcolor;
	var order = 'DESC';
	headerNames = [];

	var index = 0;
	var count = 0;

	console.log('FIELD: ' + field);

	console.log('QUERY: ' + query);

    document.getElementById(target).getElementsByTagName('tbody')[0].innerHTML = '';
    let results = db.exec(query);

    console.log(results);

    if (!results.length) {
        return;
    }
    let row = {};
    let result;
    for (let i = 0; i < results[0].values.length; i++) {
        result = results[0].values[i];
        row = {};
        results[0].columns.forEach((entry, index) => {
            row[entry] = result[index];
        });
        // row = {
        //     'time' : result[0],
        //     'unixtime' : result[1],
        //     'sid' : result[2],
        //     'result' : result[3],
        //     'answer' : result[4]
        // }

        if (count < 1) {
            headerNames = [];
            $('#' + target + ' th[field!="chkbox"][field!="count"]').remove();
            for(var key in row) {
                var hfield = key.replace(/\s/g, "_").replace(/[^a-z]/ig, "");
                var $th = $("<th>", {"id" : 'th_' + hfield, 'clicked': '0', 'field': hfield, "class":'col_' + hfield});
                $th.html("<a href='#'>" + hfield + "</a><div class='triangle'>&#x25b7;</div>");
                $th.appendTo($('#' + target + ' .header_row')[0]);
                headerNames.push(hfield);
                // if (hfield == 'result') {
                //     var score_field = 'score';
                //     var $th = $("<th>", {"id" : 'th_' + score_field, 'clicked': '0', 'field': score_field, "class":'col_' + score_field});
                //     $th.html("<a href='#'>" + score_field + "</a><div class='triangle'>&#x25b7;</div>");
                //     $th.appendTo($('#' + target + ' .header_row')[0]);
                //     headerNames.push(score_field);
                // }
            }
            $('#' + target + " th[field='" + field + "']").each(function() {
                $(this).css('background-color', 'SteelBlue');
                $(this).find('a').css('color', 'white');
                $(this).find('div').css('color', 'white');
                if (clickedArray[field] == 1) {
                    $(this).find('.triangle').html('&#x25B2;');
                    $(this).find('.triangle').show();
                } else if (clickedArray[field] == -1) {
                    $(this).find('.triangle').html('&#x25BC;');
                    $(this).find('.triangle').show();
                }
            });
            updateButtons(db, logTable);
        }

        var tableRow = document.getElementById(target).getElementsByTagName('tbody')[0].insertRow(-1);
        var cell;

        cell = tableRow.insertCell(0);
        $(cell).addClass('col_chkbox');
        $(cell).attr('field', 'chkbox');
        $(cell).html('<input type="checkbox" class="chkbox">');

        cell = tableRow.insertCell(1);
        $(cell).addClass('col_count');
        $(cell).attr('field', 'count');

        if ((prev_row == null) || (prev_row[field] != row[field])) {
            // console.log('NEW GROUP ' + row[field]);
            $('#' + target + " .col_count[index='" + index + "']:not(:first)").html(count + '<strong style="float:right">-</strong>');
            $('#' + target + " td.root[index='" + index + "']").html(count);
            index++;
            count = 1;
            $(cell).addClass('root');
            $(tableRow).addClass('root');
        } else {
            count++;
            $(cell).addClass('branch');
            $(tableRow).addClass('branch');
            $(tableRow).hide();
        }
        prev_row = row;

        $(tableRow).attr('clicked', 0);
        $('#' + target + " .col_count[index='" + index + "']:not(:first)").html(count + '<strong style="float:right">-</strong>');
        $('#' + target + " td.root[index='" + index + "']").html(count);

        $(tableRow).attr('index', index);
        $(tableRow).attr('unixtime', row['unixtime']);

        $(cell).attr('index', index);
        $(cell).attr('clicked', 0);
        cell.textContent = count ;

        var cell;

        headerNames.map(function(hfield) {
            var $td = $("<td>", {'field': hfield, "class":'col_' + hfield});
            // if (hfield != 'score' && hfield != 'answer') {
            //     $td.text(row[hfield]);
            // } else if (hfield == 'score') {
            //     $td.text(Math.round(100*(row['result'].match(/1/g) || []).length/(row['result'].length)) + '%');
            // }
            if (hfield != 'answer') {
                $td.text(row[hfield]);
            }
            if (hfield == 'answer') {
                var answers = row['answer'].split(/;/);
                var results = row['result'].split("");
                var color = '#bbb';
                var $tdDiv = $("<div>", {'css': {'display':'inline-block', 'width': '100%', 'overflow-x':'auto'}});
                for (var k = 0; k < answers.length; k++) {
                    color = results[k] == 0 ? '#f00' : '#bbb';
                    var $answerCell = $("<div>", {'index': k, "class":'answer_cell', 'text': answers[k]});
                    $answerCell.css('border-color', color);
                    $answerCell.appendTo($tdDiv);
                }
                $tdDiv.appendTo($td);
            }
            $td.appendTo($(tableRow));
        });

    }

    $('#messages').html('<strong>Query Completed</strong>');
    $('#hover_msg').hide();

    $('#' + target + ' td.root').each(function() {
        var count = $(this).html();
        if (count > 1) {
            $(this).html(count + "<strong style='color:SteelBlue;float:right'>+</strong>");
        }
    });


    var colClass = 'col_' + field;

    $('.col_unixtime').hide();

    console.log('COLCLASS: ' + colClass);
    $('#' + target + ' td.' + colClass).css('border-left', '2px solid SteelBlue');
    $('#' + target + ' td.' + colClass).css('border-right', '2px solid SteelBlue');

    $('#' + target + ' td.col_answer').on('click', function() {
        $ans = $(this).find('.answer_cell');
        // console.log(ans);
        $ans.each(function() {
            if (!($(this).hasClass('rendered'))) {
                var html = '`' + $(this).html() + '`';
                $(this).html(html);
                MathJax.Hub.Queue([ "Typeset", MathJax.Hub, this]);
                $(this).addClass('rendered');
            } else {
                html = $(this).find('script[type="math/asciimath"]').html();
                $(this).html(html);
                $(this).removeClass('rendered');
            }
        });
    });

    if (field != 'unixtime') {
        $('#' + target + ' td').css('color', '#ccc');
        $('#' + target + ' td.' + colClass).css('color', '#000');
        $('#' + target + ' td.col_count').css('color', '#000');
    } else {
        $('#' + target + ' td').css('color', '#000');
    }

    $('#' + target + ' td.col_count').on('click', function() {
        // var bgcolor = $("tr[index='" + $(this).attr('index') + "']").first().css('background-color');
        var index = $(this).closest('tr').attr('index');
        var clicked = 1 - parseInt($(this).closest('tr').find('td.col_count').attr('clicked'));
        $('#' + target + " .col_count[index='" + index + "']").attr('clicked', clicked);
        $('#' + target + " .col_count[index='" + index + "']").closest('tr').attr('clicked', clicked);

        $('#' + target + " td").css('color', '');
        $('#' + target + " td." + colClass).css('color', '#000');
        $('#' + target + " td.col_count").css('color', '#000');
        $('#' + target + " tbody tr[clicked=1] td").css('color', '#000');
        $('#' + target + " tbody tr[clicked=1][index='" + index + "'] td.col_count, #" + target + " tbody tr[clicked=1][index='" + index + "'] td.col_chkbox").css('background-color', 'hsl(' + highlightHue + ', 45%, 90%');
        highlightHue = (highlightHue + 75) % 360;
        $('#' + target + " tbody tr[clicked!=1][field!='count']").css('color', '');
        $('#' + target + " tbody tr[clicked!=1] td").css('background-color', '');

        $('#' + target + " tbody tr[clicked=1]").show();
        $('#' + target + " tbody tr[clicked=1] td.col_chkbox input[type='checkbox']").prop('checked', true);
        $('#' + target + " tbody tr[clicked!=1]").hide();
        $('#' + target + " tbody tr[clicked!=1] td.col_chkbox input[type='checkbox']").prop('checked', false);
        $('#' + target + " tbody tr.root").show();

        $('#' + target + " td.col_count[clicked=1]").each(function() {
            $(this).html($(this).html().replace(/\+/, '-'));
        });
        $('#' + target + " td.col_count[clicked!=1]").each(function() {
            $(this).html($(this).html().replace(/\-/, '+'));
        });
    });

    $('#' + target + " td[field='sid']").on('click', function() {
        loadData(db, 'LogTable', logList, 'sid', $(this).text());
        // baseQuery = "select(table.time, table.unixtime, table.sid, table.prob, table.result, table.answer).from(table).where(lf.op.and(table.hwset.eq('" + $('#hwset').val() + "'), table.sid.eq('" + $(this).text() + "')))";
        baseQuery = "SELECT `time`, `unixtime`, `prob`, `result`, `answer` FROM " + logTable + " WHERE `sid` = '" + $(this).text() + "' ORDER BY `prob` ASC, `unixtime` DESC";
        $('#problem_sel').val('Select ...');
        $('#query').val(baseQuery);
        queryHWSet(db, logTable, baseQuery, 'prob', 'modalTable');
        $('#modalTable th[field="prob"]').attr('clicked', 1);
        $('.modal-title').text($('#hwset').val() + ' - ' + $(this).text());
        clickedArray['prob'] = 1;
        sortField = 'prob';
        updateButtons();
        $('#student_modal').modal('show');
    });

    $('#' + target + ' .expand_all').click(function() {
        $('#' + target + ' tr.branch').show();
    });
    $('#' + target + ' .collapse_all').on('click', function() {
        $('#' + target + ' tr.branch').hide();
    });


    // http://jsfiddle.net/jakecigar/QB9RT/
    checkBoxes = $('.chkbox');
    $('#' + target + ' .chkbox').off();
    $('#' + target + ' .chkbox').click(function (ev) {
        if (ev.shiftKey) {
            var last = checkBoxes.index(lastSelected);
            var first = checkBoxes.index(this);
            var start = Math.min(first, last);
            var end = Math.max(first, last);
            var chk = lastSelected.checked;
            for (var i = start; i <= end; i++) {
                checkBoxes[i].checked = chk;
            }
        } else {
            lastSelected = this;
        }
    });

    $('#' + target + ' .chkbox,' + '#' + target + ' .check_all').on('change', function () {
        $('#' + target + ' .chkbox').each(function() {
            if ($(this).prop('checked')) {
                $(this).closest('tr').find('td').css('color', '#000');
            } else {
                $(this).closest('tr').find('td').css('color', '');
            }
        });
    });

    $('#' + target + ' .render').click(function() {
        console.log('RENDER');
        var ans;
        $('#' + target + " .chkbox:input:checked").each(function() {
            $ans = $(this).closest('tr').find('.answer_cell');
            $ans.each(function() {
                if (!($(this).hasClass('rendered'))) {
                    var html = '`' + $(this).html() + '`';
                    $(this).html(html);
                    MathJax.Hub.Queue([ "Typeset", MathJax.Hub, this]);
                    $(this).addClass('rendered');
                }
            });
        });
    });

    $('#' + target + ' .unrender').click(function() {
        console.log('UNRENDER');
        var $answers;
        var html;
        $('#' + target + " .chkbox:input:checked").each(function() {
            $answers = $(this).closest('tr').find('.answer_cell');
            $answers.each(function() {
                html = $(this).find('script[type="math/asciimath"]').html();
                $(this).html(html);
                $(this).removeClass('rendered');
            });
        });
    });

    $('#' + target).show();
}

function updateButtons(db, logTable) {
	var fieldToLf = {};
	$('#columns_menu').html('');
	headerNames.map(function(field) {
		fieldToLf[field] = field;
		if (!(clickedArray.hasOwnProperty(field))) {
			clickedArray[field] = 0;
		}
		if(field!='unixtime') {
			var a = document.createElement("a");
			$(a).addClass("dropdown-item");
			$(a).attr('href', "#");
			$(a).html("<input class='field_checkbox' checked type='checkbox' field='" + field + "' id='" + field + "_checkbox'>&nbsp;<label class='form-check-label' for='" + field + "_checkbox'>" + field + "</label>");
			$("#columns_menu").append(a);
		}
	});
	$('.field_checkbox').on('change', function() {
		$('th[field!="chkbox"][field!="count"], td[field!="chkbox"][field!="count"]').each(function() {
			var field = $(this).attr('field');
			if ($('#' + target + " .field_checkbox[field='" + field + "'][field!='unixtime']").is(':checked')) {
				$(this).show();
			} else {
				$(this).hide();
			}
		});
		var tableWidth = $('th[field="count"]').css('width') + $('th[field="chkbox"]').css('width');
		$('th:visible').each(function() {
			tableWidth += parseInt($(this).css('width'));
		});
		console.log('TABLEWIDTH: ' + tableWidth);
		$('#mainTable').css('width', tableWidth + 'px');
		$('#table-container').css('width', tableWidth + 'px');
	});

	clickedArray['count'] = 0;
	fieldToLf['time'] = 'table.unixtime';

	$("th a").off();
	$("th[field!='count'][field!='chkbox'] a").on('click', function() {
		$('th div.triangle').html('&#x25b7;');
		sortField = $(this).closest('th').attr('field');
		var clicked = -1;
		clickedArray[sortField] = clicked;

		console.log(clickedArray);

		var problem = $('#problem_sel').val();

		query = baseQuery +  "ORDER BY `" + sortField + "` DESC, `unixtime` DESC";
		$('#query').val(query);

		queryHWSet(db, logTable, query, sortField, $(this).closest('table').attr('id'));
	});

	$(".check_all").on('click', function() {
		if ($(this).is(':checked')) {
			$('.chkbox').prop('checked', true);
		} else {
			$('.chkbox').prop('checked', false);
		}
	});

	$("th div.triangle").off();
	$("th div.triangle").on('click', function() {
		console.log('CLICKED');

		let $target = $(this).closest('table');

		$('th div.triangle').html('&#x25b7;');
		sortField = $(this).closest('th').attr('field');

		var clicked = clickedArray[sortField];
		clicked = clicked == 0 ? -1 : -1*clicked;
		clickedArray[sortField] = clicked;

		$(this).closest('th').attr('clicked', clicked);

		var $tbody = $target.find('tbody');
		if (sortField != 'count' && sortField != 'prob' && sortField != 'time' && sortField != 'score') {
			$tbody.find('tr').sort(function(a, b) {
				return clicked*($('td[field="' + sortField + '"]', a).html().localeCompare($('td[field="' + sortField + '"]', b).html())) || +$(b).attr('unixtime') - +$(a).attr('unixtime');
			}).appendTo($tbody);
		} else if (sortField == 'time') {
			$tbody.find('tr').sort(function(a, b) {
				return clicked*(+$(a).attr('unixtime') - +$(b).attr('unixtime'));
			}).appendTo($tbody);
		} else if (sortField == 'score') {
			$tbody.find('tr').sort(function(a, b) {
				return clicked*(parseInt($('td[field="' + sortField + '"]', a).html()) - parseInt($('td[field="' + sortField + '"]', b).html())) || clicked*($('td[field="result"]', a).html().localeCompare($('td[field="result"]', b).html())) || +$(b).attr('unixtime') - +$(a).attr('unixtime');
			}).appendTo($tbody);
		} else if (sortField == 'prob') {
			$tbody.find('tr').sort(function(a, b) {
				return clicked*(parseInt($('td[field="' + sortField + '"]', a).html()) - parseInt($('td[field="' + sortField + '"]', b).html())) || +$(b).attr('unixtime') - +$(a).attr('unixtime');
			}).appendTo($tbody);
		} else {
			$tbody.find('tr').sort(function(a, b) {
				return clicked*(parseInt($('td[field="' + sortField + '"]', a).html()) - parseInt($('td[field="' + sortField + '"]', b).html())) || ($('td[field="' + groupField + '"]', a).html().localeCompare($('td[field="' + groupField + '"]', b).html())) || +$(b).attr('unixtime') - +$(a).attr('unixtime');
			}).appendTo($tbody);
		}
		$tbody.find('tr.branch').each(function() {
			var index = $(this).closest('th').attr('index');
			$(this).closest('th').detach().insertAfter($("tr.root[index='" + index + "']"));
		});
		if ($(this).closest('th').attr('clicked') == 1) {
			$(this).html('&#x25B2;');
		} else if ($(this).closest('th').attr('clicked') == -1){
			$(this).html('&#x25BC;');
		}

		// http://jsfiddle.net/jakecigar/QB9RT/
		checkBoxes = $('.chkbox');
		$('.chkbox').off();
		$('.chkbox').click(function (ev) {
			if (ev.shiftKey) {
				var last = checkBoxes.index(lastSelected);
				var first = checkBoxes.index(this);
				var start = Math.min(first, last);
				var end = Math.max(first, last);
				var chk = lastSelected.checked;
				for (var i = start; i <= end; i++) {
					checkBoxes[i].checked = chk;
				}
			} else {
				lastSelected = this;
			}
		});

	});

}

function updateProblems(db, table, hwset, sortField) {
	console.log(hwset);
	$("#problem_sel").html('<option value="Select ...">Select ... </option>');
	var logTable = table;
	var options = [];
	// return db.select(lf.fn.distinct(logTable.prob)).from(logTable).where(logTable.hwset.eq(hwset)).exec().then(function(results){
    let results = db.exec('SELECT DISTINCT(`prob`) FROM ' + table + ' WHERE `hwset` =  "' + hwset + '";');
    if (!results.length) {
        return;
    }
    console.log(results[0].values);
    results[0].values.forEach(function(result) {
        options.push(result[0]);
    });
    options.sort((a, b) => a - b);
    for (var i = 0; i< options.length; i++) {
        var o = new Option("option text", "value");
        /// jquerify the DOM object 'o' so we can use the html method
        $(o).html(options[i]);
        $(o).val(options[i]);
        $("#problem_sel").append(o);
    }
    $("#problem_sel").val('Select ...');
}

$(document).ready(function () {
	document.getElementById('file-input').addEventListener('change', readSingleFile, false);
    $("#export").click(function () {
        var $table = $('#mainTable');
        var triangles = {};
        $('th').each(function() {
            var triangle = $(this).find('.triangle').detach();
            triangles[$(this).attr('field')] = triangle;
        });
        
        var html = '';
        $("td[field='answer']").each(function() {
            html = $(this).find('script[type="math/asciimath"]').html();
            $(this).html(html);
            $(this).removeClass('rendered');
        });
        
        var csv = $table.table2csv('return', {
            "separator": ",",
            "newline": "\n",
            "quoteFields": true,
            "excludeColumns": ".col_chkbox, .col_count, .col_rank",
            "excludeRows": "",
            "trimContent": true,
            "filename": "table.csv"
        });
        console.log(csv);
        var universalBOM = "\uFEFF";
        var a = document.createElement('a');
        a.setAttribute('href', 'data:text/csv;charset=UTF-8,'
        + encodeURIComponent(universalBOM + csv));
        a.setAttribute('download', 'untitled.csv');
        a.click()
        // window.location.href = 'data:text/csv;charset=UTF-8,'
        // + encodeURIComponent(csv);
        $('th').each(function() {
            $(this).append(triangles[$(this).attr('field')]);
        });
    });
});
