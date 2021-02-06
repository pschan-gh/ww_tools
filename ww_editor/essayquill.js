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
// https://stackoverflow.com/questions/3972014/get-contenteditable-caret-index-position
// function getCaretPosition(editableDiv) {
//   var caretPos = 0,
//     sel, range;
//   if (window.getSelection) {
//     sel = window.getSelection();
//     if (sel.rangeCount) {
//       range = sel.getRangeAt(0);
//       if (range.commonAncestorContainer.parentNode == editableDiv) {
//         caretPos = range.endOffset;
//       }
//     }
//   } else if (document.selection && document.selection.createRange) {
//     range = document.selection.createRange();
//     if (range.parentElement() == editableDiv) {
//       var tempEl = document.createElement("span");
//       editableDiv.insertBefore(tempEl, editableDiv.firstChild);
//       var tempRange = range.duplicate();
//       tempRange.moveToElementText(tempEl);
//       tempRange.setEndPoint("EndToEnd", range);
//       caretPos = tempRange.text.length;
//     }
//   }
//   return caretPos;
// }

function pasteHtmlAtCaret(html) {
    
    var editableDiv = getActiveDiv();
    console.log(editableDiv);
    var previousNode = editableDiv.previousSibling;
    console.log(previousNode);
    var caretPos = getCaretPosition(editableDiv);
    console.log(caretPos);
    var  text = editableDiv.firstChild;
    var wholeText = editableDiv.wholeText;
    // var  text = editableDiv.firstChild;
    // var tail = text.splitText(caretPos).nextSibling.textContent;
    // var head = editableDiv.firstChild.textContent;
    try {
        var wholeText = editableDiv.firstChild.wholeText;
    } catch (error) {
        var wholeText = '';
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


// http://jsfiddle.net/timdown/jwvha/527/
// function pasteHtmlAtCaret(html) {
//     var sel, range;
//     if (window.getSelection) {
//         // IE9 and non-IE
//         sel = window.getSelection();
//         if (sel.getRangeAt && sel.rangeCount) {
//             range = sel.getRangeAt(0);
// 
//             range.deleteContents();
// 
//             // Range.createContextualFragment() would be useful here but is
//             // only relatively recently standardized and is not supported in
//             // some browsers (IE9, for one)
//             var el = document.createElement("div");
//             el.innerHTML = html;
//             var frag = document.createDocumentFragment(), node, lastNode;
//             while ( (node = el.firstChild) ) {
//                 lastNode = frag.appendChild(node);
//             }
//             var firstNode = frag.firstChild;
// 
//             range.insertNode(frag);
// 
//             // Preserve the selection
//             if (lastNode) {
//                 range = range.cloneRange();
//                 range.setStartAfter(lastNode);                
//                 range.collapse(true);
//                 sel.removeAllRanges();
//                 sel.addRange(range);
//             }
//         }
//     } else if ( (sel = document.selection) && sel.type != "Control") {
//         // IE < 9
//         var originalRange = sel.createRange();
//         originalRange.collapse(true);
//         sel.createRange().pasteHTML(html);
//     }
// }

// https://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div
function setCaret(x, yNode, html, select) {
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
    if (select) {
        if (lastNode) {
            range = range.cloneRange();
            range.setStartAfter(lastNode);                
            range.setStartBefore(firstNode);
        } else {
            range.setStart(yNode, x);
            range.collapse(true);            
        }
    }
    sel.removeAllRanges();
    sel.addRange(range);
    highLightText();
}

function highLightText() {
    $('#editor').find('.text').each(function() {
        $('#editor').find('.text').removeClass('highlight');
        if ($(this).text().length) {
            $(this).addClass('highlight');
        }
    });
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
        $('#editor').html(
            '<div class="text" contenteditable>&nbsp;&nbsp;</div>' + 
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

  // $(clone).find('#anchor').remove();
//   var oldElems = clone.getElementsByClassName("latex");

//   for(var i = oldElems.length - 1; i >= 0; i--) {
// 	  var oldElem = oldElems.item(i);
// 	  var parentElem = oldElem.parentNode.parentNode;
// 	  var innerElem;

//       var text;
//       console.log(oldElem);
//       if ($(oldElem).find('script[type="math/tex; mode=display"]').length) {
//           text = "\\(" + $(oldElem).find('script[type="math/tex; mode=display"]').first().text() + "\\)";
//       } else {
//           text = "\\(" + oldElem.textContent + "\\)";
//       }
//       console.log(text);
//       var textNode = document.createTextNode(text);
// 	  parentElem.insertBefore(textNode, oldElem.parentNode);
//   }
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
    // var currentNode = range.endContainer;
    // console.log(currentNode);
    console.log(auxBox);
    console.log(auxBox.nextSibling);
    // var nextTextNode = document.createTextNode(" ");
    // var nextTextNode = $('<div class="text" contenteditable> </div>')[0];
    // auxBox.after(nextTextNode);    
    setCaret(1, auxBox.nextSibling, 'New Text', true);
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
    $('#editor').click(function() {
        highLightText();
    });
});
