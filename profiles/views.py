from django.contrib.auth.decorators import login_required
from django.http import HttpResponseNotFound, JsonResponse
from django.shortcuts import render

# Create your views here.

@login_required
def profiles_list_view(request):
    return render(request, "profiles/list.html", {})

@login_required
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

@login_required
def profile_avatar_upload_view(request):
    # just change the avatar of the user
    if not request.method == "POST":
        return HttpResponseNotFound()
    # get the user
    user = request.user
    # get the user profile
    profile = user.profile
    # get the avatar
    avatar = request.FILES.get("avatar-upload", None)
    if not avatar:
        return JsonResponse({"error": "No avatar submitted"}, status=400)
    # set the avatar
    profile.avatar = avatar
    profile.save()
    return JsonResponse(
        {
            "success": True,
            "avatar_url": profile.avatar.url
        })

@login_required
def profile_update_view(request):
    # update the user profile
    if not request.method == "POST":
        return HttpResponseNotFound()
    # get the user
    user = request.user
    # get the user profile
    profile = user.profile
    # the data we get from the form contains the following fields:
    # first_name, last_name, email
    # we get the data from the request
    data = request.POST
    first_name = data.get("firstName", None)
    last_name = data.get("lastName", None)
    email = data.get("email", None)

    # we update the user
    user.first_name = first_name
    user.last_name = last_name
    user.email = email
    user.save()

    return JsonResponse({
        "message": "Profile updated successfully",
        "message_type": "success"
        })