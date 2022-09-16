import cv2
import numpy as np
import copy
import os
import pandas as pd

UFID_LENGTH = 8
PAGES_PER_SUBMISSION = 2

def perform_ops_to_imgs(quizzes_img_list, operator, **kwargs):
    new_list = []
    for quiz_imgs in quizzes_img_list:
        quiz_new = []
        for img in quiz_imgs:
            img_new = operator(img, **kwargs)
            quiz_new.append(img_new)
        new_list.append(quiz_new)
    return new_list

def crop_to_name_region_img(img, box=(10, 20, 785, 140)):
    return img.crop(box=box)

def crop_to_name_region(quizzes_img_list, box=(10, 20, 785, 140)):
    quizzes_img_list = perform_ops_to_imgs(
        quizzes_img_list, 
        operator=crop_to_name_region_img, 
        box=box)
    return quizzes_img_list

def remove_lines_img(
    img, 
    mode, 
    rect_kernel_size=30, 
    rect_kernel_width=1, 
    restruct_kernel_size=1, 
    do_reconstruct=False,
    dpi=150):
    # import matplotlib.pyplot as plt
    if mode == "vertical":
        rect_kernel = (rect_kernel_width,rect_kernel_size)
        restruct_kernel = (restruct_kernel_size,rect_kernel_width)
    elif mode == "horizontal":
        rect_kernel = (rect_kernel_size,rect_kernel_width)
        restruct_kernel = (rect_kernel_width,restruct_kernel_size)
    else:
        raise ValueError("mode must be either 'vertical' or 'horizontal'")
    # gray = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    removed = img.copy()
    
    # thresholding essentially inverts the image
    thresh = cv2.threshold(removed, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    # if mode == "vertical":
    #     plt.imshow(removed, cmap="gray")
    #     plt.show()
    #     plt.imshow(thresh, cmap="gray")
    #     plt.show()
    # Remove vertical
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, rect_kernel)
    detected_lines = cv2.morphologyEx(
        thresh, 
        cv2.MORPH_OPEN, 
        vertical_kernel, 
        iterations=1)
    cnts = cv2.findContours(
        detected_lines, 
        cv2.RETR_EXTERNAL, 
        cv2.CHAIN_APPROX_SIMPLE)
    cnts = cnts[0] if len(cnts) == 2 else cnts[1]
    # print(len(cnts))

    if cnts:
        if mode == "vertical":
            x_left = min(c.mean(axis=0)[0,0] for c in cnts)
            x_right = max(c.mean(axis=0)[0,0] for c in cnts)
            avg_x_distance = (x_right - x_left) / UFID_LENGTH
            low, high = x_left, x_right
        elif mode == "horizontal":
            x_top = min(c.mean(axis=0)[0,1] for c in cnts)
            x_bottom = max(c.mean(axis=0)[0,1] for c in cnts)
            low, high = x_top, x_bottom
    else:
        return img, (None,None)

    count_lines = 0
    for c in cnts:
        if mode=="vertical":
            x_loc = c.mean(axis=0)[0,0]
            # if x_loc is approximately multiple of avg_x_distance, then it's a valid line
            if (abs((x_loc - x_left) % avg_x_distance)>2*(dpi//150)
            and abs((x_loc - x_left) % avg_x_distance - avg_x_distance)>2*(dpi//150)
            ):
                print("skipping")
                continue
        count_lines += 1
        cv2.drawContours(removed, [c], -1, (255,255,255), 2*dpi//150)
    
    # plt.imshow(removed, cmap="gray")
    # plt.show()
    # Repair image
    if do_reconstruct:
        # in our case the lines are on the edges, so probably don't need to do this
        repair_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, restruct_kernel)
        removed = 255 - cv2.morphologyEx(255 - removed, cv2.MORPH_CLOSE, repair_kernel, iterations=1)
    return removed , (low, high)

def import_students_from_db(course):
    student_info = []
    for student in course.get_students():
        student_info.append(
            {"Student": f"{student.last_name}, {student.first_name}",
            "SIS User ID": student.uni_id,
            })

    df_ids = pd.DataFrame(student_info, columns=["Student", "SIS User ID"])
        
    return df_ids

def import_tf_model(model_path):
    import tensorflow as tf
    model = tf.keras.models.load_model(model_path)
    return model

def apply_scale_rotate(img, scale, angle):
    """Apply scale and rotation to image"""
    width = int(img.shape[1] * scale)
    height = int(img.shape[0] * scale)
    dim = (width, height)
    scaled_img = cv2.resize(img, dim, interpolation = cv2.INTER_AREA)
    M = cv2.getRotationMatrix2D((width/2, height/2), angle, 1)
    rotated_img = cv2.warpAffine(scaled_img, M, (width, height))
    return rotated_img

def find_best_scale_and_angle(template, img_list, n_iter=1000, match_method=None, annealing=False):
    """Do a MCMC search for the best scale and angle to align the template to the image"""
    import random
    # temperature
    T = 1
    if match_method is None:
        match_method = cv2.TM_SQDIFF_NORMED
    if match_method in [cv2.TM_SQDIFF, cv2.TM_SQDIFF_NORMED]:
        best_score = np.inf
    else:
        best_score = 0
    best_scale = 1.0
    best_angle = 0
    # step size for Marcov chain
    scale_sigma = 0.01
    angle_sigma = 0.01
    # start with scale and angle of 1.0 and 0
    scale = best_scale
    angle = best_angle
    score = best_score
    # prior for scale and angle is gaussian with mean 1.0 and 0
    # and variances 0.1 and 1.0
    scale_prior = lambda x: np.exp(-0.5*(x-1.0)**2/0.1**2)
    angle_prior = lambda x: np.exp(-0.5*x**2/1.0**2)
    prior = lambda x,y: scale_prior(x)*angle_prior(y)
    for i in range(n_iter):
        # scale and angle search
        proposed_scale = scale + random.gauss(0, scale_sigma)
        propose_angle =  angle + random.gauss(0, angle_sigma)
        print("proposed: scale", proposed_scale, "angle", propose_angle, end="\r")
        # scale the template
        template_ = apply_scale_rotate(template, proposed_scale, propose_angle)
        template_rgb, template_luminance = template_[:,:,:3], template_[:,:,3]
        
        # randomly choose an image to match to
        sub_idx = random.randint(0, len(img_list)-1)
        page_idx = random.randint(0, len(img_list[sub_idx])-1)
        img_rgb = np.array(img_list[sub_idx][page_idx])
        # image_to_match = cv2.erode(img_rgb, None, iterations=1)
        # template_rgb_ = cv2.erode(template_rgb, None, iterations=1)
        # copy
        image_to_match = img_rgb.copy()
        template_rgb_ = template_rgb.copy()
        result = cv2.matchTemplate(image_to_match, template_rgb_, match_method)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
        if match_method in [cv2.TM_SQDIFF, cv2.TM_SQDIFF_NORMED]:
            # implement the Metropolis-Hastings acceptance criterion
            # accept if the new score is better than the old score
            # or if the new score is worse than the old score, accept with probability exp(-(new-old)/T)
            prior_ratio = prior(proposed_scale, propose_angle) / prior(scale, angle)
            if min_val < best_score or random.random() < prior_ratio * np.exp(-(min_val-best_score)/T):
                angle = propose_angle
                scale = proposed_scale
            if min_val < best_score:
                best_score = min_val
                best_scale = proposed_scale
                best_angle = propose_angle
        else:
            if max_val > best_score or random.random() < prior_ratio * np.exp((max_val - best_score)/T):
                angle = propose_angle
                scale = proposed_scale
            if max_val > best_score:
                best_score = max_val
                best_scale = proposed_scale
                best_angle = propose_angle
        if annealing:
            T *= 0.99
        # print and overwrite in the same line to show progress
    print("\nbest: scale", best_scale, "angle", best_angle, "score", best_score)
    best_template = apply_scale_rotate(template, best_scale, best_angle)
    return best_template, best_scale, best_angle

def extract_digit_boxes_from_img(
        img_rgb, 
        template_rgb, 
        mask, 
        dpi=300,
        match_method=None
        ):
    ht, wt = template_rgb.shape[:2]
    if not match_method:
        match_method = cv2.TM_SQDIFF_NORMED
    image_to_match = cv2.erode(img_rgb, None, iterations=1)
    template_rgb = cv2.erode(template_rgb, None, iterations=1)
    result = cv2.matchTemplate(image_to_match, template_rgb, match_method, None, mask)
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
    if match_method in [cv2.TM_SQDIFF, cv2.TM_SQDIFF_NORMED]:
        top_left = min_loc
    else:
        top_left = max_loc

    x1, x2 = top_left[0], top_left[0] + wt
    y1, y2 = top_left[1], top_left[1] + ht
    img = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    
    # _, img =  cv2.threshold(img, 200, 255, cv2.THRESH_BINARY)

    # cv2.rectangle(img, (x1, y1), (x2, y2), (100,100,255), 2)
    # plt.imshow(img)
    # plt.show()
    for padding_x_px in [10*dpi//150, 50*dpi//150, 100*dpi//150]:
        try:
            img_ = img[
                y1:y2, 
                x1-padding_x_px:x2+padding_x_px
                ]
            img_no_v, (x_left, x_right) = remove_lines_img(
                img_, 
                mode="vertical", 
                rect_kernel_size=37*dpi//150, 
                rect_kernel_width=1, 
                do_reconstruct=False,
                dpi=dpi
                )

            img_no_h, (y_top, y_bottom) = remove_lines_img(
                img_, 
                mode="horizontal", 
                rect_kernel_size=70*dpi//150, 
                rect_kernel_width=1, 
                do_reconstruct=False,
                dpi=dpi
                )
            img = cv2.bitwise_or(img_no_v, img_no_h)
            break
        except ValueError as e:
            print("Handling:", e)
            continue

    image_boundary_pixels_x_left = x_left 
    len_x = x_right - x_left
    separation = len_x // UFID_LENGTH
    start_left = image_boundary_pixels_x_left
    
    digits = []
    for i_box in range(UFID_LENGTH):
        boundary_x_left = start_left + i_box * separation
        boundary_x_right = start_left + (i_box+1) * separation

        image_i = img[
            int(y_top): int(y_bottom), 
            int(boundary_x_left):int(boundary_x_right)]
        digits.append(image_i)

    assert image_i.dtype==np.uint8
    return digits

def get_all_digits(
    quizzes_img_list, 
    template, 
    dpi,
    pages_to_skip=[0,1,3],
    match_method=None):

    best_template, best_scale, best_angle = find_best_scale_and_angle(
        template,
        quizzes_img_list,
        n_iter=1000,
        match_method=cv2.TM_SQDIFF_NORMED
    )
    template_rgb, template_luminance = best_template[:,:,:3], best_template[:,:,3]

    digits = {}
    for idx_submission, submission in enumerate(quizzes_img_list):
        for idx_page, page in enumerate(submission):
            if idx_page in pages_to_skip:
                continue
            digits[idx_submission, idx_page] = extract_digit_boxes_from_img(
                np.array(page), 
                template_rgb, 
                mask=template_luminance, 
                dpi=dpi,
                match_method=match_method)
    return digits

def resize_keep_aspect(img, size):

    h, w = img.shape[:2]
    sh, sw = size

    # interpolation method
    if h > sh or w > sw: # shrinking image
        interp = cv2.INTER_AREA
    else: # stretching image
        interp = cv2.INTER_CUBIC

    # aspect ratio of image
    aspect = w / h

    # compute scaling and pad sizing
    if aspect > 1: # horizontal image
        new_w = sw
        new_h = np.round(new_w/aspect).astype(int)
    elif aspect < 1: # vertical image
        new_h = sh
        new_w = np.round(new_h*aspect).astype(int)
    else: # square image
        new_h, new_w = sh, sw

    # scale
    scaled_img = cv2.resize(img, (new_w, new_h), interpolation=interp)

    return scaled_img

def resize_and_pad_com_center(digit_img, size):
    """Find the center of mass of digit and pad so that the image 
    is of size size with the center of mass at the center."""
    sh, sw = size
    M = cv2.moments(digit_img)
    x_cm = int(M["m10"] / M["m00"])
    y_cm = int(M["m01"] / M["m00"])

    pad_left = min(sw//2 - x_cm, sw - digit_img.shape[1])
    if pad_left < 0:
        print("Hmm, pad_left is negative. Setting it to zero.")
        pad_left = 0
    pad_right = sw - digit_img.shape[1] - pad_left

    pad_above = min(sh//2 - y_cm, sh - digit_img.shape[0])
    if pad_above < 0:
        print("Hmm, pad_above is negative. Setting it to zero.")
        pad_above = 0
    pad_below = sh - digit_img.shape[0] - pad_above

    digit_img = np.pad(
        digit_img,
        ((pad_above,pad_below),(pad_left,pad_right)),
        'constant')
    return digit_img


def preprocess_digit_box(
    digit_box, 
    threshold_uint8=20, 
    min_distance=2,
    morph_element=None,
    morph=None):
    """Find all contours and keep only 
    the ones whose center of mass is not too close to the edges.
    
    Following the description in the MNIST dataset website.
    """
    import tensorflow as tf
    # convert to black background and white foreground
    digit_box_inv = 255 - digit_box    
    
    ret, thresh = cv2.threshold(digit_box_inv, threshold_uint8, 255, 0)

    contours, hierarchy = cv2.findContours(
        thresh, 
        cv2.RETR_TREE, 
        cv2.CHAIN_APPROX_NONE)
    
    # for each contour, find the center of mass
    # and check if it is not too close to the edges
    # if it is, discard it
    contours_to_keep = []
    for cnt in contours:
        M = cv2.moments(cnt)
        if M["m00"] != 0:
            cx = int(M["m10"]/M["m00"])
            cy = int(M["m01"]/M["m00"])
            if (cx > min_distance 
                and cx < digit_box.shape[1]-min_distance 
                and cy > min_distance 
                and cy < digit_box.shape[0]-min_distance):
                contours_to_keep.append(cnt)
    if not contours_to_keep:
        return None

    # get the bounding box of the contours
    x_min, y_min, x_max, y_max = np.inf, np.inf, 0, 0
    for cnt in contours_to_keep:
        x,y,w,h = cv2.boundingRect(cnt)
        x_min = min(x, x_min)
        y_min = min(y, y_min)
        x_max = max(x+w, x_max)
        y_max = max(y+h, y_max)
    

    # crop the digit box to the combined bounding box
    digit_box_cropped = digit_box_inv[
        y_min:y_max, 
        x_min:x_max
    ]

    # resize the digit box so that its maximum dimension is 20 pixels
    digit_20 = resize_keep_aspect(digit_box_cropped, (20,20))

    # apply morphological operations if do_morph 
    if morph is not None:
        if not morph_element:
            morph_element = cv2.getStructuringElement(cv2.MORPH_RECT, (1,1))
        if morph == "erode":
            digit_20 = cv2.erode(digit_20, morph_element)
        elif morph == "dilate":
            digit_20 = cv2.dilate(digit_20, morph_element)
        else:
            digit_20 = cv2.morphologyEx(digit_20, morph, morph_element)

    if cv2.moments(digit_20)["m00"] == 0:
        return None

    digit_28 = resize_and_pad_com_center(digit_20, (28,28))

    digit = tf.keras.utils.normalize(digit_28, axis=1)
    return digit

def preprocess_digits(digits_img_list, **kwargs):
    """For each digit, find all contours and keep only 
    the ones whose center of mass is not too close to the edges.
    """
    preprocessed_digit_list = []
    for digit_box in digits_img_list:
        digit = preprocess_digit_box(digit_box, **kwargs)
        if digit is None:
            return None
        preprocessed_digit_list.append(digit)
    return preprocessed_digit_list

def get_predicted_labels(predictions, df_ids, found_digits):
    max_probability = 0 
    predicted_ufid = -1
    predicted_student = ""
    for ufid in df_ids["SIS User ID"]:
        # if ufid in found_digits.keys():
        #     continue
        digit_probs = [
            predictions[i][int(x)] for i, x in enumerate(str(ufid))
            ]
        prob_ufid = np.prod(digit_probs)
        # if prob_ufid > 0: 
            # print(f"{ufid}: {prob_ufid} "
            #     f"{df_ids[df_ids['SIS User ID']==ufid]['Student'].values[0]}")
        if prob_ufid > max_probability:
            max_probability = prob_ufid
            predicted_ufid = ufid
    if max_probability > 0: 
        predicted_student = df_ids[df_ids['SIS User ID']==predicted_ufid]['Student'].values[0]
    else:
        pass
        # print("No match found")   
    return predicted_ufid, predicted_student, max_probability


def get_all_ufids(digit_imgs, df_ids, model, len_subs):
    found_digits = []
    docs_classified = {}
    morph_list = [None,"dilate", "erode", cv2.MORPH_OPEN, cv2.MORPH_CLOSE, cv2.MORPH_GRADIENT,cv2.MORPH_TOPHAT,cv2.MORPH_BLACKHAT]
    # TODO: add morphological elements to preprocess_digits
    morph_elements = []
    detection_cutoff = 1E3 * 0.1**UFID_LENGTH
    # import matplotlib.pyplot as plt
    # import matplotlib
    # matplotlib.use('TKAgg')
    for submission_idx, page_idx in digit_imgs.keys():
        digits_img_list = digit_imgs[(submission_idx, page_idx)]
        # if not(submission_idx == 3 and page_idx == 1):
        #     continue
        # print(submission_idx, page_idx, end="\r")
        
        max_probability = 0
        for morph in morph_list:
            
            digits_processed = preprocess_digits(digits_img_list, morph=morph)
            
            if digits_processed is None:
                continue
            predictions = model.predict(
                np.stack(digits_processed)
                )
            
            # for digit_idx in range(len(digits_processed)):
            #     print(predictions[digit_idx])
            #     plt.imshow(digits_processed[digit_idx])
            #     plt.show()
            predicted_ufid, predicted_student, max_probability = get_predicted_labels(predictions, df_ids, found_digits)
            # print(f"{submission_idx},{page_idx}\t Got {predicted_ufid}: {max_probability} {predicted_student}", end="\r")
            if max_probability >= detection_cutoff:
                if submission_idx in docs_classified.keys():
                    assert docs_classified[submission_idx] == (predicted_ufid, predicted_student)
                else:
                    docs_classified[submission_idx] = (predicted_ufid, predicted_student)
                break
            # elif morph is None:
            #     plt.imshow(quizzes_img_list[submission_idx][page_idx])
            #     plt.show()
            #     for digit_idx in range(len(digits_processed)):
            #         pass
            #         # print()
            #         print(predictions[digit_idx])
            #         plt.imshow(digits_processed[digit_idx])
            #         plt.show()
        if max_probability == 0:
            # plt.imshow(quizzes_img_list[submission_idx][page_idx])
            # plt.show()
            found_digits.append(
                        [submission_idx,
                        page_idx,
                        0,
                        -1,
                        ""])
        else:
            found_digits.append(
                        [submission_idx,
                        page_idx,
                        max_probability,
                        predicted_ufid,
                        predicted_student])
    df_digits = pd.DataFrame(
        found_digits, 
        columns=[
            "doc_idx", 
            "page_idx",  
            "max_probability", 
            "ufid",
            "full_name"])
    df_digits = (
        df_digits
        .sort_values('max_probability', ascending=False)
        .drop_duplicates(['doc_idx', 'page_idx'])
        .sort_values(['doc_idx', 'page_idx']))
    df_digits.to_csv("inference_digits.csv", index=False)
    return df_digits


def classify(
        model, 
        df_ids, 
        img_list,
        template_path,
        crop_box_150=(10, 20, 785, 260),
        dpi=300,
        pages_to_skip=[0,1,3],
        ):
    crop_box = tuple(np.array(crop_box_150) * dpi // 150)
    print("Cropping to approximate region of interest with crop_box", crop_box)
    img_list_ = crop_to_name_region(
        img_list,
        box=crop_box)
    print("Creating a copy of the image list")
    img_list = copy.deepcopy(img_list_)

    template_150 = cv2.imread(template_path, cv2.IMREAD_UNCHANGED)
    template = apply_scale_rotate(template_150, dpi//150, 0)
    print("Applying template matching and cropping to the digit list")
    digit_imgs = get_all_digits(
        img_list, 
        template, 
        dpi=dpi,
        pages_to_skip=pages_to_skip,
        match_method=None)
    print("Classifying the digits")
    df_digits = get_all_ufids(
        digit_imgs, 
        df_ids, 
        model, 
        len_subs=len(img_list))

    return df_digits