========================================================================================================================

SYSTEM REQUIREMENTS

- Python 3.12.8 or higher
- Packages: FastAPI, pytest, pytest-cov (plugin for test coverage), starlette, typing, re, sys
- Internet connection (Because tool loads graph layout dependencies from internet)
- Download Rocq from "https://rocq-prover.org/install" ---> Install rocq at location "C:\" (or at "C:\Program Files\") ---> Rename the installed folder to "Coq" ---> Add the "bin" folder path to the system environment

========================================================================================================================

INFO ABOUT DIRECTORIES

- Backend: This directory contains all backend logic (Parser and APIs) written in Python.
- [OPTIONAL] env: It is the virtual environment to run the project.
- Frontend: This directory contains all frontend logic written in HTML/CSS, and Javascript.
- htmlcov: Test  coverage data/report
- Tests: This directory contains all test classes.


========================================================================================================================

HOW TO START THE SERVER?

- Open terminal in project root.
- [OPTIONAL] Activate virtual environment with command 'env/Scripts/activate'
- Then run command 'fastapi dev Backend/Server.py'
- Server will be started at  'http://127.0.0.1:8000'


========================================================================================================================

HOW TO INITIATE CLIENT?

- Once Server  is running, open browser.
- Visit 'http://127.0.0.1:8000' or 'localhost:8000'


========================================================================================================================

HOW TO USE TOOL?

- Click on the 'instructions' button located in the upper right corner of the file-upload  window to see instructions.


========================================================================================================================

HOW TO COMPILE AND SEE CURRENT TEST STATEMENT COVERAGE?

- Open terminal in root directory.
- [OPTIONAL] Start virtual environment, with command 'env/Scripts/activate' (If virtual environment not already started)
- Then run command 'python -m pytest --cov=. --cov-report=html'
- After running above command, directory 'htmlcov' will be created in project root (If already exists, then it will be overwritten)

- To see the coverage open 'index.html' file from 'htmlcov' directory in browser.


========================================================================================================================
HOW TO USE ROCQ?

-Open WSL
-$ rocq compile test-coq/Test.v
-$ cd test-coq
-$ rocq repl
Rocq <Require Import dpdgraph.dpdgraph.

Rocq <Require Test.
Rocq <Set DependGraph File "graph2.dpd".
Rocq <Print FileDependGraph Test.
Rocq <Print DependGraph Test.Permutation_app_swap.


========================================================================================================================
HOW TO USE DOCKER? (OPTIONAL)

- Install Docker-Desktop
- Open Docker Desktop and wait until Engine is running
- Then open terminal in project root 
- Type in : docker-compose up --build 
- Visit: http://0.0.0.0:8000
- To remove the docker : docker-compose down 