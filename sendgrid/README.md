Builder: SendGrid Dynamic template editor

Events: name | Function | Status
1. tool.auth.sendVerificationEmail_en_US | After signing up by email | Done | Backlog |
Subject: Confirm your Unitz email address

2. tool.member.created_en_US | After an admin invites another admin/teacher/student to the organization | Done | Backlog |
Subject: You’ve been invited to an organization

3. tool.teacher.course.enrolled_en_US | After an admin assign a teacher to a course | Done | Backlog | 
Subject: {{admin_name}} assigned you to the course {{course_name}}
{{course_start_date}} (example: 22 Nov 2022)
{{course_schedule}} (example: Monday, 9am - 10:30am)
Button: Prepare the lessons => This button will go to the Course overview, and the teacher can click to edit the course, and update the materials of the course and add materials for the lessons.

4. tool.user.course.enrolled_en_US | After an admin enroll a student to a course | Done | Backlog | 
Subject: You’ve been enrolled to the course {{course_name}}
Button: View the course => This button will go to the Course overview, and the student can see materials uploaded from the teacher if there are any available.

5. tool.user.program.enrolled_en_US | After an admin enroll a student to a program | Done | Backlog |
Subject: You’ve been enrolled to the program {{program_name}}
Button: View the program => This button will go to the Program overview, and the student can see courses within the program.

6. tool.member.lesson.cancelled_en_US | After the lesson was canceled by the teacher or the school admin | Done | Backlog |
Subject: The lesson on {{lesson_time}} of the course {{course_name}} has been canceled

7. tool.member.lesson.rescheduled_en_US | After the lesson was rescheduled by the teacher or the school admin | Done | Backlog | 
Subject: The lesson on {{lesson_time}} of the course {{course_name}} has been rescheduled to {{new_lesson_time}}
  
8. tool.auth.sendResetPasswordEmail_en_US | After clicking reset password button | Done | Backlog | 
Subject: Unitz Password Reset 

9. tool.admin.welcome_en_Us | After user successfully confirmed their email address and created an organization on Unitz | In Progress

10. tool.teacher.welcome_en_Us | After teacher successfully confirmed their email address and joined an organization on Unitz | In Progress

11. tool.student.welcome_en_Us | After student successfully confirmed their email address and joined an organization on Unitz | In Progress

12. tool.user.room.remind | Thông báo tới giờ vào lớp (trước n phút)|NO EMAILS!
13. tool.teacher.room.remind | Thông báo tới giờ vào lớp (trước n phút)|NO EMAILS!


