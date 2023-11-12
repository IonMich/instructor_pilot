#!/bin/bash --login
# The --login ensures the bash configuration is loaded,
# enabling Conda.
# first argument is the environment name

# Script adapted from: 

# https://pythonspeed.com/articles/activate-conda-dockerfile/
# https://github.com/ContinuumIO/docker-images/issues/89#issuecomment-887935997

# Enable strict mode.
set -euo pipefail
# ... Run whatever commands ...

# Temporarily disable strict mode and activate conda:
set +euo pipefail
# eval "$(conda shell.bash hook)"
conda activate $1

# Re-enable strict mode:
set -euo pipefail

DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY:-$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')}
export DJANGO_SECRET_KEY

export ENV_TYPE="dev"

# exec the final command:
python manage.py makemigrations
python manage.py migrate

# Create superuser with default values
DJANGO_SUPERUSER_USERNAME=${DJANGO_SUPERUSER_USERNAME:-admin}
DJANGO_SUPERUSER_PASSWORD=${DJANGO_SUPERUSER_PASSWORD:-password}
DJANGO_SUPERUSER_EMAIL=${DJANGO_SUPERUSER_EMAIL:-admin@example.com}
export DJANGO_SUPERUSER_USERNAME DJANGO_SUPERUSER_PASSWORD DJANGO_SUPERUSER_EMAIL
python manage.py createsuperuser --noinput \
    --username="$DJANGO_SUPERUSER_USERNAME" \
    --email="$DJANGO_SUPERUSER_EMAIL" \
    && echo "Superuser created"

python manage.py runserver 0.0.0.0:8000