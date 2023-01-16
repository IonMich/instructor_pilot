import os
import cv2
import pytesseract
import multiprocessing
import numpy as np
import matplotlib.pyplot as plt
# from pdf2image import convert_from_path
from sklearn.cluster import KMeans
from sklearn.cluster import DBSCAN
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import PCA

from django.conf import settings


# def convert_pdf_to_image(pdf_path, version, quiz_num, dpi=150):
#     """Convert pdf to image using pdf2image
#     Input:
#         pdf_path: path to pdf file
#         dpi: dpi of the output image
#     Output:
#         num_of_images: number of images generated
#     Note: 
#         The output image will be saved inside the images folder
#     """
#     images = convert_from_path(pdf_path, dpi=dpi, output_folder='images/images'+str(quiz_num), fmt='ppm')
#     # convert ppm to png
#     num_of_images = len(images)
#     for i in range(num_of_images):
#         images[i].save('images/'+'images'+str(quiz_num)+'/'+'version_'+ str(version) +'page_' + str(i) + '.png', 'PNG')
#     return num_of_images

def crop_and_ocr(image):
    """
    Crop the image and extract the text using OCR
    Input:
        image: image to be cropped
    Output:
        text: text extracted from the image
    """
    # Get the height and width of the image
    height, width = image.shape[:2]
    # set the starting point of the cropping rectangle
    x = 0
    y = int(height * 0.1)
    # set the ending point of the cropping rectangle
    w = width
    h = int(height * 0.3)
    # Crop the image
    cropped_image = image[y:y+h, x:x+w]
    # extract the text from the cropped image using OCR from opencv
    text = pytesseract.image_to_string(cropped_image)
    return text


def crop_images_to_text(image_list):
    """
    Crop the images inside a folder, use OCR to extract the text and save the texts in a list
    Input:
        image_list : list of paths to the images
    Output:
        texts: list of texts extracted from the images
        counts: list of number of images in each version
    """
    # run over all the images in the folder
    images = []
    texts = []
    counts = []
    count = 0
    for path in image_list:
        # if path is a string like '/media/submissions/course_1/assignment_2/img/submission-22-batch-1-page-3-195AFJGL.png'
        # read the image from the path
        image_url = os.path.join(settings.MEDIA_ROOT, path.removeprefix('/media/'))
        # Read the image
        image = cv2.imread(image_url)
        # append the image to the list
        images.append(image)
        count += 1
        print(f"Loading image: {count}/ {len(image_list)}")
        counts.append(count)
    # for image in images:
    #     text = crop_and_ocr(image)
    #     texts.append(text)
    # crop the image and extract the text using multiprocessing
    print("Cropping images and extracting text...")
    pool = multiprocessing.Pool()
    texts = pool.map(crop_and_ocr, images)
    pool.close()
    pool.join()
    return texts, counts


def vectorize_texts(texts):
    """
    Vectorize the texts using TfidfVectorizer
    Input:
        texts: list of texts
    Output:
        X: vectorized texts
    """
    # vectorize the text
    vectorizer = TfidfVectorizer(
        max_df=0.8,
        min_df=0.1,
        stop_words="english",
    )
    X = vectorizer.fit_transform(texts)

    return X

def perform_dbscan_clustering(X):
    """
    Perform DBSCAN clustering on the images
    Input:
        X: vectorized texts
        Output:
        cluster_labels: labels of the clusters
    """
    # perform DBSCAN clustering
    dbscan = DBSCAN(eps=0.5, min_samples=2)
    dbscan.fit(X)

    # Get the cluster labels for each image
    cluster_labels = dbscan.labels_

    return dbscan, cluster_labels

def plot_clusters_dbscan(X, cluster_labels, dbscan):
    """
    Plot the clusters
    Input:
        X: vectorized texts
        cluster_labels: labels of the clusters
    """
    # Reduce the dimensionality of the data using PCA
    pca = PCA(n_components=2)
    X_reduced = pca.fit_transform(X.toarray())

    # Get the unique labels
    unique_labels = set(cluster_labels)

    # Plot the clusters
    colors = plt.cm.Spectral(np.linspace(0, 1, len(unique_labels)))
    for k, col in zip(unique_labels, colors):
        if k == -1:
            # Black used for noise.
            col = 'k'

        class_member_mask = (cluster_labels == k)

        xy = X_reduced[class_member_mask]
        plt.plot(xy[:, 0], xy[:, 1], 'o', markerfacecolor=col,
                markeredgecolor='k', markersize=14)

    plt.title('Estimated number of clusters: %d' % len(unique_labels))
    # save the plot
    plt.savefig(f'cluster_dbscan.png')

def perform_kmeans_clustering(X, num_of_clusters):
    """
    Perform K-means clustering on the images
    Input:
        X: vectorized texts
        num_of_clusters: number of clusters
    Output:
        cluster_labels: labels of the clusters
    """
    kmeans = KMeans(n_clusters=num_of_clusters)
    kmeans.fit(X)

    # Get the cluster labels for each image
    cluster_labels = kmeans.predict(X)

    return kmeans, cluster_labels


def plot_clusters(X, cluster_labels, num_of_clusters, quiz_num, kmeans):
    """
    Plot the clusters
    Input:
        X: vectorized texts
        cluster_labels: labels of the clusters
        num_of_clusters: number of clusters
    """
    # Reduce the dimensionality of the data using PCA
    pca = PCA(n_components=2).fit(X.toarray())
    datapoint = pca.transform(X.toarray())

    # Plot the clusters
    for i in range(num_of_clusters):
        # select only data observations with cluster label == i
        ds = datapoint[np.where(cluster_labels==i)]
        # plot the data observations
        plt.plot(ds[:,0],ds[:,1],'o')
    # plot the centroids
    centroids = kmeans.cluster_centers_
    centroids = pca.transform(centroids)
    plt.scatter(centroids[:,0],centroids[:,1], marker='x', s=150, linewidths=5, zorder=10)
    # save the plot
    plt.savefig(f'cluster{quiz_num}.png')

