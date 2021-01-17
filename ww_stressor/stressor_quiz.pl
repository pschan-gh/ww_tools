#!/usr/bin/env perl
################################################################################ This program is free software; you can redistribute it and/or modify it under
# the terms of either: (a) the GNU General Public License as published by the
# Free Software Foundation; either version 3, or (at your option) any later
# version, or (b) the "Artistic License" which comes with this package.
#
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE.  See either the GNU General Public License or the
# Artistic License for more details.
################################################################################

# AUTHOR: Ping-Shun Chan

# The script similates <num_users> of students to submitting their answers on a WeBWorK Quiz at roughly the same time.

require 5.000;

use Time::HiRes qw(sleep usleep nanosleep);

$0 =~ s|.*/||;
if (@ARGV != 5)  {
	print "\n usage: ./$0 <course_url> <webwork_classlist> <quiz> <length> <num_users>\nwhere <quiz> is an the name of an existing quiz on the course, <length> is the number of problems on the quiz, and <num_users> is any nonnegative number less than or equal to the number of students assigned to the quiz. Each test user is assumed to have their Student_ID as their password.\nn
     e.g. ./stressor.pl https://schoolofhardknocks.edu/MATH321 math321.lst Quiz2 30 100\n\n" ;
	exit(0);
}

my ($course_url, $infile, $quiz, $length, $num_users) = @ARGV;

#https://stackoverflow.com/questions/953707/in-perl-how-can-i-read-an-entire-file-into-a-string
my $roster = do {
    local $/ = undef;
    open my $fh, "<", $infile
        or die "could not open $infile: $!";
    <$fh>;
};

$roster  =~ s/\r\n?/\n/g; ## convert DOS-style linebreaks to UNIX-style linebreaks.
my @rosterArray = split(/\n/, $roster);

my $index = 0;
foreach (@rosterArray) {
	$index++;
	last if ($index > $num_users);
    chomp;
    next unless($_=~/\w/);	        ## skip blank lines
    s/,$/, /;				## make last field non empty
    my @regArray=split(/,/);		## get fields from registrar's file
    print Dump @regArray;

    foreach (@regArray) {		## clean 'em up!
	($_) = m/^\s*(.*?)\s*$/;        ## (remove leading and trailing spaces)
    }

  ## extract the relevant fields
  my($student_id, $last_name, $first_name, $status, $comment, $section, $recitation, $email_address, $user_id, $password, $permission)
  = @regArray;

  $student_id =~ s/"//g;

  print "Executing ", $index, " ",  $student_id, "\n";

  $answers = "";

  my @choices = ('A', 'B', 'C', 'D', 'E');
  my $choice;
  for (my $i = 1; $i <= $length; $i++) {
	  my $padded = sprintf("%04d", $i);

	  # https://www.perlmonks.org/?node_id=357284
	  $choice = $choices[rand @choices];
	  $answers .= "Q$padded"."_AnSwEr0001=$choice&";
  }

  my @args = "curl --data \"submitAnswers=1&displayMode=MathJax&user=$student_id&effectiveUser=$user_id&passwd=$password&$answers\" $course_url/quiz_mode/$quiz,v1/ &\n";

  my $pause = 0.1 + rand(0.5);
  print "\nPausing for $pause seconds.\n";
  sleep($pause);

  print @args, "\n<br/>";
  system(@args);

}
