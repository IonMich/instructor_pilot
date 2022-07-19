import copy
import pandas as pd
import itertools
import re


def ragged_csv(filename):
    with open(filename,"r") as f:
        max_n=0
        for line in f.readlines():
            words = len(line.split(' '))
            if words > max_n:
                max_n=words
        lines=pd.read_csv(
            filename,
            sep=' ',
            names=range(max_n),
            skipinitialspace=True).apply(lambda x: x.str.strip(","))
    return lines


def import_students(fpath):
    student_names = (pd.read_csv(fpath, sep="\t",header=None)
                        .squeeze(axis=1)
                        .values.tolist()
                        )
    student_name_wordlist = ragged_csv(fpath).values.tolist()
    wordlist_dict = {}
    for idx, inner_list in enumerate(student_name_wordlist):
        filtered = list(filter(lambda x: x == x, inner_list))
        wordlist_dict[idx] = filtered
                
    return student_names, wordlist_dict


def find_names(img_list, student_fpath, df_digits):
    
    restart_img_list = copy.deepcopy(img_list)


    student_names, student_name_wordlist = import_students(fpath=student_fpath)
    
    decoder_type = DecoderType.WordBeamSearch
    labels = {}

    num_trials = 1
    kernel_sizes = [(0,0),(1,1),(2,2),(3,3)]
    do_reconstruct_list = [False, True]
    hyperparams = itertools.product(
        kernel_sizes, 
        do_reconstruct_list, 
        range(num_trials))
    
    found = []

    for param_choice in hyperparams:
        kernel_size, do_reconstruct, trial = param_choice
        print(f"Params: {kernel_size=}, {do_reconstruct=}, {trial=}")
        quizzes_img_list = copy.deepcopy(restart_img_list)
        
        # raise NotImplementedError 
        # print("Cropping out name tag")
        quizzes_img_list = crop_by_name_tag(
            quizzes_img_list, 
            crop_height=60, 
            resize_height=60)
        # print("Performing inference...")

        # print("Increasing Contrast")
        quizzes_img_list = increase_contrast(quizzes_img_list, kernel_size=kernel_size)
        # cv2.imwrite("../data/test_after_contrast.png",quizzes_img_list[0][0])


        quizzes_img_list = remove_xlines(
            quizzes_img_list, 
            do_reconstruct=False)
        # cv2.imwrite("../data/test_after_removing_lines.png",quizzes_img_list[0][0])
        # print("Converting to grayscale")
        # quizzes_img_list = convert_to_gray(quizzes_img_list)
        # cv2.imwrite("../data/test_after_gray.png",quizzes_img_list[0][0])
        
        texts = get_all_text_imgs(quizzes_img_list)
        # TODO: reduce level by one by changing key to
        # (doc_idx, page_idx, text_idx) 
        # and value to boxed_text
        for (doc_idx, page_idx, text_idx), boxed_text in texts.items():
            print(doc_idx, page_idx, text_idx)
            if doc_idx in labels.keys() or doc_idx in df_digits["doc_idx"].values:
                continue
            # TODO: store max_probability of each document
            # and method which produced it
            model = Model(
                char_list_from_file(), 
                decoder_type, 
                must_restore=True, 
                dump=False)
            
            # if the image is too small, skip it
            # if boxed_text.img.shape[0]<7 or boxed_text.img.shape[1]<7:
            #     ops.reset_default_graph()
            #     continue
            try:
                recognized, probability = infer(model, img=boxed_text.img)
            except Exception as e:
                print(e)
                continue
            finally:
                ops.reset_default_graph()

            # see if it is of the form FirstXLast 
            # where X is a non alphabetical symbol or whitespace
            first_last_delimiter = re.match(
                    "[A-Z][a-z]+([^a-zA-Z])[A-Z][a-z]+", 
                    recognized[0])
            if (probability[0] < UNIQUE_WORD_DETECTION_THRESHOLD and 
                not bool(first_last_delimiter)) or (
                probability[0] < FULL_NAME_DETECTION_THRESHOLD and 
                bool(first_last_delimiter)
            ):
                continue

            if bool(first_last_delimiter):
                delim = first_last_delimiter.group(1)
                words = recognized[0].split(delim)
            else:
                words = recognized
            
            word = get_unique_match(words, student_name_wordlist)
            if word is None:
                # recognized_text, max_probability
                found.append(
                    [doc_idx, 
                    page_idx, 
                    text_idx, 
                    words, 
                    probability[0], 
                    ""])
                continue
            print(word)
            student_idx, matched_wordlist = get_matching_name_wordlist(word, student_name_wordlist)
            assert matched_wordlist is not None

            found.append(
                [doc_idx, 
                page_idx, 
                text_idx, 
                words, 
                probability[0], 
                student_names[student_idx]])

            labels[doc_idx] = "_".join(matched_wordlist)
            print(f"Have classified {len(labels)} quizzes.")
            replace_contents(CORPUS_PATH, matched_wordlist, "")
            remove_idx_from_wordlist(student_name_wordlist, student_idx)

    # recognized_names_list = get_recognized_names(quizzes_img_list)
    inference_fname = f'../inference_quiz_{quiz_number}.txt'
    print(f"Finished inference and writing to {inference_fname}")
    print(labels)
    
    df_found = pd.DataFrame(
        found, 
        columns=[
            "doc_idx", 
            "page_idx", 
            "text_idx", 
            "recognized_text", 
            "max_probability", 
            "full_name"])
    df_found.to_csv(inference_fname)
    return df_found, labels