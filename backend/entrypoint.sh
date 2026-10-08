#!/bin/sh
set -e

python manage.py migrate --noinput

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
    python manage.py seed_platform
fi

# Creates the admin user on first start when DJANGO_SUPERUSER_* variables are set.
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    python manage.py createsuperuser --noinput 2>/dev/null || true
fi

exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers "${GUNICORN_WORKERS:-3}" --access-logfile -
