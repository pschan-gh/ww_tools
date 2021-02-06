var caretX;
var activeMathbox = null;
var auxBox = null;
var mqID = 0;

if ($.widget != null && typeof $.widge != 'undefined') {
    $.widget.bridge('uitooltip', $.ui.tooltip);
}

// https://stackoverflow.com/questions/31093285/how-do-i-get-the-element-being-edited
function getActiveDiv() {
    var sel = window.getSelection();
    var range = sel.getRangeAt(0);
    var node = document.createElement('span');
    range.insertNode(node);
    range = range.cloneRange();
    range.selectNodeContents(node);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    var activeDiv = node.parentNode;
    node.parentNode.removeChild(node);
    return activeDiv;
}

// https://www.codeproject.com/Questions/703255/How-to-get-caret-index-of-an-editable-div-with-res
function getCaretPosition(editableDiv) {
           var caretOffset = 0;
           if (typeof window.getSelection != "undefined") {
                var range = window.getSelection().getRangeAt(0);
                var preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(editableDiv);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                caretOffset = preCaretRange.toString().length;
            } else if (typeof document.selection != "undefined" && document.selection.type != "Control") {
                var textRange = document.selection.createRange();
                var preCaretTextRange = document.body.createTextRange();
                preCaretTextRange.moveToElementText(editableDiv);
                preCaretTextRange.setEndPoint("EndToEnd", textRange);
                caretOffset = preCaretTextRange.text.length;
            }
            return caretOffset;
        }

function pasteHtmlAtCaret(html) {
    
    var editableDiv = getActiveDiv();
    console.log(editableDiv);
    var previousNode = editableDiv.previousSibling;
    console.log(previousNode);
    var caretPos = getCaretPosition(editableDiv);
    console.log(caretPos);
    var  text = editableDiv.firstChild;
    
    var wholeText = editableDiv.firstChild.wholeText;
    
    if (wholeText == null || typeof wholeText == 'undefined') {
        wholeText = '';
    }
    var head = wholeText.substr(0, caretPos);
    var tail = wholeText.substr(caretPos, wholeText.length);
    console.log(head);
    console.log(tail);
    if (tail.length == 0) {
        tail = '&nbsp;&nbsp;';
    }
    var $newNode = $('<div class="text" contenteditable>' + head + '</div>' 
                      + html 
                      + '<div class="text" contenteditable>' + tail + '</div>' 
                  );
    editableDiv.remove();
    if (previousNode != null && typeof previousNode != 'undefined') {
        $newNode.insertAfter($(previousNode));
    } else {
        $('#editor').append($newNode);
    }
}

//https://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div
function setCaretPosition(el, caretPos) {

    var range = document.createRange();
    var sel = window.getSelection();
    
    range.setStart(el.childNodes[0], caretPos);
    range.collapse(true);
    
    sel.removeAllRanges();
    sel.addRange(range);
}

function highLightText() {
    $('#editor').find('.text').removeClass('highlight');
    $('#editor').find('.text').last().addClass('highlight');    
    $('#editor').find('.text').first().addClass('highlight'); 
}

function editorInit() {
    html = $('textarea.latexentryfield').val();
    mqID = 0;
    // mathNode = '<div class="mathbox" id="mathbox'+ mqID + '" contenteditable="false" data-mq="' + mqID + '"><span class="delete" contenteditable="false">&times;</span><span class="mq"  id="mq'+ mqID + '" data-mq="' + mqID + '"></span><span class="latex tex2jax_ignore" data-mq="' + mqID + '" contenteditable="false"></span></div>';
    var latex;
    if (html != null && typeof html != 'undefined') {
        while (html.match(/\\\(.*?\\\)/g)) {
            latex = html.match(/\\\((.*?)\\\)/)[1];
            console.log(latex);
            mathNode = '<div class="mathbox" id="mathbox'+ mqID + '" contenteditable="false" data-mq="' + mqID + '"><div class="delete" contenteditable="false">&times;</div><span class="mq"  id="mq'+ mqID + '" data-mq="' + mqID + '" contenteditable="false"></span><span class="latex tex2jax_ignore" data-mq="' + mqID + '" contenteditable="false">' + latex + '</span></div>';
            html = html.replace(/\\\(.*?\\\)/, mathNode);
            mqID++;
        }
        html = html == '' ? '<div class="text" contenteditable>&nbsp;&nbsp;</div>' : html;
        $('#editor').html(
            // '<div class="text" contenteditable>&nbsp;&nbsp;</div>' + 
            html.replace(/\\newline+/g, '<br/>' + 
            '<div class="text" contenteditable> </div>'
        ));
        // https://stackoverflow.com/questions/10730309/find-all-text-nodes-in-html-page
        var node = $('#editor')[0].firstChild;
        var failsafe = 0;
        while(node && failsafe < 1000){
            if (node.nodeType==3) {
                console.log(node.textContent);
                $(node).before('<div class="text" contenteditable>' + node.textContent + '</div>');
                $aux = $(node);
                node = node.nextSibling;
                console.log(node);
                $aux.remove();
            } else {
                node = node.nextSibling;
            }
            failsafe++;
        }
    }

    $('div.mathbox').each(function() {
        var mq = $(this).find('.mq').first()[0];
        var latex = $(this).find('.latex').first().text();
        latex = latex.replace(/\\mathbb{([a-z])}/ig,"\\$1");
        mqInit(mq, latex);
        mqID++;
    });
    
    document.getElementById("mathquill").onclick = function() {
        // $(this).hide();
        document.getElementById('editor').focus();
        pasteHtmlAtCaret('<div class="mathbox" id="mathbox'+ mqID + '" contenteditable="false" data-mq="' + mqID + '"><span class="latex tex2jax_ignore" data-mq="' + mqID + '" contenteditable="false"></span><div class="delete" contenteditable="false">&times;</div><span class="mq"  id="mq'+ mqID + '" data-mq="' + mqID + '" contenteditable="false"></span></div>');
        $('#mq' + mqID).off();        
        mqInit($('#mq' + mqID)[0]);
        $('#mq' + mqID).mousedown().mouseup();
        mqID++;
        return true;
    };
    $('#mathquill').show();
    
    highLightText();
}

function mqInit(mq, latex) {

    let localMathField = MQ.MathField(mq, {
        spaceBehavesLikeTab: true, // configurable
        leftRightIntoCmdGoes: 'up',
		restrictMismatchedBrackets: true,
		sumStartsWithNEquals: true,
		supSubsRequireOperand: true,
		autoCommands: 'pi sqrt union abs',
		rootsAreExponents: true,
		maxDepth: 10,
        handlers: {
            edit: function() { // useful event handlers
                $('#editor').find('.latex[data-mq="' + $(mq).attr('data-mq') + '"]').text(localMathField.latex()); // simple API
                $(mq).attr('data-latex', localMathField.latex());
                // asciimathSpan.value = MQtoAM(mathField.latex()); // simple API
            },
            textBlockEnter: function() {
			if (answerQuill.toolbar)
				answerQuill.toolbar.find("button").prop("disabled", true);
            },
            // Re-enable the toolbar when a text block is exited.
            textBlockExit: function() {
                if (answerQuill.toolbar)
                answerQuill.toolbar.find("button").prop("disabled", false);
            }
        }
    });

    var answerQuill = $(mq);
    
    answerQuill.mathField = localMathField ;
    if (latex) {
        answerQuill.mathField.latex(latex);
    }

    answerQuill.textarea = answerQuill.find("textarea");
    
    answerQuill.textarea.on('focusout', function() {
        // var $mq = $(this).closest('.mq').first();
        answerQuill.hasFocus = false;
        $('.mq').removeClass('infocus');  
        $('.mathbox').removeClass('infocus'); 
        setTimeout(function() {
            if (!answerQuill.hasFocus)
            {
                answerQuill.toolbar.remove();
                delete answerQuill.toolbar; 
                $(answerQuill).closest('.mathbox').find('.delete').hide();
            }
        }, 200);
        $(".symbol-button").uitooltip("close");        
        activeMathbox = null;
    });
    
    answerQuill.textarea.on('focusin', function() {
        var $mq = $(this).closest('.mq').first();
        $('.mathbox').removeClass('infocus');
        activeMathbox = $(this).closest('.mathbox').first()[0];
        auxBox = activeMathbox;
        console.log(activeMathbox);          
        $(activeMathbox).addClass('infocus');
        $(mq).addClass('infocus');
        $(activeMathbox).find('.delete').css('display', 'inline-block');
        $(activeMathbox).find('.delete').off();
        $(activeMathbox).find('.delete').click(function() {
            if (window.confirm("Delete this math box?")) {
                auxBox.remove();
                activeMathbox = null;
                auxBox = null;
            }
        });
        
        if (!answerQuill.toolbar) {
            answerQuill.toolbar = toolbarGen(answerQuill);
            answerQuill.toolbar.appendTo($('#output_problem_body').first());            
            answerQuill.toolbar.find(".button-icons").each(function() {
                MQ.StaticMath(this);
            });
        }
        
        answerQuill.toolbar.find(".symbol-button").off();
        $(".symbol-button").uitooltip( {
			items: "[data-tooltip]",
			position: {my: "right center", at: "left-5px center"},
			show: {delay: 500, effect: "none"},
			hide: {delay: 0, effect: "none"},
			content: function() {
				var element = $(this);
				if (element.prop("disabled")) return;
				if (element.is("[data-tooltip]")) { return element.attr("data-tooltip"); }
			}
		});
        answerQuill.toolbar.find(".symbol-button").on("click", function() {            
            answerQuill.hasFocus = true;
            answerQuill.mathField.cmd(this.getAttribute("data-latex"));
            answerQuill.textarea.focus();
        });
        
    });
    
    activeMathbox = $(mq).closest('.mathbox').first()[0];            
    $('.mq').removeClass('infocus');
    $(mq).addClass('infocus');
    $(activeMathbox).addClass('infocus');

}

var toolbarButtons = [
    { id: 'frac', latex: '/', tooltip: 'fraction (/)', icon: '\\frac{\\text{\ \ }}{\\text{\ \ }}' },
    { id: 'abs', latex: '|', tooltip: 'absolute value (|)', icon: '|\\text{\ \ }|' },
    { id: 'sqrt', latex: '\\sqrt', tooltip: '(\\sqrt) space', icon: '\\sqrt{\\text{\ \ }}' },
    { id: 'nthroot', latex: '\\nthroot', tooltip: 'nth root (\\root)', icon: '\\sqrt[\\text{\ \ }]{\\text{\ \ }}' },
    { id: 'exponent', latex: '^', tooltip: 'exponent (^)', icon: '\\text{\ \ }^\\text{\ \ }' },
    { id: 'subscript', latex: '_', tooltip: 'subscript (_)', icon: '\\text{\ \ }_\\text{\ \ }' },
    { id: 'vector', latex: '\\vec', tooltip: 'vector (\\vec) space', icon: '\\vec{v}' },
    // { id: 'matrix', latex: '\\pmatrix', tooltip: '(\\pmatrix) space', icon: 'matrix' },
    { id: 'matrix', latex: '\\pmatrix', tooltip: 'matrix (\\pmatrix) space<br/>Shift-Spacebar adds column<br/>Shift-Enter adds row.<br/>Backspace on a cell in empty row/column deletes row/column.', icon: '\\begin{pmatrix} \ \\end{pmatrix}' },
    { id: 'infty', latex: '\\infty', tooltip: '(\\infty) space', icon: '\\infty' },
    { id: 'pi', latex: '\\pi', tooltip: '(\\pi) space', icon: '\\pi' },
    { id: 'in', latex: '\\in', tooltip: '(\\in) space', icon: '\\in' },
    { id: 'notin', latex: '\\notin', tooltip: '(\\notin) space', icon: '\\notin' },
    { id: 'subseteq', latex: '\\subseteq', tooltip: '(\\setseteq) space', icon: '\\subseteq' },
    { id: 'Z', latex: '\\Z', tooltip: '(\\Z) space', icon: '\\Z' },
    { id: 'Q', latex: '\\Q', tooltip: '(\\Q) space', icon: '\\Q' },
    { id: 'R', latex: '\\R', tooltip: '(\\R) space', icon: '\\R' },
    { id: 'C', latex: '\\C', tooltip: '(\\C) space', icon: '\\C' },
    { id: 'vert', latex: '\\vert', tooltip: 'such that (\\vert) space', icon: '|' },
    { id: 'cup', latex: '\\cup', tooltip: '(\\cup) space', icon: '\\cup' },
    { id: 'cap', latex: '\\cap', tooltip: '(\\cap) space', icon: '\\cap' },
    { id: 'neq', latex: '\\leq', tooltip: '(\\neq) space', icon: '\\neq' },
    { id: 'leq', latex: '\\leq', tooltip: '(<=)', icon: '\\leq' },
    { id: 'geq', latex: '\\geq', tooltip: '(>=)', icon: '\\geq' },
    { id: 'lim', latex: '\\lim', tooltip: '(\\lim) space', icon: '\\lim' },
    { id: 'rightarrow', latex: '\\rightarrow', tooltip: '(\\rightarrow) space', icon: '\\rightarrow' },
    { id: 'text', latex: '\\text', tooltip: 'text mode (\\text) space, <br/> tab to end', icon: 'Tt' },
];

function toolbarGen(answerQuill) {    
    var toolbar = $("<div class='quill-toolbar' data-id='" + answerQuill.attr('id') + "'>" +
    toolbarButtons.reduce(
        function(returnString, curButton) {
            return returnString +
            "<a id='" + curButton.id + "-" + answerQuill.attr('id') +
            "' class='symbol-button btn' " +
            "' data-latex='" + curButton.latex +
            "' data-tooltip='" + curButton.tooltip + "'>" +
            "<div class='button-icons' id='icon-" + curButton.id + "-" + answerQuill.attr('id') + "'>"
            + curButton.icon +
            "</div>" +
            "</a>";
        }, ""
    ) + "</div>");

    return toolbar;
}

function latexGen() {

  var clone = document.getElementById('editor').cloneNode(true);


var oldElems = clone.getElementsByClassName("mq");

  for(var i = oldElems.length - 1; i >= 0; i--) {
	  var oldElem = oldElems.item(i);
	  var parentElem = oldElem.parentNode.parentNode;
	  var innerElem;

      var text;
      console.log(oldElem);
      if ($(oldElem).find('.latex').length) {
          text = "\\(" + $(oldElem).find('.latex').text() + "\\)";
      } else {
          text = "\\(" + $(oldElem).attr('data-latex') + "\\)";
      }
      console.log(text);
      // var textNode = document.createTextNode(text);
      var textNode = $('<span class="latex">' + text + '</span>')[0];
	  parentElem.insertBefore(textNode, oldElem.parentNode);
  }
  var html = '';
  $(clone).find('.mathbox').remove();
  $(clone).children().each(function() {
      html += $(this).text();
  });
  $('textarea.latexentryfield').val(html);
  // $('textarea.latexentryfield').val($(clone).html()
  // // .replace(/\<(\/)*(p|div|br)\>/g, '<br/>')
  // .replace(/\n\n\n+/g, '<br/>')
  // .replace(/&gt;/g, ">")
  // .replace(/&lt;/g, "<")
  // .replace(/&amp;/g, "&")  
  // .replace(/&nbsp;/g, ' ')
  // .replace(/\n */g, " "));    
  $('input[type="submit"]').show();
}

function exitMathbox() {
    if (auxBox == null || typeof auxBox == 'undefined') {
        return 0;
    }
    $('#editor').focus();
    if (window.getSelection) {
        // IE9 and non-IE
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);                    
        }
    }
    console.log(auxBox);
    console.log(auxBox.nextSibling);

    setCaretPosition(auxBox.nextSibling, 0);
    
    auxBox = null;    
}

$(function() {
    activeMathbox = null;
    mqID = 0;    
    $('#editor').off();
    $('#editor, .mq').click(function() {
        $('input[type="submit"]').hide();        
    });
    editorInit();
    $("textarea.latexentryfield").prop('readonly', true);
    
    $('#exit_mathquill').click(function() {
        exitMathbox();
    });
    
    $('#editor').keypress(function(event) {
        if (event.which === 96) {
            event.preventDefault();
            if (!$('.mq.infocus').length) {
                console.log('CREATING MATHBOX');
                $('#mathquill').click();
            } else {    
                exitMathbox();                            
            }    
        }
    });

    $('#editor').click(function(event) {
        if (!$(event.target).hasClass('text') && !$(event.target).closest('.mq').length) {
            highLightText();
            if ( $('#editor').find('.text').length ) {
                $('#editor').find('.text').last().focus();
                if ($('#editor').find('.text').last().text().length == 0) {
                    $('#editor').find('.text').last().html("&nbsp;&nbsp;");
                }
                if ($('#editor').find('.text').first().text().length == 0) {
                    $('#editor').find('.text').first().html("&nbsp;&nbsp;");
                }
            } else {
                $('#editor').append('<div class="text" contenteditable>&nbsp;&nbsp;</div>');
            }
            if ( !$('#editor').children().first().hasClass('text')) {
                $('#editor').prepend('<div class="text" contenteditable>&nbsp;&nbsp;</div>');
            }
        }
    });
    
});
