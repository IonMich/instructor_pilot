from django.shortcuts import render

# Create your views here.

def profiles_list_view(request):
    return render(request, "profiles/list.html", {})
def profiles_detail_view(request, pk=None):
    return render(
        request, 
        "profiles/detail.html", 
        {})