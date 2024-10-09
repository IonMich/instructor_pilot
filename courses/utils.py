import os
from os.path import join
from pathlib import Path

from canvasapi import Canvas
from dotenv import load_dotenv


def get_API_key():
    PACKAGE_DIR = os.path.dirname(os.path.abspath(__file__))
    TOPLEVEL_DIR = str(Path(PACKAGE_DIR).parent.absolute())
    dotenv_path = join(TOPLEVEL_DIR, '.env')
    load_dotenv(dotenv_path)

    API_KEY = os.environ.get("API_KEY")

    if API_KEY is None:
        raise FileNotFoundError("A `.env` file was not found. You need "
                            "to create a `.env` inside the top-level " 
                            "directory (same dir as requirements.txt) and add a single entry:\n\n"
                            "API_KEY=<value>\n\nSubstitute <value> with "
                            "your API key. You can find more info in the wiki.")
    else:
        return API_KEY

def get_canvas_url():
    """
    Return the Canvas URL, appending a trailing slash if needed.
    """
    load_dotenv()
    if os.getenv("API_URL") is not None:
        api_url =  os.getenv("API_URL")
        if not api_url:
            raise ValueError("API_URL is empty")
    else:
        api_url = "https://ufl.instructure.com/"
    
    if api_url[-1] != "/":
        api_url += "/"
    return api_url

API_URL = get_canvas_url()
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
    canvas = get_canvas_object()
    if canvas_id is not None:
        return canvas.get_course(
            int(canvas_id), 
            use_sis_id=False,
            include=list_to_include)
    canvas_courses = canvas.get_courses( 
        include=list_to_include)

    for canvas_course in canvas_courses:
        try:
            if (canvas_course.course_code == course_code 
                    and canvas_course.term["name"] == term_name):
                return canvas_course
        except Exception as e:
            print(e)
    return None

def get_course_from_UFSOC_apix(
    term_name,
    class_number="",
    course_code="",
    course_title="",
    department_name="",
    instructor_name="",
    program_level_name="Undergraduate",
):
    """Return a course from the UF Schedule of Courses (SOC) API.
    """
    import requests
    import pandas as pd
    URL_UFSOC = "https://one.uf.edu/soc/"
    URL_SOC_SCHEDULE = "https://one.uf.edu/apix/soc/schedule"
    URL_SOC_FILTERS = "https://one.uf.edu/apix/soc/filters"

    _HEADERS = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9,el;q=0.8",
        "Connection": "keep-alive",
        "Content-Type": "application/json",
        "Referer": URL_UFSOC,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    }
    def get_soc_filters(url=URL_SOC_FILTERS):
        response = requests.request("GET", url, headers=_HEADERS)
        return response.json()

    soc_filters = get_soc_filters()
    # categories = pd.json_normalize(soc_filters["categories"])
    progLevels = pd.json_normalize(soc_filters["progLevels"])
    terms = pd.json_normalize(soc_filters["terms"])
    departments = pd.json_normalize(soc_filters["departments"])    

    term_code = terms.loc[terms["DESC"]==term_name]["CODE"].values[0]
    if department_name != "":
        department_code = departments.loc[departments["DESC"]==department_name]["CODE"]
        if len(department_code)==0:
            raise ValueError("Department not found: {}".format(department_name))
        department_code = department_code.values[0]
    else:
        department_code = ""
    if program_level_name != "":
        program_level_code = progLevels.loc[progLevels["DESC"]==program_level_name]["CODE"]
        if len(program_level_code)==0:
            raise ValueError("Program level not found: {}".format(program_level_name))
        program_level_code = program_level_code.values[0]

    querystring = {
        "category":"CWSP",
        "class-num":class_number,
        "course-code":course_code,
        "course-title":course_title,
        "dept":department_code,
        "instructor":instructor_name,
        "prog-level":program_level_code,
        "term":term_code,}

    response = requests.request("GET", URL_SOC_SCHEDULE, headers=_HEADERS, params=querystring)

    if response.status_code != 200:
        raise ValueError("Error: {}".format(response.status_code))

    response_json = response.json()
    if len(response_json) == 0:
        raise ValueError("No courses found")
    if len(response_json) > 1:
        raise ValueError("More than one course found")

    return response_json[0]["COURSES"]
