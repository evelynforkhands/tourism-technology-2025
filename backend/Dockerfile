FROM python:3.10-slim

WORKDIR /app

# copy minimal files first to use layer cache
COPY pyproject.toml .
COPY main.py .

# install runtime deps (allow prerelease for agent-framework)
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --pre "agent-framework>=1.0.0b251108" "python-dotenv>=0.9.9" "fastapi[standard]>=0.121.0" "uvicorn[standard]"

# copy rest of the app
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]