# 1. Basis-Image
FROM coqorg/coq:latest

# 2. Zu Root wechseln für Installationen
USER root

# 3. Python und Abhängigkeiten installieren
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# 4. Arbeitsverzeichnis erstellen und Rechte an 'coq' User geben
WORKDIR /app
RUN chown coq:coq /app

# 5. Requirements kopieren
COPY requirements.txt .

# 6. Python-Pakete global installieren (damit alle User sie nutzen können)
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# --- WICHTIGER FIX ---
# Wir wechseln zurück zum User 'coq', damit Opam/Coq funktioniert
USER coq

# 7. Den Rest kopieren (mit --chown, damit der User 'coq' die Dateien lesen darf!)
COPY --chown=coq:coq . .

# 8. In den Backend-Ordner wechseln
WORKDIR /app/Backend

# 9. Port freigeben
EXPOSE 8000


RUN opam install -y coq-dpdgraph

# 10. Starten
# Hinweis: Wir rufen python3 -m uvicorn auf, das ist oft robuster im Pfad
CMD ["python3", "-m", "uvicorn", "Server:app", "--host", "0.0.0.0", "--port", "8000"]