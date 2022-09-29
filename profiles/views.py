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
    # preference is the scroll_height_factors stored in user.profile.preferences 
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
    
    # we get the scroll_height_factors from the data
    scroll_height_factors = data.get('scroll_height_factors', None)
    # we get the user from the request
    user = request.user
    # we get the user profile
    profile = user.profile
    # we get the user preferences
    preferences = profile.preferences
    scroll_preferences = preferences.get('scroll_height_factors', None)
    if scroll_height_factors is not None:
        if scroll_preferences is None:
            scroll_preferences = {}
        for course_id, course_scroll_preferences in scroll_height_factors.items():
        # if the scroll_height_factors are not None, we update the preferences
            for assignment_id, scroll_factors in course_scroll_preferences.items():
                scroll_preferences[course_id][assignment_id] = scroll_factors
            # if only one assignment is updated and there is no default scroll
            # factor for the course, we set the course default scroll factor 
            # ([course_id]['default']) to the scroll factor of the assignment
            if len(course_scroll_preferences) == 1:
                scroll_preferences[course_id]['default'] = scroll_factors

        preferences['scroll_height_factors'] = scroll_preferences
        profile.preferences = preferences
        profile.save()
        return JsonResponse({"status": "success"})
    else:
        return JsonResponse({"status": "error: no scroll_height_factors in data"})


