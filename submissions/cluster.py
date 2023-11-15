import cv2
import pytesseract
import subprocess
import io
import pandas as pd
import numpy as np

from sklearn.cluster import KMeans
from sklearn.cluster import DBSCAN
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import PCA

from django.conf import settings


def crop_and_ocr(image_path):
    """
    Crop the image and extract the text using OCR
    Input:
        image: image to be cropped
    Output:
        text: text extracted from the image
    """
    # read the image
    image = cv2.imread(image_path)
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


def crop_images_to_text(image_paths):
    """
    Crop the images inside a folder, use OCR to extract the text and save the texts in a list
    Input:
        image_list : list of paths to the images
    Output:
        texts: list of texts extracted from the images
        counts: list of number of images in each version
    """    
    print(f"Extracting text from {len(image_paths)} images. This may take a while...")

    text_tsv = subprocess.run(
        ['tesseract', '-', '-', 'tsv', '--dpi', '150', '--psm', '1',],
        input="\n".join(image_paths),
        capture_output=True, 
        text=True,
    )
    # convert to a dataframe
    
    print(text_tsv.stdout)
    df = pd.read_csv(
        io.StringIO(text_tsv.stdout), 
        sep='\t',
        engine='python',
        keep_default_na=False,
        on_bad_lines='skip',
    )

    df = df[df.conf > 10]
    df = df[df.text != '']
    df = df[df.text != ' ']
    if df.page_num.max() > 0 and df.page_num.min() > 0:
        df.page_num = df.page_num - 1
    print(df.head())
    print(df.tail())
    texts_grouped = df[['text','page_num']].groupby('page_num')
    texts_grouped = texts_grouped.agg({'text': ' '.join})["text"]
    texts = []
    for i in range(len(image_paths)):
        if i in texts_grouped.index:
            texts.append(texts_grouped[i])
        else:
            texts.append("")
    print(texts)
    return texts


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
        max_df=1.0,
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
    import matplotlib.pyplot as plt
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
    import matplotlib.pyplot as plt
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

