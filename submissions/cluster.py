
import subprocess
import io
from string import ascii_letters, digits

import numpy as np
import pandas as pd

import cv2
import pytesseract

from sklearn.cluster import KMeans
from sklearn.cluster import DBSCAN
from sklearn.feature_extraction.text import TfidfVectorizer


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


def images_to_text(image_paths, sub_pks):
    """
    Use OCR to extract the text and save the texts in a list
    Input:
        image_list : list of paths to the images
        sub_pks: list of submission pks. Same length as image_list
    Output:
        texts: list of texts extracted from the images
    """    
    print(f"Extracting text from {len(image_paths)} images. This may take a while...")
    
    char_set = ascii_letters + digits + ' '
    text_tsv = subprocess.run(
        [
            'tesseract', 
            '-', '-', # stdin/stdout
            'tsv', 
            '--dpi', '150',
            '-c', f'tessedit_char_whitelist={char_set}',
        ],
        input="\n".join(image_paths),
        capture_output=True, 
        text=True,
    )

    df = pd.read_csv(
        io.StringIO(text_tsv.stdout), 
        sep='\t',
        quotechar='"',
        engine='python',
        keep_default_na=False,
    )

    # keep only the text with confidence > 70
    df = df[df.conf > 70]
    # remove empty texts
    df = df[(df.text != '') & (df.text != ' ')]
    # convert the page_num from 1-indexed to 0-indexed
    if df.page_num.max() > 0 and df.page_num.min() > 0:
        df.page_num = df.page_num - 1

    texts_grouped = df[['text', 'page_num']].groupby('page_num')
    texts_grouped = texts_grouped.agg({'text': ' '.join})["text"]
    # replace NaN with empty string
    texts_grouped = texts_grouped.fillna('')
    print(texts_grouped.head(), type(texts_grouped))

    df_pks = pd.DataFrame({"sub_pk": sub_pks, "page_num": range(len(sub_pks))})
    print(df_pks.head(), type(df_pks))

    texts_grouped = pd.merge(
        df_pks,
        texts_grouped,
        left_on="page_num",
        right_on="page_num",
        how="left",
    ).fillna('')
    print(texts_grouped.head(), type(texts_grouped))
    texts_grouped = (texts_grouped
                     .groupby("sub_pk")
                     .agg({'text': ' '.join, 'page_num': np.max})
                     .sort_values(by=['page_num'])
                     ["text"]
    )
    print(texts_grouped.head(25))
    print(texts_grouped.shape)
    print(texts_grouped.index)
    print(type(texts_grouped))
    # raise NotImplementedError

    return texts_grouped



def vectorize_texts(texts):
    """
    Vectorize the texts using TfidfVectorizer
    Input:
        texts: list of texts
    Output:
        X: vectorized texts
    """
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
    dbscan = DBSCAN(eps=0.5, min_samples=2)
    dbscan.fit(X)
    
    cluster_labels = dbscan.labels_

    return dbscan, cluster_labels

def plot_clusters_dbscan(X, cluster_labels):
    """
    Plot the clusters
    Input:
        X: vectorized texts
        cluster_labels: labels of the clusters
    """
    import matplotlib.pyplot as plt
    from sklearn.decomposition import PCA
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
    plt.savefig('cluster_dbscan.png')

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
    from sklearn.decomposition import PCA
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

