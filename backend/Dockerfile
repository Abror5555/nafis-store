FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN DJANGO_DEBUG=True python manage.py collectstatic --noinput \
    && useradd --create-home appuser \
    && mkdir -p /app/media \
    && chown -R appuser /app

USER appuser
EXPOSE 8000

CMD ["sh", "./entrypoint.sh"]
