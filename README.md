[![conda](https://github.com/IonMich/instructor_pilot/actions/workflows/python-package-conda.yml/badge.svg)](https://github.com/IonMich/instructor_pilot/actions/workflows/python-package-conda.yml)

# Instructor Pilot

## Description

A Django app to assist Teaching Assistants and Instructors with Canvas integration.

It depends on the [canvasapi](https://github.com/ucfopen/canvasapi) library.

## Installation

- Install [conda](https://docs.anaconda.com/anaconda/install/windows/) via the official instructions for your OS. If you would like a more lightweight installation, you can use alternatively [miniconda](https://docs.conda.io/en/latest/miniconda.html).
- Clone this repository at your desired location by running:

   ```shell
   git clone https://github.com/IonMich/instructor_pilot.git
   ```

- Create a conda environment:

   ```shell
   conda env create --file environment.yml --name django-ta
   ```

   You can replace `django-ta` with the environment name of your choice.
- Activate the environment:

   ```shell
   conda activate django-ta
   ```

- Clone [autocanvas](https://github.com/IonMich/autocanvas) in the same directory as instructor_pilot:

   ```shell
   cd ..
   git clone https://github.com/IonMich/autocanvas.git
   ```

- Install autocanvas:

   ```shell
   cd autocanvas
   pip install -e .
   ```

- To connect to Canvas, you will need to create a Canvas API token. You can do this by going to your Canvas Account Settings and clicking on the `New Access Token` button of the "Approved Integrations" section. Copy this token and paste it in the `.env.example` file **of the `autocanvas` directory**. Rename the file to `.env` and save it.

- Open the `instructor_pilot/.env.example` file and fill in the `DJANGO_SECRET_KEY` with a [secret key](https://djecrety.ir/). Rename the file to `.env` and save it.

- Go back to your instructor_pilot directory and initialize the Django app by adding a username and password for the admin account:

   ```shell
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

- Run the Django app:

   ```shell
   python manage.py runserver
   ```

- Open your browser and go to `http://127.0.0.1:8000/admin/` to access the admin panel. You can log in with the username and password you created in the previous step.

- In the admin panel, add your information in the `First name` and `Last name` fields of your `Users` entry and save it - this will be used if you are a UF member to get your section class meeting times from the UF API.

- Add a University object in `Universities` and save it. Use `ufl`
as the university code, if you are a UF member.

- All set! You can now go to `http://127.0.0.1:8000/` to add a course and start using the app.

# Usage

The instructions above need to be followed only once. After that, you can run the app by simply navigating to the `instructor_pilot` directory and running:

   ```shell
   conda activate django-ta
   python manage.py runserver
   ```
