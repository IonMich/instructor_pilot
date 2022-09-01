import pandas as pd
import autocanvas.core as ac
from autocanvas.core.conversions import (
    series_from_api_object,
    df_from_api_list)
import os
from autocanvas.config import get_API_key
from autocanvas.config import INPUT_DIR, OUTPUT_DIR
from canvasapi import Canvas
API_URL = "https://ufl.instructure.com/"
CANVAS_API_KEY = get_API_key()

def get_canvas_object():
    """
    Return a Canvas object.
    """
    return Canvas(API_URL, CANVAS_API_KEY)

def get_canvas_course(course_code=None, term_name=None, canvas_id=None):
    """
    Return a Canvas course object from a database course.
    """ 
    list_to_include = [
            "course_image","observed_users",
            "teachers","total_students",
            "sections","course_progress",
            "term","public_description"]
    canvas = Canvas(API_URL, CANVAS_API_KEY)
    if canvas_id is not None:
        return canvas.get_course(
            int(canvas_id), 
            use_sis_id=False,
            include=list_to_include)
    canvas_courses = canvas.get_courses(
        enrollment_state="active", 
        include=list_to_include)

    # TODO: much more info is available in the Canvas API
    # so we can add some more columns to the database
    for canvas_course in canvas_courses:
        if (canvas_course.course_code == course_code 
                and canvas_course.term["name"] == term_name):
            return canvas_course
    return None
    

def canvas_users_df(canvas_course):
    """
    Return a Pandas DataFrame of users in a course.
    """
    df_TAs, df_teachers = ac.course_info.get_teaching_personel(
        canvas_course, 
        add_first_name=True, 
        groups=["teacher", "ta"])

    # file_name = "sections_phy2048_spring2022.csv"
    # file_path = os.path.join(INPUT_DIR, file_name)
    df_students, df_sections = ac.course_info.get_students_from_sections(
                                    canvas_course, add_TA_info=False)
    return df_TAs, df_teachers, df_students, df_sections