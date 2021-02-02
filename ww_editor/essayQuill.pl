loadMacros("PGessaymacros.pl");

sub _essayQuill_init {

    PG_restricted_eval("sub EssayQuill {new essayQuill(\@_)}");
    
    $courseHtmlUrl = $envir{htmlURL};
    
    main::POST_HEADER_TEXT(main::MODES(TeX=>"", HTML=><<"END_SCRIPTS"));
    <link rel="stylesheet" src="$courseHtmlUrl/js/essayquill/learnosity/mathquill.css"/>    
    <script type="text/javascript" src="$courseHtmlUrl/js/essayquill/learnosity/mathquill.js"></script>
    <link rel="stylesheet" href="$courseHtmlUrl/js/essayquill/essayquill.css"/>
    <script type="text/javascript" src="$courseHtmlUrl/js/essayquill/essayquill.js"></script>
    <script>
    var MQ = MathQuillMatrix.getInterface(2);
    </script>
    <style>
    table.mq-non-leaf > tbody > tr > td {
        padding:5px;
        border: solid 1px #bbb;
    }
    .mq-non-leaf :not(.mq-supsub, .mq-scaled){
        vertical-align:middle !important;
    }
    #editor {
        /* position:absolute;
        top:100px;
        left:0px;
        margin:auto;
        margin-top:2%; */
        float:left;
        margin-left:0px;
        width:95%;
        height:95%;
        overflow-y:auto;
        border: solid 2px #ddd;
        font-family:serif;
        font-size:larger;
    }    
    </style>
END_SCRIPTS
}

package essayQuill;

sub new {
    my $self = shift;
    return $self;
}

sub Print {
    my $self = shift;

    if ($main::displayMode ne "TeX") {
        return '
        <div style="width:95%;height:50em;position:relative"> 
            <input type="button" class="btn" id="mathquill" value="Insert Math" style="margin-top:5px"/> or press $BBOLD ` $EBOLD to insert math box, $BBOLD ESC $EBOLD to leave it.
            $BR
            Matrix mode: $BBOLD Shift-Spacebar $EBOLD to add column, $BBOLD Shift-Enter $EBOLD to add row. $BBOLD Backspace $EBOLD on a cell in an empty row/column deletes the row/column.
            <div id="editor" style="height:35em" contenteditable="true">
                The derivative of a function...
            </div>
            <div>
                <a class="btn" onclick="latexGen();">Export to LaTeX</a>
            </div>
        </div>
        '.&main::essay_box();
    }
}

sub cmp {
    my $self = shift;
    return &main::essay_cmp();
}

1;
