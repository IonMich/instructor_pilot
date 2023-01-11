# Instructor Pilot

## Description
 
A Django app to assist Teaching Assistants and Instructors with Canvas integration.
 
It depends on the [canvasapi](https://github.com/ucfopen/canvasapi) library.
 
## Installation
 
- Install conda via the official [instructions](https://docs.anaconda.com/anaconda/install/windows/) for your OS.
- Clone this repository:
 
   ```shell
   git clone https://github.com/IonMich/instructor_pilot.git
   ```
 
- Create a conda environment
 
   ```shell
   conda env create --file environment.yml --name django-ta
   ```
 
- Activate the environment
 
   ```shell
   conda activate django-ta
   ```
 
- Clone [autocanvas](https://github.com/IonMich/autocanvas)
 
   ```shell
   cd ..
   git clone https://github.com/IonMich/autocanvas.git
   ```
- Install autocanvas
 
   ```shell
   cd autocanvas
   pip install -e .
   ```
 
- Follow the installation instructions in autocanvas's README.md
 
- `cd` back to your instructor_pilot directory and run:
 
   ```shell
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```
