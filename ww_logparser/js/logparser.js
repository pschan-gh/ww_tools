var hwsets = [];
var sortField = 'undefined';
var groupField = 'undefined';
var headerNames = [];
var baseQuery;
var clickedArray = {};
var highlightHue = 0;

var lastSelected;
var checkBoxes;

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

	var dqRegex = /\"/ig;

	var contents = contents.replace(/,/g, '_');

	var dbName = 'alDB' + contents.hashCode();
	console.log('DB NAME: ' + dbName);

	var schemaBuilder = lf.schema.create(dbName, 1);
	schemaBuilder.createTable('LogTable').addColumn('sid', lf.Type.STRING).addColumn('answer', lf.Type.STRING).addColumn('index', lf.Type.INTEGER).addColumn('unixtime', lf.Type.INTEGER).addColumn('time', lf.Type.STRING).addColumn('hwset', lf.Type.STRING).addColumn('prob', lf.Type.INTEGER).addColumn('result', lf.Type.STRING).
	addPrimaryKey(['index']).
	addIndex('idxSID', ['sid'], false, lf.Order.DESC);

	schemaBuilder.connect().then(function(db) {
		console.log('CONNECTED');
		var row;
		var rows = [];
		var logTable = db.getSchema().table('LogTable');
		var entryRegexp = /^(.*?)\t(\d+)\t(.*?)$/;
		var logList = contents.split(/\r?\n/);
		var answer, utime, metaData, time, sid, hwset, result;
		var prob = 0;
		for (var i = 0; i < logList.length - 1; i++) {
			var match = entryRegexp.exec(logList[i]);
			if (typeof(match) !== 'undefined' && match !== null)  {
				answer = match[3].replace(dqRegex, "'").replace(/\t/g, ' ; ');
				utime = match[2];
				metaData = match[1].split(/\|/);
				time = metaData[0];
				sid = metaData[1];
				hwset = metaData[2];
				prob = parseInt(metaData[3]);
				result = metaData[4];
				if (typeof(result) == 'undefined' || result == null) {
					result = '1';
				}

				row = logTable.createRow({
					'index': i,
					'unixtime': utime,
					'sid': sid,
					'answer': answer,
					'time': time,
					'hwset': hwset,
					'prob': prob,
					'result': result
				});
				console.log(row);
				rows.push(row);

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
		}

		console.log('INSERT');
		db.insertOrReplace().into(logTable).values(rows).exec().then(function() {
			$('#messages').html('<strong>Database Loaded.</strong>');
			$('#hover_msg').hide();

			$('#hwset').on('change', function() {
				//queryHWSet(db, logTable, this.value, null, $("th[field='time']")[0]);
				baseQuery = "select(table.time, table.sid, table.result, table.answer).from(table).where(table.hwset.eq('" + $(this).val() +"'))";
				$('#query').val(baseQuery);
				updateProblems(db, logTable, $('#hwset').val());
			});

			$('#problem_sel').on('change', function() {
				var problem = $(this).val();
				baseQuery = "select(table.time, table.unixtime, table.sid, table.result, table.answer).from(table).where(lf.op.and(table.hwset.eq('" + $('#hwset').val() +"'), table.prob.eq('" + problem + "')))";
				$('#query').val(baseQuery);
				clickedArray['time'] = -1;
				queryHWSet(db, logTable, baseQuery, 'time');
				$('#export').show();

			});

			$('#submit').on('click', function() {
				baseQuery = $('#query').val();
				queryHWSet(db, logTable, baseQuery, 'unixtime');
			});

			$('#controlPanel').css('display', 'inline-block');
			updateProblems(db, logTable, $('#hwset').val());

		});
	});
}

function queryHWSet(db, table, query, field) {

	$('th').css('background-color', '');
	$('th').css('color', '');
	$('th').find('a').css('color', '');
	$('th').find('div').css('color', '');
	$('td').css('border-left', '');
	$('td').css('border-right', '');
	$('td').css('color', '#eee');

	$('#check_all').prop('checked', false);
	$('.chkbox').prop('checked', false);


	$('#hover_msg').html('Running Query... <img style="width:5em" src="Loading_icon.gif"/>');
	$('#hover_msg').show();

	var logTable = table;
	var prev_row = null;
	var bgcolor;
	var order = lf.Order.DESC;
	headerNames = [];

	var index = 0;
	var count = 0;

	console.log('FIELD: ' + field);

	console.log('QUERY: ' + query);
	var queryFunc = new Function('db', 'table',  'return db.' + query + '.orderBy(table.unixtime, lf.Order.DESC).exec()');

	return queryFunc(db, logTable).then(function(rows) {
		document.getElementById('mainTable').getElementsByTagName('tbody')[0].innerHTML = '';
		rows.forEach(function(row) {

			if (count < 1) {
				headerNames = [];
				$('th[field!="chkbox"][field!="count"]').remove();
				for(var key in row) {
					var hfield = key.replace(/\s/g, "_").replace(/[^a-z]/ig, "");
					var $th = $("<th>", {"id" : 'th_' + hfield, 'clicked': '0', 'field': hfield, "class":'col_' + hfield});
					$th.html("<a href='#'>" + hfield + "</a><div class='triangle'>&#x25b7;</div>");
					$th.appendTo($('#header_row'));
					headerNames.push(hfield);
					if (hfield == 'result') {
						var score_field = 'score';
						var $th = $("<th>", {"id" : 'th' + score_field, 'clicked': '0', 'field': score_field, "class":'col_' + score_field});
						$th.html("<a href='#'>" + score_field + "</a><div class='triangle'>&#x25b7;</div>");
						$th.appendTo($('#header_row'));
						headerNames.push(score_field);
					}
				}
				$("th[field='" + field + "']").each(function() {
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

			var tableRow = document.getElementById('mainTable').getElementsByTagName('tbody')[0].insertRow(-1);
			var cell;

			cell = tableRow.insertCell(0);
			$(cell).addClass('col_chkbox');
			$(cell).attr('field', 'chkbox');
			$(cell).html('<input type="checkbox" class="chkbox">');

			cell = tableRow.insertCell(1);
			$(cell).addClass('col_count');
			$(cell).attr('field', 'count');

			if ((prev_row == null) || (prev_row[field] != row[field])) {
				// $(".col_count[index='" + index + "']:not(:first)").html(count + '&#x21b3;');
				$(".col_count[index='" + index + "']:not(:first)").html(count + '<strong style="float:right">-</strong>');
				$("td.root[index='" + index + "']").html(count);
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
			$(tableRow).attr('clicked', 0);
			$(".col_count[index='" + index + "']:not(:first)").html(count + '<strong style="float:right">-</strong>');
			$("td.root[index='" + index + "']").html(count);

			$(tableRow).attr('index', index);
			$(tableRow).attr('unixtime', row['unixtime']);

			$(cell).attr('index', index);
			$(cell).attr('clicked', 0);
			cell.textContent = count ;

			var cell;

			headerNames.map(function(hfield) {
				var $td = $("<td>", {'field': hfield, "class":'col_' + hfield});
				if (hfield != 'score' && hfield != 'answer') {
					$td.text(row[hfield]);
				} else if (hfield == 'score') {
					$td.text(Math.round(100*(row['result'].match(/1/g) || []).length/(row['result'].length)) + '%');
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

			prev_row = row;
		});
		$('#messages').html('<strong>Query Completed</strong>');
		$('#hover_msg').hide();

		$('td.root').each(function() {
			var count = $(this).html();
			if (count > 1) {
				$(this).html(count + "<strong style='color:SteelBlue;float:right'>+</strong>");
			}
		});


		var colClass = 'col_' + field;

		$('.col_unixtime').hide();

		console.log('COLCLASS: ' + colClass);
		$('td.' + colClass).css('border-left', '2px solid SteelBlue');
		$('td.' + colClass).css('border-right', '2px solid SteelBlue');

		$('td.col_answer').on('click', function() {
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
			$('td').css('color', '#ccc');
			$('td.' + colClass).css('color', '#000');
			$('td.col_count').css('color', '#000');
		} else {
			$('td').css('color', '#000');
		}

		$('td.col_count').on('click', function() {
			// var bgcolor = $("tr[index='" + $(this).attr('index') + "']").first().css('background-color');
			var index = $(this).closest('tr').attr('index');
			var clicked = 1 - parseInt($(this).closest('tr').find('td.col_count').attr('clicked'));
			$(".col_count[index='" + index + "']").attr('clicked', clicked);
			$(".col_count[index='" + index + "']").closest('tr').attr('clicked', clicked);

			$("td").css('color', '');
			$("td." + colClass).css('color', '#000');
			$("td.col_count").css('color', '#000');
			$("tbody tr[clicked=1] td").css('color', '#000');
			$("tbody tr[clicked=1][index='" + index + "'] td.col_count, tbody tr[clicked=1][index='" + index + "'] td.col_chkbox").css('background-color', 'hsl(' + highlightHue + ', 45%, 90%');
			highlightHue = (highlightHue + 75) % 360;
			$("tbody tr[clicked!=1][field!='count']").css('color', '');
			$("tbody tr[clicked!=1] td").css('background-color', '');

			$("tbody tr[clicked=1]").show();
			$("tbody tr[clicked=1] td.col_chkbox input[type='checkbox']").prop('checked', true);
			$("tbody tr[clicked!=1]").hide();
			$("tbody tr[clicked!=1] td.col_chkbox input[type='checkbox']").prop('checked', false);
			$("tbody tr.root").show();

			$("td.col_count[clicked=1]").each(function() {
				$(this).html($(this).html().replace(/\+/, '-'));
			});
			$("td.col_count[clicked!=1]").each(function() {
				$(this).html($(this).html().replace(/\-/, '+'));
			});
		});

		$("td[field='sid']").on('click', function() {
			// baseQuery = "select(table.time, table.unixtime, table.sid, table.result, table.answer).from(table).where(lf.op.and(table.prob.eq('" + $('#problem_sel').val() + "'), table.sid.eq('" + $(this).text() + "')))";
			baseQuery = "select(table.time, table.unixtime, table.sid, table.prob, table.result, table.answer).from(table).where(lf.op.and(table.hwset.eq('" + $('#hwset').val() + "'), table.sid.eq('" + $(this).text() + "')))";
			$('#problem_sel').val('Select ...');
			$('#query').val(baseQuery);
			queryHWSet(db, logTable, baseQuery + '.orderBy(table.prob, lf.Order.ASC)', 'prob');
			$('th[field="prob"]').attr('clicked', 1);
			clickedArray['prob'] = 1;
			sortField = 'prob';
			updateButtons();
		});

		// mathViewInitialize();
		$('#expand').click(function() {
			$('tr.branch').show();
		});
		$('#collapse').on('click', function() {
			$('tr.branch').hide();
		});


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

		$('.chkbox, #check_all').on('change', function () {
			$('.chkbox').each(function() {
				if ($(this).prop('checked')) {
					$(this).closest('tr').find('td').css('color', '#000');
				} else {
					$(this).closest('tr').find('td').css('color', '');
				}
			});
		});

		$('#render').click(function() {
			console.log('RENDER');
			var ans;
			$(".chkbox:input:checked").each(function() {
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

		$('#unrender').click(function() {
			console.log('UNRENDER');
			var $answers;
			var html;
			$(".chkbox:input:checked").each(function() {
				$answers = $(this).closest('tr').find('.answer_cell');
				$answers.each(function() {
					html = $(this).find('script[type="math/asciimath"]').html();
					$(this).html(html);
					$(this).removeClass('rendered');
				});
			});
		});

		$('#mainTable').show();
	});
}

function updateButtons(db, logTable) {
	var fieldToLf = {};
	$('#columns_menu').html('');
	headerNames.map(function(field) {
		fieldToLf[field] = 'table.' + field;
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
			if ($(".field_checkbox[field='" + field + "'][field!='unixtime']").is(':checked')) {
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
	$("th[field!='count'][field!='chkbox'][field!='score'] a").on('click', function() {
		$('th div.triangle').html('&#x25b7;');
		sortField = $(this).closest('th').attr('field');
		groupField = sortField;
		var sort = fieldToLf[sortField];

		var clicked = -1;
		clickedArray[sortField] = clicked;

		console.log(clickedArray);

		var problem = $('#problem_sel').val();

		query = baseQuery +  ".orderBy(" + sort + ", lf.Order.DESC)";
		$('#query').val(query);

		queryHWSet(db, logTable, query, sortField);
	});

	$("#check_all").on('click', function() {
		if ($(this).is(':checked')) {
			$('.chkbox').prop('checked', true);
		} else {
			$('.chkbox').prop('checked', false);
		}
	});

	$("th div.triangle").off();
	$("th div.triangle").on('click', function() {
		console.log('CLICKED');
		$('th div.triangle').html('&#x25b7;');
		sortField = $(this).closest('th').attr('field');

		var clicked = clickedArray[sortField];
		clicked = clicked == 0 ? -1 : -1*clicked;
		clickedArray[sortField] = clicked;

		$(this).closest('th').attr('clicked', clicked);

		var tbody = $('#mainTable').find('tbody');
		if (sortField != 'count' && sortField != 'prob' && sortField != 'time' && sortField != 'score') {
			tbody.find('tr').sort(function(a, b) {
				return clicked*($('td[field="' + sortField + '"]', a).html().localeCompare($('td[field="' + sortField + '"]', b).html())) || +$(b).attr('unixtime') - +$(a).attr('unixtime');
			}).appendTo(tbody);
		} else if (sortField == 'time') {
			tbody.find('tr').sort(function(a, b) {
				return clicked*(+$(a).attr('unixtime') - +$(b).attr('unixtime'));
			}).appendTo(tbody);
		} else if (sortField == 'score') {
			tbody.find('tr').sort(function(a, b) {
				return clicked*(parseInt($('td[field="' + sortField + '"]', a).html()) - parseInt($('td[field="' + sortField + '"]', b).html())) || clicked*($('td[field="result"]', a).html().localeCompare($('td[field="result"]', b).html())) || +$(b).attr('unixtime') - +$(a).attr('unixtime');
			}).appendTo(tbody);
		} else {
			tbody.find('tr').sort(function(a, b) {
				return clicked*(parseInt($('td[field="' + sortField + '"]', a).html()) - parseInt($('td[field="' + sortField + '"]', b).html())) || ($('td[field="' + groupField + '"]', a).html().localeCompare($('td[field="' + groupField + '"]', b).html())) || +$(b).attr('unixtime') - +$(a).attr('unixtime');
			}).appendTo(tbody);
		}
		tbody.find('tr.branch').each(function() {
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
	return db.select(lf.fn.distinct(logTable.prob)).from(logTable).where(logTable.hwset.eq(hwset)).exec().then(function(results){
		results.forEach(function(result) {
			options.push(result['DISTINCT(prob)']);
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
	});

}

$(document).ready(function () {
	document.getElementById('file-input').addEventListener('change', readSingleFile, false);
	$('table').each(function () {
		var $table = $(this);
		var triangles = {};

		$("#export").click(function () {
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

			var csv = $table.table2CSV({
				delivery: 'value'
			});
			window.location.href = 'data:text/csv;charset=UTF-8,'
			+ encodeURIComponent(csv);
			$('th').each(function() {
				$(this).append(triangles[$(this).attr('field')]);
			});
		});
	});
})
