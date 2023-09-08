[![conda](https://github.com/IonMich/instructor_pilot/actions/workflows/python-package-conda.yml/badge.svg)](https://github.com/IonMich/instructor_pilot/actions/workflows/python-package-conda.yml)

# Instructor Pilot

![Instructor Pilot](assets/readme_image.png)
## Description

A Django app to assist Teaching Assistants and Instructors with Canvas integration.

It depends on the [canvasapi](https://github.com/ucfopen/canvasapi) library and on its wrapper [autocanvas](https://github.com/IonMich/autocanvas).

## Installation

You can find installation instructions [here](https://github.com/IonMich/instructor_pilot/wiki/Installation-Instructions).

# Usage

The installation instructions need to be followed only once. After that, you can run the app by simply navigating to the `instructor_pilot` directory and running:

   ```shell
   conda activate django-ta
   python manage.py runserver
   ```
where you should replace `django-ta` with the name you chose for the conda environment during installation. If you do not recall the name of the conda environment you created, run `conda info --envs` to get a list of all conda environments in your system.

# Updating the source code

To update the app, navigate to your `instructor_pilot` directory do the following:

- First, download the latest version of the app with Git:

   ```shell
   git pull
   ```

- Update the app dependencies in the conda environment:

   ```shell
   conda env update --file environment.yml --name <name-of-your-conda-env> --prune
   ```

   This might take a few minutes and the dependencies change rarely, so in most cases you can skip this step.
- Update the database structure and existing data:

   ```shell
   python manage.py makemigrations
   python manage.py migrate
   ```

- *Important*: Restart the server, open the app in your browser and empty the cache. Different browsers and operating systems have different keyboard shortcuts for that. For example, in Chrome on Windows or Linux, you can press `Ctrl + Shift + R` to do this (`Cmd + Shift + R` on Mac), while other browsers may require you to press `Ctrl + F5`.
