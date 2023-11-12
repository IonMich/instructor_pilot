FROM continuumio/miniconda3

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# In the future we would like to extract the name of the environment from the environment.yml file:
# find the line that starts with "name:" and extract the name after the colon
# However this does not work in a Dockerfile because command substitution is not supported
# RUN export CONDA_ENV=$(cat environment.yml | grep "^name:" | cut -d" " -f2 | if read -r line ; then echo "$line" ; else echo "myenv" ; fi)
# RUN echo "The environment name is: $CONDA_ENV"

ENV CONDA_ENV "django-ta"
COPY environment.yml .
RUN conda env create -f environment.yml --name $CONDA_ENV && \
    conda clean --all -f -y

# Make RUN commands use the new environment:
RUN echo "conda activate $CONDA_ENV" > ~/.bashrc
ENV PATH /opt/conda/envs/$CONDA_ENV/bin:$PATH
SHELL ["/bin/bash", "--login", "-c"]

EXPOSE 8000

COPY . .
ENTRYPOINT ./entrypoint.sh $CONDA_ENV