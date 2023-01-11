import pandas as pd
from django.shortcuts import get_object_or_404, render
from django.views.generic import DetailView, ListView

from .forms import DocumentSearchForm
from .models import Document

# Create your views here.

def home_view(request):
    form = DocumentSearchForm(request.POST or None)
    doc_df = None
    if request.method == 'POST':
        date_from = request.POST.get('date_from')
        date_to = request.POST.get('date_to')
        assignment_group = request.POST.get('assignment_group')
        print(date_from, date_to, assignment_group)

        qs = Document.objects.all()


        if len(qs) > 0:
            doc_df = pd.DataFrame(qs.values())
            print(doc_df)
            doc_df = doc_df.to_html(
                justify='center',
                classes=["table table-bordered table-striped table-hover table-sortable"]
                )
            
            
        else:
            print("no documents found")

    message = 'Hello from the view!'
    context = {"message": message, 'form': form, 'doc_df': doc_df}
    return render(request, 'documents/home.html', context)

# class DocumentListView(ListView):
#     model = Document
#     template_name = 'documents/main.html'

# class DocumentDetailView(DetailView):
#     model = Document
#     template_name = 'documents/detail.html'

def document_list_view(request):
    # qs stands for queryset
    qs = Document.objects.all()
    return render(request, 'documents/main.html', {'object_list': qs})


def document_detail_view(request, pk):
    obj = get_object_or_404(Document, pk=pk)
    return render(request, 'documents/detail.html', {'object': obj})