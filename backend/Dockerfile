FROM python:3.9-slim

WORKDIR /app

# copy only what's needed first to leverage cache
COPY pyproject.toml .
COPY main.py .

# install runtime deps
RUN pip install --no-cache-dir "fastapi[standard]>=0.121.0" "uvicorn[standard]"

# copy rest of the project (if you add files)
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${PORT:-8080}"]