from django.urls import path

from.views import (
    home_view,
    document_list_view,
    document_detail_view,
    )

app_name = 'documents'

urlpatterns = [
    path('', home_view, name='home'),
    path('documents/', document_list_view, name='list'),
    path('documents/<pk>/', document_detail_view, name='detail'),
]