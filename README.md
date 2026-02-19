# Bachelor Project: Dependency Visualization Tool for Rocq Projects


---

## SYSTEM REQUIREMENTS

To run the application successfully, please ensure that your system meets the following requirements.

- Python 3.12.8 or higher
- Packages: FastAPI, pytest, pytest-cov (plugin for test coverage), starlette, typing, re, sys
- Internet connection (Because tool loads graph layout dependencies from internet)

The Rocq Prover is required for functionality. Please follow these steps exactly to complete the installation:

- Download Rocq from "https://rocq-prover.org/install" 
  - Install rocq at location `C:\` (or at `C:\Program Files\`) 
  - Rename the installed folder to `Coq` 
  - Add the `bin` folder path to the system environment

---

## INFO ABOUT DIRECTORIES

- Backend: This directory contains all backend logic (Parser and APIs) written in Python.
- [OPTIONAL] env: It is the virtual environment to run the project.
- Frontend: This directory contains all frontend logic written in HTML/CSS, and Javascript.
- htmlcov: Test  coverage data/report
- Tests: This directory contains all test classes.

---

## HOW TO START THE SERVER?
To start the server, please open your terminal in the project root directory.

- [OPTIONAL] Activate virtual environment with command `env/Scripts/activate`
- Then run command `fastapi dev Backend/Server.py` or `python -m fastapi dev Backend/Server.py`
- Server will be started at  'http://127.0.0.1:8000'

---

## HOW TO INITIATE CLIENT?

- Once Server  is running, open browser.
- Visit 'http://127.0.0.1:8000/' or 'http://localhost:8000/'

---

## HOW TO USE THE TOOL FEATURES?

Detailed usage instructions are available directly within the tool.
Simply click the **'Instructions'** button located at the **bottom-right corner** of the file upload window to view them.

---

## HOW TO COMPILE AND SEE CURRENT TEST STATEMENT COVERAGE?

- Open terminal in root directory.
- [OPTIONAL] Start virtual environment, with command `env/Scripts/activate` (If virtual environment not already started)
- Then run command `python -m pytest --cov=. --cov-report=html`
- After running above command, directory **htmlcov** will be created in project root (If already exists, then it will be overwritten)
- To see the coverage open `index.html` file from **htmlcov** directory in browser.

---

## HOW TO USE ROCQ?

- Open WSL
- `$ rocq compile test-coq/Test.v`
- `$ cd test-coq`
- `$ rocq repl`

Once inside the Rocq REPL (Rocq <), run the following commands to configure and export the graph:
- `Rocq <Require Import dpdgraph.dpdgraph.`
- `Rocq <Require Test.`
- `Rocq <Set DependGraph File "graph2.dpd".`
- `Rocq <Print FileDependGraph Test.`
- `Rocq <Print DependGraph Test.Permutation_app_swap.`

---

## HOW TO USE DOCKER? (OPTIONAL)

As an alternative to local installation, you can also start the application via Docker. Please proceed as follows:

- Install Docker-Desktop
- Open Docker Desktop and wait until Engine is running
- Then open terminal in project root 
- Type in : `docker-compose up --build` 
- Visit: http://0.0.0.0:8000/
- To remove the docker : `docker-compose down` 

---