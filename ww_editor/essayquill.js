var caretX;
var activeMathbox = null;
var auxBox = null;
var mqID = 0;

$.widget.bridge('uitooltip', $.ui.tooltip);

// http://jsfiddle.net/timdown/jwvha/527/
function pasteHtmlAtCaret(html) {
    var sel, range;
    if (window.getSelection) {
        // IE9 and non-IE
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            
            range.deleteContents();
            
            // Range.createContextualFragment() would be useful here but is
            // only relatively recently standardized and is not supported in
            // some browsers (IE9, for one)
            var el = document.createElement("div");
            el.innerHTML = html;
            var frag = document.createDocumentFragment(), node, lastNode;
            while ( (node = el.firstChild) ) {
                lastNode = frag.appendChild(node);
            }
            var firstNode = frag.firstChild;
            
            range.insertNode(frag);
            
            // Preserve the selection
            if (lastNode) {
                range = range.cloneRange();
                range.setStartAfter(lastNode);                
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    } else if ( (sel = document.selection) && sel.type != "Control") {
        // IE < 9
        var originalRange = sel.createRange();
        originalRange.collapse(true);
        sel.createRange().pasteHTML(html);
    }
}

// https://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div
function setCaret(x, yNode, html) {
    var range = document.createRange();
    var sel = window.getSelection();
    
     range.setStart(yNode, x);
    
    //
    
    var el = document.createElement("div");
    el.innerHTML = html;
    var frag = document.createDocumentFragment(), node, lastNode;
    while ( (node = el.firstChild) ) {
        lastNode = frag.appendChild(node);
    }
    var firstNode = frag.firstChild;
    
    range.insertNode(frag);
    
    // Preserve the selection
    if (lastNode) {
        range = range.cloneRange();
        range.setStartAfter(lastNode);                
        range.setStartBefore(firstNode);
    } else {
        range.setStart(yNode, x);
        range.collapse(true);            
    }
    sel.removeAllRanges();
    sel.addRange(range);
    
}

function editorInit() {
    html = $('textarea.latexentryfield').val();
    mqID = 0;
    // mathNode = '<div class="mathbox" id="mathbox'+ mqID + '" contenteditable="false" data-mq="' + mqID + '"><span class="delete">&times;</span><span class="mq"  id="mq'+ mqID + '" data-mq="' + mqID + '"></span><span class="latex tex2jax_ignore" data-mq="' + mqID + '"></span></div>';
    var latex;
    if (html != null && typeof html != 'undefined') {
        while (html.match(/\\\(.*?\\\)/g)) {
            latex = html.match(/\\\((.*?)\\\)/)[1];
            console.log(latex);
            mathNode = '<div class="mathbox" id="mathbox'+ mqID + '" contenteditable="false" data-mq="' + mqID + '"><div class="delete">&times;</div><span class="mq"  id="mq'+ mqID + '" data-mq="' + mqID + '"></span><span class="latex tex2jax_ignore" data-mq="' + mqID + '">' + latex + '</span></div>';
            html = html.replace(/\\\(.*?\\\)/, mathNode);
            mqID++;
        }
        $('#editor').html(html.replace(/\\newline+/g, '<br/>'));
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
        pasteHtmlAtCaret('<div class="mathbox" id="mathbox'+ mqID + '" contenteditable="false" data-mq="' + mqID + '"><div class="delete">&times;</div><span class="mq"  id="mq'+ mqID + '" data-mq="' + mqID + '"></span><span class="latex" data-mq="' + mqID + '"></span></div>&nbsp;&nbsp;');
        $('#mq' + mqID).off();        
        mqInit($('#mq' + mqID)[0]);
        $('#mq' + mqID).mousedown().mouseup();
        mqID++;
        return true;
    };
    $('#mathquill').show();
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
            activeMathbox.remove();
            activeMathbox = null;
            auxBox = null;
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

  var oldElems = clone.getElementsByClassName("latex");

  for(var i = oldElems.length - 1; i >= 0; i--) {
	  var oldElem = oldElems.item(i);
	  var parentElem = oldElem.parentNode.parentNode;
	  var innerElem;

      var text;
      console.log(oldElem);
      if ($(oldElem).find('script[type="math/tex; mode=display"]').length) {
          text = "\\(" + $(oldElem).find('script[type="math/tex; mode=display"]').first().text() + "\\)";
      } else {
          text = "\\(" + oldElem.textContent + "\\)";
      }
      console.log(text);
      var textNode = document.createTextNode(text);
	  parentElem.insertBefore(textNode, oldElem.parentNode);
  }
  $(clone).find('.mathbox').remove();    
  $('textarea.latexentryfield').val($(clone).html()
  .replace(/\<(\/)*(p|div|br)\>/g, '<br/>')
  .replace(/\n\n\n+/g, '<br/>')
  .replace(/&gt;/g, ">")
  .replace(/&lt;/g, "<")
  .replace(/&amp;/g, "&")  
  .replace(/&nbsp;/g, ' ')
  .replace(/\n */g, " "));    
  $('input[type="submit"]').show();
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
    
    $('#editor').keypress(function(event) {
        if (event.which === 96) {
            event.preventDefault();
            // if (auxBox == null) {
            if (!$('.mq.infocus').length) {
                console.log('CREATING MATHBOX');
                $('#mathquill').click();
            } else {                
                // if (!$('.mq.infocus').length) {
                //     return true;
                // }
                $('#editor').focus();
                if (window.getSelection) {
                    // IE9 and non-IE
                    sel = window.getSelection();
                    if (sel.getRangeAt && sel.rangeCount) {
                        range = sel.getRangeAt(0);                    
                    }
                }
                // var currentNode = range.endContainer;
                // console.log(currentNode);
                console.log(auxBox);
                console.log(auxBox.nextSibling);
                var nextTextNode = document.createTextNode(" ");
                auxBox.nextSibling.after(nextTextNode);
                setCaret(0, nextTextNode, 'new text');
                // if (auxBox.nextSibling != null && 
                //     typeof auxBox.nextSibling != undefined && 
                //     auxBox.nextSibling.nodeType == 3) {
                //     console.log(auxBox.nextSibling);
                //     var nextTextNode = document.createTextNode(" ");
                //     auxBox.nextSibling.after(nextTextNode);
                //     setCaret(0, nextTextNode, 'new text');
                // } else {
                //     console.log("adding text node");
                //     var $node = $(document.createTextNode(" ")).appendTo($('#editor'));
                //     console.log($node[0]);
                //     setCaret(0, $node[0], 'new text');
                // }
                auxBox = null;
            }
    
        }
    });
    // $('#editor').keyup(function(event) {
    //     if (event.keyCode === 192) {
    //         event.preventDefault();
    //         if (activeMathbox == null) {
    //             $('#mathquill').click();
    //         } else {
    //             if (!$('.mq.infocus').length) {
    //                 return true;
    //             }
    //             event.preventDefault();
    //             $('#editor').focus();
    //             if (window.getSelection) {
    //                 // IE9 and non-IE
    //                 sel = window.getSelection();
    //                 if (sel.getRangeAt && sel.rangeCount) {
    //                     range = sel.getRangeAt(0);                    
    //                 }
    //             }
    //             // var currentNode = range.endContainer;
    //             // console.log(currentNode);
    //             console.log(activeMathbox);
    //             if (activeMathbox.nextSibling != null && typeof activeMathbox.nextSibling != undefined) {
    //                 console.log(activeMathbox.nextSibling);
    //                 setCaret(0, activeMathbox.nextSibling, '');
    //             } else {
    //                 console.log("adding text node");
    //                 var $node = $(document.createTextNode(" ")).appendTo($('#editor'));
    //                 console.log($node[0]);
    //                 setCaret(0, $node[0], 'new text');
    //             }
    //         }
    //     }
        // if (event.keyCode === 27) {
        //     if (!$('.mq.infocus').length) {
        //         return true;
        //     }
        //     event.preventDefault();
        //     $('#editor').focus();
        //     if (window.getSelection) {
        //         // IE9 and non-IE
        //         sel = window.getSelection();
        //         if (sel.getRangeAt && sel.rangeCount) {
        //             range = sel.getRangeAt(0);                    
        //         }
        //     }
        //     // var currentNode = range.endContainer;
        //     // console.log(currentNode);
        //     console.log(activeMathbox);
        //     if (activeMathbox.nextSibling != null && typeof activeMathbox.nextSibling != undefined) {
        //         console.log(activeMathbox.nextSibling);
        //         setCaret(0, activeMathbox.nextSibling, '');
        //     } else {
        //         console.log("adding text node");
        //         var $node = $(document.createTextNode(" ")).appendTo($('#editor'));
        //         console.log($node[0]);
        //         setCaret(0, $node[0], 'new text');
        //     }
        // }
    // });
});
