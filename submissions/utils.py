from django.db import models
from django.core.validators import RegexValidator
from django.utils.translation import gettext as _
import re
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
    raise NotImplementedError


def split_pdfs(pdf_fpath=None, file_idx=0, n_pages=2):
    """
    Split a PDF into multiple PDFs each of size n_pages.
    """
    raise NotImplementedError

