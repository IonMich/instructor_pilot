from pdf2image import convert_from_path
import os
import glob
from submissions.models import PaperSubmission, PaperSubmissionImage


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
    num_pages_per_quiz=2, 
    dpi=150):
    
    # import RGB images
    quiz_imgs = convert_from_path(filepath, dpi)
    
    if len(quiz_imgs) % num_pages_per_quiz != 0:
        raise ValueError(
            f"The number of pages in the pdf is not a multiple of {num_pages_per_quiz}")

    # convert imgs to nested list every `num_pages_per_quiz`
    # for example, if num_pages_per_quiz=2, then:
    # [ [img1, img2], [img3, img4], ... ]
    quizzes_img_list = [list(a) for a in zip(*[iter(quiz_imgs)] * num_pages_per_quiz)]
    return quizzes_img_list

def split_pdfs(pdf_fpath, n_pages):
    """
    Split a PDF into multiple PDFs each of size n_pages.
    """
    if not os.path.exists("tmp"):
        os.makedirs("tmp")
    from PyPDF2 import PdfFileReader, PdfFileWriter
    pdf_reader = PdfFileReader(pdf_fpath)
    if pdf_reader.numPages % n_pages != 0:
        raise ValueError(
            f"The number of pages in the pdf is not a multiple of {n_pages}")
    for i in range(0, pdf_reader.numPages, n_pages):
        pdf_writer = PdfFileWriter()
        for j in range(i, i+n_pages):
            pdf_writer.addPage(pdf_reader.getPage(j))
        with open(f'tmp/submission_{i}-{i+n_pages-1}.pdf', 'wb') as out:
            pdf_writer.write(out)


def add_papersubmissions_to_db(
    assignment,
    quiz_number,
    quiz_dir_path):
    """
    Add submission images and pdfs to the database.
    """
    quiz_pdf_path = get_quiz_pdf_path(quiz_number, quiz_dir_path)
    quizzes_img_list = convert_pdfs_to_img_list(quiz_pdf_path)
    m = len(quizzes_img_list[0])
    for i, img_list in enumerate(quizzes_img_list):
        new_pdf_path = f'submissions/{assignment.course}/{assignment}/pdf/submission_{2*i}-{2*i+m-1}.pdf'
        os.rename(f'tmp/submission_{2*i}-{2*i+m-1}.pdf',"media/"+new_pdf_path)
        paper_submission = PaperSubmission.objects.create(
            assignment=assignment,
            pdf=new_pdf_path,
            grader_comment="")
        
        for j, img in enumerate(img_list):
            tmp_img_path = f'submissions/{assignment.course}/{assignment}/img/submission-{i}-{i+j}.png'
            img.save("media/"+tmp_img_path,"PNG")
            # raise NotImplementedError("Implement this")
            PaperSubmissionImage.objects.create(
                submission=paper_submission,
                image=tmp_img_path,
                page=j)
