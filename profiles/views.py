from django.shortcuts import render
from django.http import JsonResponse, HttpResponseNotFound

# Create your views here.

def profiles_list_view(request):
    return render(request, "profiles/list.html", {})

def profiles_detail_view(request, pk=None):
    return render(
        request, 
        "profiles/detail.html", 
        {})

def profile_preferences_edit_view(request):
    # this view is called when the user clicks updates some preferences
    # This happens via an AJAX call which is why we return a JSON response
    # instead of a rendered template. The data is then used to update the
    # user preferences JSON field in the database. Currently the only accepted
    # preference is the scroll_height_factors and grade_steps stored in user.profile.preferences 
    # JSON field. The data have the following format:
    # const data = {
    #             "scroll_height_factors": {
    #                 [course_id]: {
    #                     [assignment_id]: scrollFactors
    #                 }
    #             }
    #         };
    import json
    data = json.loads(request.body.decode("utf-8"))
    # we get the user from the request
    user = request.user
    # we get the user profile
    profile = user.profile
    # we get the user preferences
    preferences = profile.preferences

    # set preferences for scroll_height_factors and grade_steps
    for preferece in data:
        preference_data = data.get(preferece, None)
        user_preference = preferences.get(preferece, None)
        if not preference_data:
            return JsonResponse({"error": "No data for submitted preference {}".format(preferece)}, status=400)
        if not user_preference:
            user_preference = {}
        for course_id, course_preferences_data in preference_data.items():
            if not user_preference.get(course_id, None):
                user_preference[course_id] = {}
            for assignment_id, assignment_preferences_data in course_preferences_data.items():
                user_preference[course_id][assignment_id] = assignment_preferences_data
            # if only one assignment is updated and there is no default scroll
            # factor for the course, we set the course default scroll factor 
            # ([course_id]['default']) to the scroll factor of the assignment
            if len(course_preferences_data) == 1:
                user_preference[course_id]['default'] = assignment_preferences_data
        if len(preference_data) == 1:
            user_preference['default'] = assignment_preferences_data
        preferences[preferece] = user_preference
        profile.preferences = preferences
        profile.save()
    return JsonResponse({"success": True})


