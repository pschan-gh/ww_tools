# ww_stressor
 Automated WeBWorK Gateway Quiz Stress Test

* **stressor_quiz_init.pl** similates the initial logging in of ``<num_users>`` of students to take a WeBWorK Quiz at roughly the same time.

usage: ``./stressor_quiz_init.pl <course_url> <webwork_classlist> <quiz> <num_users>``
 
where ``<quiz>`` is an the name of an existing quiz on the course, and ``<num_users>`` is any nonnegative number less than or equal to the number of students assigned to the quiz. Each test user is assumed to have their ``Student_ID`` as their password.

 e.g. ``./stressor.pl https<span></span>://schoolofhardknocks.edu/MATH321 math321.lst Quiz2 100`` 
 
* **stressor_quiz.pl** similates <num_users> of students to submitting their answers on a WeBWorK Quiz at roughly the same time.
 
 usage: ``./stressor_quiz.pl <course_url> <webwork_classlist> <quiz> <length> <num_users>``
 
where ``<quiz>`` is an the name of an existing quiz on the course, ``<length>`` is the total number of problems on the quiz, and ``<num_users>`` is any nonnegative number less than or equal to the number of students assigned to the quiz. Each test user is assumed to have their ``Student_ID`` as their password.

*Each problem of the quiz is assumed to consist of a single multiple-choice question with "A" as a valid choice.*

e.g. ``./stressor.pl https<span></span>://schoolofhardknocks.edu/MATH321 math321.lst Quiz2 30 100``
