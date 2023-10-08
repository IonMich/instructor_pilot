import glob
import os
import re

import fitz
from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext as _
from PIL import Image

comma_separated_float_list_re = re.compile('^([-+]?\d*\.?\d+[,\s]*)+$')
validate_comma_separated_float_list = RegexValidator(
              comma_separated_float_list_re, 
              _(u'Enter only floats separated by commas.'), 'invalid')

class CommaSeparatedFloatField(models.CharField):
    default_validators = [validate_comma_separated_float_list]
    description = _("Comma-separated floats")

def open_UploadedFile_as_PDF(uploaded_file):
    """
    Return a PyMuPDF Document object from the uploaded file.
    """
    return fitz.open(stream=uploaded_file.read(), filetype="pdf")

def submission_upload_to(instance, filename):
    """
    Return the relative path where the submission file should be saved.
    """
    return os.path.join(
        "submissions",
        f"course_{instance.assignment.course.pk}",
        f"assignment_{instance.assignment.pk}",
        "pdf",
        filename)

def submission_image_upload_to(instance, filename):
    """
    Return the relative path where the submission image should be saved.
    """
    return os.path.join(
        "submissions",
        f"course_{instance.submission.assignment.course.pk}",
        f"assignment_{instance.submission.assignment.pk}",
        "img",
        filename)

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

def convert_pdf_to_images(filepath, dpi, top_percent=0.25, left_percent=0.5, crop_box=None, skip_pages=(0,1,3)):
    """
    Converts a pdf file to a list of images.
    If crop_box is not None, then the images are cropped to the specified box.
    Otherwise, the images are cropped to the top left corner of the page,
    with the width and height specified by top_percent and left_percent.

    Parameters
    ----------
    filepath : str
        The path to the pdf file.
    dpi : int
        The dpi of the images.
    top_percent : float
        The percentage of the top of the page to keep.
    left_percent : float
        The percentage of the left of the page to crop.
    crop_box : tuple
        A tuple of the form (left, top, right, bottom) that specifies the crop box.
    skip_pages : tuple
        A tuple of page numbers to skip.

    Returns
    -------
    images : list
        A list of images.
    """
    images = []
    doc = fitz.open(filepath)
    for page in doc:
        if page.number in skip_pages:
            images.append(None)
            continue
        print(page.number, end="\r")
        rect = page.rect  # the page rectangle

        if crop_box is not None and page.number in crop_box:
            x_perc = float(crop_box[page.number]["x"])
            y_perc = float(crop_box[page.number]["y"])
            w_perc = float(crop_box[page.number]["width"])
            h_perc = float(crop_box[page.number]["height"])
            page_width = rect.x1 - rect.x0
            page_height = rect.y1 - rect.y0
            rect.x0 = rect.x0 + x_perc * page_width / 100
            rect.y0 = rect.y0 + y_perc * page_height / 100
            rect.x1 = rect.x0 + w_perc * page_width / 100
            rect.y1 = rect.y0 + h_perc * page_height / 100
        else:
            rect.x1 = rect.x0 + (rect.x1 - rect.x0) * left_percent
            rect.y1 = rect.y0 + (rect.y1 - rect.y0) * top_percent

        pix = page.get_pixmap(dpi=dpi, clip=rect)
        images.append(Image.frombytes(mode="RGB", size=[pix.width, pix.height], data=pix.samples))
    
    return images

