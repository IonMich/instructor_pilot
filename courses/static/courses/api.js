export async function getAvailableCanvasCourses () {
    const url = '/canvas_courses/'
    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };
    try {
        const response = await fetch(url, options);
        if (response.ok) {
            const data = await response.json();
            return data.courses
        }
        throw new Error('Network response was not ok.');
    }
    catch (error) {
        console.log(error);
        return [];
    }
}

export async function getCanvasCourse (courseCanvasId) {
    const url = `/canvas_courses/${courseCanvasId}/`
    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };
    try {
        const response = await fetch(url, options);
        if (response.ok) {
            const data = await response.json();
            return data.course
        }
        throw new Error('Network response was not ok.');
    }
    catch (error) {
        console.log(error);
        return {};
    }
}

export async function getAvailableCanvasSectionsStudentsDescription(courseCanvasId) {
    const url = `/canvas_courses/${courseCanvasId}/sections/`
    
    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };
    try {
        const response = await fetch(url, options);
        if (response.ok) {
            const data = await response.json();
            return [data.sections, data.students, data.course_description];
        }
        throw new Error('Network response was not ok.');
    }
    catch (error) {
        console.log(error);
        return [];
    }
}

async function getCanvasAssignmentGroups(courseCanvasId) {
    const url = `/canvas_courses/${courseCanvasId}/assignment_groups/`;

    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    let data;
    try {
        const response = await fetch(url, options);
        data = await response.json();
        console.log(data);
    }
    catch (error) {
        console.log(error);
    }
    return data;
}

async function getCanvasAssignments(courseCanvasId) {
    const url = `/canvas_courses/${courseCanvasId}/assignments/`;

    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };
    let data;
    try {
        const response = await fetch(url, options);
        data = await response.json();
        console.log(data);
    }
    catch (error) {
        console.log(error);
    }
    return data;
}

async function getCanvasAnnouncements(canvasCourseId) {
    const url = `/canvas_courses/${canvasCourseId}/announcements/`;

    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    let data;
    try {
        const response = await fetch(url, options);
        data = await response.json();
        console.log(data);
    }
    catch (error) {
        console.log(error);
    }
    return data;
}

async function handleCreateSectionsSubmit(selectedCanvasSections, courseId) {
    console.log(selectedCanvasSections);
    const url = `/courses/${courseId}/sections/`;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const sectionCreationData = [];
    for (const section of selectedCanvasSections) {
        console.log(section);
        const formData = new FormData();
        formData.append('canvas_id', section.id);
        formData.append('name', section.name);
        formData.append('class_number', section.classNumber || '');
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            // stringify the formData object
            body: JSON.stringify(
                Object.fromEntries(formData)
            ),

        };
        try {
            const response = await fetch(url, options);
            let data = await response.json();
            sectionCreationData.push(data);
            const meetResponseData = await createMeetings(data.section_id, section.meetTimes);
            meetResponseData.section = data;
            sectionCreationData.push(meetResponseData);
        }
        catch (error) {
            console.log(error);
            return {
                message: 'Error creating section',
                success: false,
            };
        }
    }
    return {
        message: 'Successfully created sections',
        success: true,
        sectionCreationData,
        category: 'sections'
    };
};

async function createMeetings(sectionId, meetTimes) {
    const url = `/sections/${sectionId}/meetings/`;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    const optionsDelete = {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
    };
    let data;
    try {
        const response = await fetch(url, optionsDelete);
        data = await response.json();
        console.log(data);
    }
    catch (error) {
        console.log(error);
        return {};
    }

    if (!meetTimes) {
        return data;
    }
    const canvasAPItimeNames = ['meetTimeBegin', 'meetTimeEnd'];
    const dbTimeNames = ['start_time', 'end_time'];
    for (const meetTime of meetTimes) {
        const formData = new FormData();
        formData.append('day', meetTime.meetDays.join(''));
        for (let i = 0; i < canvasAPItimeNames.length; i++) {
            const time = meetTime[canvasAPItimeNames[i]];
            const dbTimeName = dbTimeNames[i];
            const timeAsDate = new Date(`1/1/2021 ${time}`);
            console.log(timeAsDate);
            const timeAs24Hour = timeAsDate.getHours() + ':' + timeAsDate.getMinutes();
            console.log(timeAs24Hour);
            formData.append(dbTimeName, timeAs24Hour);
        }
        formData.append('location', meetTime.meetBuilding ? `${meetTime.meetBuilding} ${meetTime.meetRoom}` : '');
        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            // stringify the formData object
            body: JSON.stringify(
                Object.fromEntries(formData)
            ),

        };
        let dataMeet;
        try {
            const response = await fetch(url, options);
            dataMeet = await response.json();
            console.log(`Meeting created for ${sectionId}`);
        }
        catch (error) {
            console.log(error);
            return {};
        }

        return dataMeet;
    }
}

async function populateSectionsWithStudents(selectedCanvasStudents, courseId) {
    const url = `/courses/${courseId}/students/`;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const all_data = [];
    const formData = new FormData();
    formData.append('course_id', courseId);
    let studentsData = [];

    for (const student of selectedCanvasStudents) {
        console.log(`Adding ${student.sortable_name} to the course`);
        const studentData = {
            canvas_id: student.id,
            last_name: student.sortable_name.split(',')[0].trim(),
            first_name: student.sortable_name.split(',')[1].trim(),
            uni_id: student.sis_user_id || student.sis_login_id || student.uuid || `canvas:${student.id}`,
            email: student.sis_login_id || null,
            section_id: student.enrollments[0].course_section_id,
            bio: student.bio || '',
            avatar_url: student.avatar_url || '',
        };
        console.log(studentData);
        studentsData.push(studentData);
    }
    formData.append('students', JSON.stringify(studentsData));

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(
            Object.fromEntries(formData)
        ),
    };
    let data;
    try {
        const response = await fetch(url, options);
        data = await response.json();
        console.log(data);
        all_data.push(data);
    }
    catch (error) {
        console.log(error);
        all_data.push(error);
        return {
            "success": false,
            "message": "Could not add students to course",
        }
    }

    return {
        "success": true,
        "data": all_data,
        "message": "Successfully added students to course",
        "category": "students",
    }
}

async function createAssignmentGroups(courseCanvasId, courseId) {
    const url = `/courses/${courseId}/assignment_groups/`;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const canvasAssignmentGroupsData = await getCanvasAssignmentGroups(courseCanvasId);
    if (!canvasAssignmentGroupsData.success) {
        console.log(canvasAssignmentGroupsData);
        return {
            "success": false,
            "message": "Could not get assignment groups from Canvas",
        }
    }
    console.log(canvasAssignmentGroupsData.assignment_groups);
    for (const assignmentGroup of canvasAssignmentGroupsData.assignment_groups) {
        const index = canvasAssignmentGroupsData.assignment_groups.indexOf(assignmentGroup);
        console.log(assignmentGroup);
        const formData = new FormData();
        formData.append('canvas_id', assignmentGroup.id);
        formData.append('name', assignmentGroup.name);
        formData.append('position', assignmentGroup.position || index);
        formData.append('group_weight', assignmentGroup.group_weight || '0');

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            // stringify the formData object
            body: JSON.stringify(
                Object.fromEntries(formData)
            ),
        };

        let data;
        try {
            const response = await fetch(url, options);
            data = await response.json();
            console.log(data);
        }
        catch (error) {
            console.log(error);
        }
    }
    return {
        "success": true,
        "message": "Assignment groups created",
        "category": "assignment-groups",
    }
}

async function createAssignments(courseCanvasId, courseId) {
    const url = `/courses/${courseId}/assignments/`;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const canvasAssignmentsData = await getCanvasAssignments(courseCanvasId);
    if (!canvasAssignmentsData.success) {
        console.log(canvasAssignmentsData);
        return {
            "success": false,
            "message": "Could not get assignments from Canvas",
        }
    }
    console.log(canvasAssignmentsData.assignments);
    for (const assignment of canvasAssignmentsData.assignments) {
        console.log(assignment);
        const formData = new FormData();
        formData.append('canvas_id', assignment.id);
        formData.append('name', assignment.name);
        formData.append('description', assignment.description || '');
        formData.append('max_question_scores', assignment.points_possible || '0');
        formData.append('position', assignment.position || '0');
        formData.append('assignment_group_object_id', assignment.assignment_group_id || '');

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            // stringify the formData object
            body: JSON.stringify(
                Object.fromEntries(formData)
            ),
        };

        let data;
        try {
            const response = await fetch(url, options);
            data = await response.json();
            console.log(data);
        }
        catch (error) {
            console.log(error);
        }
    }
    return {
        "success": true,
        "message": "Assignments created",
        "category": "assignments",
    }
}

async function createAnnouncements(courseCanvasId, courseId) {
    const url = `/courses/${courseId}/announcements/`;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const canvasAnnouncementsData = await getCanvasAnnouncements(courseCanvasId);
    if (!canvasAnnouncementsData.success) {
        console.log(canvasAnnouncementsData);
        return {
            "success": false,
            "message": "Could not get announcements from Canvas",
        }
    }
    console.log(canvasAnnouncementsData.announcements);
    for (const announcement of canvasAnnouncementsData.announcements) {
        console.log(announcement);
        const formData = new FormData();
        if (!announcement.posted_at) {
            continue;
        }
        formData.append('canvas_id', announcement.id);
        formData.append('title', announcement.title);
        formData.append('body', announcement.message);
        formData.append('author', announcement.author.display_name || "");
        formData.append('date', announcement.posted_at);


        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            // stringify the formData object
            body: JSON.stringify(
                Object.fromEntries(formData)
            ),
        };

        let data;
        try {
            const response = await fetch(url, options);
            data = await response.json();
            console.log(data);
        }
        catch (error) {
            console.log(error);
        }
    }
    return {
        "success": true,
        "message": "Announcements created",
        "category": "announcements",
    }
}

export async function orchistrateCourseElementsUpdateOrCreate(
    selectedCanvasSections,
    selectedCanvasStudents,
    courseCanvasId,
    courseId,
    statusUpdateHandler,
    ) {
    const sectionsCreationData = await handleCreateSectionsSubmit(selectedCanvasSections, courseId);
    statusUpdateHandler(sectionsCreationData);
    if (!sectionsCreationData.success) {
        return;
    }
    console.log(sectionsCreationData);
    const studentCreationData = await populateSectionsWithStudents(selectedCanvasStudents, courseId);
    statusUpdateHandler(studentCreationData);
    if (!studentCreationData.success) {
        return;
    }
    console.log(studentCreationData);
    const assignmentGroupsCreationData = await createAssignmentGroups(
        courseCanvasId,
        courseId
    );
    statusUpdateHandler(assignmentGroupsCreationData);
    if (!assignmentGroupsCreationData.success)
        return;
    const assignmentsCreationData = await createAssignments(
        courseCanvasId,
        courseId
    );
    statusUpdateHandler(assignmentsCreationData);
    if (!assignmentsCreationData.success)
        return;

    const announcementsCreationData = await createAnnouncements(courseCanvasId, courseId);
    statusUpdateHandler(announcementsCreationData);
    if (!announcementsCreationData.success)
        return;
    return {
        "success": true,
        "message": "All course elements created",
    }
}