from django.db import models
from django.core.validators import RegexValidator
from django.utils.translation import gettext as _
import re
from pdf2image import convert_from_path
import os
import glob
from PIL import Image

comma_separated_float_list_re = re.compile('^([-+]?\d*\.?\d+[,\s]*)+$')
validate_comma_separated_float_list = RegexValidator(
              comma_separated_float_list_re, 
              _(u'Enter only floats separated by commas.'), 'invalid')

class CommaSeparatedFloatField(models.CharField):
    default_validators = [validate_comma_separated_float_list]
    description = _("Comma-separated floats")

    # def formfield(self, **kwargs):
    #     defaults = {
    #         'error_messages': {
    #             'invalid': _(u'Enter only floats separated by commas.'),
    #         }
    #     }
    #     defaults.update(kwargs)
    #     return super(CommaSeparatedFloatField, self).formfield(**defaults)





def get_quiz_pdf_path(
    quiz_number,
    quiz_dir_path):
    """
    Return path to the quiz pdfs based on the quiz 
    number and the quiz directory path.

    Assume that the quiz pdfs are named like:
    quiz1/quiz1_combined.pdf, quiz2/quiz2_combined.pdf, etc.
    """
    quiz_pdf_paths = glob.glob(
        os.path.join(
            quiz_dir_path,
            f"quiz{quiz_number}",
            f"quiz{quiz_number}_combined.pdf"))
    if len(quiz_pdf_paths) == 0:
        raise ValueError(
            f"No quiz pdfs found for quiz {quiz_number}")
    elif len(quiz_pdf_paths) > 1:
        raise ValueError(
            f"More than one quiz pdf found for quiz {quiz_number}")
    return quiz_pdf_paths[0]


def convert_pdfs_to_img_list(
    filepath, 
    num_pages_per_submission, 
    dpi=150):
    
    # import RGB images
    quiz_imgs = convert_from_path(filepath, dpi)
    
    if len(quiz_imgs) % num_pages_per_submission != 0:
        raise ValueError(
            f"The number of pages in the pdf is not a multiple of {num_pages_per_submission}")

    # convert imgs to nested list every `num_pages_per_quiz`
    # for example, if num_pages_per_quiz=2, then:
    # [ [img1, img2], [img3, img4], ... ]
    quizzes_img_list = [list(a) for a in zip(*[iter(quiz_imgs)] * num_pages_per_submission)]
    return quizzes_img_list

def split_pdfs(pdf_fpath=None, file_idx=0, n_pages=2):
    """
    Split a PDF into multiple PDFs each of size n_pages.
    """
    from PyPDF2 import PdfFileReader, PdfFileWriter
    if not os.path.exists("tmp"):
        os.makedirs("tmp")
    pdf_reader = PdfFileReader(pdf_fpath)
    if pdf_reader.numPages % n_pages != 0:
        raise ValueError(
            f"The number of pages in the pdf is not a multiple of {n_pages}")
    for i in range(0, pdf_reader.numPages, n_pages):
        pdf_writer = PdfFileWriter()
        for j in range(i, i+n_pages):
            pdf_writer.addPage(pdf_reader.getPage(j))
        with open(f'tmp/submission_batch_{file_idx}_{i}-{i+n_pages-1}.pdf', 'wb') as out:
            pdf_writer.write(out)


