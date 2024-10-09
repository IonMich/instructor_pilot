from PIL import Image
import fitz

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
    doc = fitz.Document(filepath)
    for page in doc:
        if page.number in skip_pages:
            images.append(None)
            continue
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

def convert_pdf_to_images_multi(i, cpu, submissions_pdfs, dpi, top_percent, left_percent, crop_box, skip_pages):
    images = []
    segment_size = len(submissions_pdfs) // cpu
    start = i * segment_size
    end = (i + 1) * segment_size
    if i == cpu - 1:
        end = len(submissions_pdfs)
    print(f"Process {i}: {start} to {end-1}")
    for j in range(start, end):
        images.append(convert_pdf_to_images(submissions_pdfs[j], dpi, top_percent, left_percent, crop_box, skip_pages))

    return images

def multiprocessed_pdf_conversion(vectors):
    from multiprocessing import Pool, set_start_method
    try:
        set_start_method('fork', force=True)
    except ValueError:
        print("Forking the process failed. Trying spawn.")
        set_start_method('spawn', force=True)
    
    pool = Pool()
    print("Pool initialized")
    results = pool.starmap(convert_pdf_to_images_multi, vectors)
    pool.close()
    pool.join()
    print("Done")

    images = []
    for result in results:
        images.extend(result)

    return images