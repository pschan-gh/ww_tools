var mqID = 0;  
var activeMathbox;
var caretX;

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
    mathNode = '<span class="mathbox" id="mathbox'+ mqID + '" contenteditable="false" data-mq="' + mqID + '"><span class="mq"  id="mq'+ mqID + '" data-mq="' + mqID + '"></span><span class="latex" data-mq="' + mqID + '"></span></span>';
    var latex;
    while (html.match(/\\\(.*?\\\)/g)) {
        latex = html.match(/\\\((.*?)\\\)/)[1];
        console.log(latex);
        mathNode = '<span class="mathbox" id="mathbox'+ mqID + '" contenteditable="false" data-mq="' + mqID + '"><span class="mq"  id="mq'+ mqID + '" data-mq="' + mqID + '"></span><span class="latex" data-mq="' + mqID + '">' + latex + '</span></span>';
        html = html.replace(/\\\(.*?\\\)/, mathNode);
        mqID++;
    }
    $('#editor').html(html.replace(/\n\n+/g, '<br/>'));

    $('span.mathbox').each(function() {
        var mq = $(this).find('.mq').first()[0];
        var latex = $(this).find('.latex').first().text();
        latex = latex.replace(/\\mathbb{([a-z])}/ig,"\\$1");
        mqInit(mq, latex);
        mqID++;
    });
    
    document.getElementById("mathquill").onclick = function() {
        // $(this).hide();
        document.getElementById('editor').focus();
        pasteHtmlAtCaret('<span class="mathbox" id="mathbox'+ mqID + '" contenteditable="false" data-mq="' + mqID + '"><span class="mq"  id="mq'+ mqID + '" data-mq="' + mqID + '"></span><span class="latex" data-mq="' + mqID + '"></span></span>&nbsp;&nbsp;');
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
        handlers: {
            edit: function() { // useful event handlers
                $('#editor').find('.latex[data-mq="' + $(mq).attr('data-mq') + '"]').text(localMathField.latex()); // simple API
                // asciimathSpan.value = MQtoAM(mathField.latex()); // simple API
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
            }
        }, 200);
    });
    
    answerQuill.textarea.on('focusin', function() {
        var $mq = $(this).closest('.mq').first();
        $('.mathbox').removeClass('infocus');
        activeMathbox = $(this).closest('.mathbox').first()[0];            
        $(activeMathbox).addClass('infocus');
        $(mq).addClass('infocus');
        if (!answerQuill.toolbar) {
            answerQuill.toolbar = toolbarGen(answerQuill);
            answerQuill.toolbar.appendTo($('#output_problem_body').first());            
            answerQuill.toolbar.find(".button-icons").each(function() {
                MQ.StaticMath(this);
            });            
        }
        
        answerQuill.toolbar.find(".symbol-button").off();
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
    { id: 'sqrt', latex: '\\sqrt', tooltip: 'square root (sqrt)', icon: '\\sqrt{\\text{\ \ }}' },
    { id: 'nthroot', latex: '\\nthroot', tooltip: 'nth root (root)', icon: '\\sqrt[\\text{\ \ }]{\\text{\ \ }}' },
    { id: 'exponent', latex: '^', tooltip: 'exponent (^)', icon: '\\text{\ \ }^\\text{\ \ }' },
    { id: 'subscript', latex: '_', tooltip: 'subscript (_)', icon: '\\text{\ \ }_\\text{\ \ }' },
    { id: 'vector', latex: '\\vec', tooltip: 'vector (\\vec)', icon: '\\vec{\ \ }' },
    { id: 'matrix', latex: '\\pmatrix', tooltip: 'matrix (\\pmatrix)', icon: '\\pmatrix{& \\\\ & }' },
    { id: 'infty', latex: '\\infty', tooltip: 'infinity (inf)', icon: '\\infty' },
    { id: 'pi', latex: '\\pi', tooltip: 'pi (pi)', icon: '\\pi' },
    { id: 'in', latex: '\\in', tooltip: 'in (in)', icon: '\\in' },
    { id: 'notin', latex: '\\notin', tooltip: 'notin (notin)', icon: '\\notin' },
    { id: 'subseteq', latex: '\\subseteq', tooltip: 'subseteq (setseteq)', icon: '\\subseteq' },
    { id: 'Z', latex: '\\Z', tooltip: 'pi (pi)', icon: '\\Z' },
    { id: 'Q', latex: '\\Q', tooltip: 'pi (pi)', icon: '\\Q' },
    { id: 'R', latex: '\\R', tooltip: 'pi (pi)', icon: '\\R' },
    { id: 'C', latex: '\\C', tooltip: 'pi (pi)', icon: '\\C' },
    { id: 'vert', latex: '\\vert', tooltip: 'such that (vert)', icon: '|' },
    { id: 'cup', latex: '\\cup', tooltip: 'union (union)', icon: '\\cup' },
    { id: 'cap', latex: '\\cap', tooltip: 'intersection', icon: '\\cap' },
    { id: 'neq', latex: '\\leq', tooltip: 'not equal (neq)', icon: '\\neq' },
    { id: 'leq', latex: '\\leq', tooltip: 'less than or equal (<=)', icon: '\\leq' },
    { id: 'geq', latex: '\\geq', tooltip: 'greater than or equal (>=)', icon: '\\geq' },
    { id: 'lim', latex: '\\lim', tooltip: '', icon: '\\lim' },
    { id: 'rightarrow', latex: '\\rightarrow', tooltip: '', icon: '\\rightarrow' },
    { id: 'text', latex: '\\text', tooltip: 'text mode (")', icon: 'Tt' },
];

function toolbarGen(answerQuill) {    
    var toolbar = $("<div class='quill-toolbar' data-id='" + answerQuill.attr('id') + "' style='height:75%; overflow-y:auto'>" +
    toolbarButtons.reduce(
        function(returnString, curButton) {
            return returnString +
            "<a id='" + curButton.id + "-" + answerQuill.attr('id') +
            "' class='symbol-button btn' " +
            "' data-latex='" + curButton.latex +
            "' data-tooltip='" + curButton.tooltip + "'>" +
            "<span class='button-icons' id='icon-" + curButton.id + "-" + answerQuill.attr('id') + "'>"
            + curButton.icon +
            "</span>" +
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
  .replace(/\<(\/)*(p|div|br)\>/g, "\n\n")
  .replace(/&gt;/g, ">")
  .replace(/&lt;/g, "<")
  .replace(/&amp;/g, "&")
  .replace(/\n\n\n+/g, "\n\n")
  .replace(/&nbsp;/g, ' ')
  .replace(/\n */g, "\n"));    
  $('input[type="submit"]').show();
}


$(function() {
    var mqID = 0;    
    $('#editor').off();
    $('#editor, .mq').click(function() {
        $('input[type="submit"]').hide();        
    });
    editorInit();
    $("textarea.latexentryfield").prop('readonly', true);
    $('#editor').keypress(function(event) {
        if (event.which === 96) {
            event.preventDefault();
            $('#mathquill').click();
        }
    });
    $('#editor').keyup(function(event) {
        if (event.keyCode === 96) {
            event.preventDefault();
            $('#mathquill').click();
        }
        if (event.keyCode === 27) {
            if (!$('.mq.infocus').length) {
                return true;
            }
            event.preventDefault();
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
            console.log(activeMathbox);
            if (activeMathbox.nextSibling != null && typeof activeMathbox.nextSibling != undefined) {
                console.log(activeMathbox.nextSibling);
                setCaret(0, activeMathbox.nextSibling, '');
            } else {
                console.log("adding text node");
                var $node = $(document.createTextNode(" ")).appendTo($('#editor'));
                console.log($node[0]);
                setCaret(0, $node[0], 'new text');
            }
        }
    });
    
});
