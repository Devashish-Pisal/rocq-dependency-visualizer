import os
import traceback
import subprocess
import Parser
import RocqParser
from fastapi import FastAPI, UploadFile, File
from starlette.responses import FileResponse, HTMLResponse, RedirectResponse, JSONResponse
from starlette.staticfiles import StaticFiles
from typing import List

app = FastAPI()
app.graph_data = {"nodes": [], "edges": []} 
app.node_types = {}
app.last_error = None

# --- PFAD KONFIGURATION ---
frontend_path = os.path.join(os.path.dirname(__file__), '..', 'Frontend')
frontend_path = os.path.abspath(frontend_path)

if os.path.exists(frontend_path):
    print(f"[INFO] Frontend directory found at: {frontend_path}")
else:
    print(f"[ERROR] Frontend directory NOT found at: {frontend_path}")

app.mount("/Frontend", StaticFiles(directory=frontend_path), name="Frontend")


# --- DPD GENERIERUNG ---
def generate_dpd(filename: str):
    """ Erstellt DPD Datei für EINE Datei """
    module_name = os.path.splitext(filename)[0]
    driver_filename = f"Driver_{module_name}.v"
    dpd_filename = "graph.dpd" 

    try:
        with open(driver_filename, "w", encoding="utf-8") as f:
            f.write("From dpdgraph Require Import dpdgraph.\n")
            f.write(f"Require Import {module_name}.\n")
            f.write(f"Print FileDependGraph {module_name}.\n")
        
        print(f"[DEBUG] Generating DPD data for {module_name}...")
        cmd = ["coqc", "-R", ".", "", driver_filename]
        subprocess.run(cmd, capture_output=True, text=True)
        
        content = None
        if os.path.exists(dpd_filename):
            with open(dpd_filename, "r", encoding="utf-8") as f:
                content = f.read()
            os.remove(dpd_filename)
        else:
            print(f"[WARN] No .dpd output for {module_name}.")

        # Cleanup
        if os.path.exists(driver_filename): os.remove(driver_filename)
        for ext in [".vo", ".glob", ".vok", ".vos"]:
            f = f"Driver_{module_name}{ext}"
            if os.path.exists(f): os.remove(f)

        return content

    except Exception as e:
        print(f"[ERROR] Exception during DPD generation for {filename}: {e}")
        return None


# --- KOMPILIERUNG ---
def compile_coq_code(filename: str):
    try:
        cmd = ["coqc", "-R", ".", "", filename]
        print(f"[DEBUG] Compiling {filename}...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        return (result.returncode == 0), result.stderr
    except Exception as e:
        return False, str(e)


# --- HILFSFUNKTION: DATEN ZUSAMMENFÜGEN MIT ID-PREFIX ---
def merge_graph_data(parser_instance, filename: str):
   
    new_data = parser_instance.fetch_graph_data()
    
    prefix = os.path.splitext(filename)[0] + "_"
    
    for node in new_data["nodes"]:
        old_id = str(node["data"]["node_id"])
        node["data"]["node_id"] = prefix + old_id
        node["data"]["filename"] = filename

    for edge in new_data["edges"]:
        old_source = str(edge["data"]["source_node_id"])
        old_target = str(edge["data"]["target_node_id"])
        
        edge["data"]["source_node_id"] = prefix + old_source
        edge["data"]["target_node_id"] = prefix + old_target
        edge["data"]["filename"] = filename

    app.graph_data["nodes"].extend(new_data["nodes"])
    app.graph_data["edges"].extend(new_data["edges"])


def create_node_types(file_data: dict) -> dict:
    coqParser = RocqParser.RocqParser()
    for fname, data in file_data.items():
        if fname.endswith(".v"):
            coqParser.parse_text(data)
    return coqParser.to_dict()


# --- ROUTEN ---

@app.get("/")
def read_root():
    index_file = os.path.join(frontend_path, 'index.html')
    if not os.path.exists(index_file):
        return HTMLResponse(f"<h1>Error</h1><p>File not found: {index_file}</p>")
    return FileResponse(index_file)

@app.post("/upload/")
async def save_file(uploaded_files: List[UploadFile] = File(...)):
    app.graph_data = {"nodes": [], "edges": []} 
    all_files_content = {} 
    v_files_to_compile = []
    dpd_files_content = []
    
    try:
        for file in uploaded_files:
            filename = file.filename
            content = await file.read()
            decoded = content.decode("utf-8")
            all_files_content[filename] = decoded 
            
            with open(filename, "w", encoding="utf-8") as f:
                f.write(decoded)
                
            if filename.endswith(".v"):
                v_files_to_compile.append(filename)
            elif filename.endswith(".dpd"):
                dpd_files_content.append((decoded, filename))

        for content, fname in dpd_files_content:
            parser = Parser.Parser()
            parser.parse_dpd_content(content, fname)
            merge_graph_data(parser, fname)

        if v_files_to_compile:
            
            pending = v_files_to_compile[:]
            max_retries = len(v_files_to_compile) * 3
            iteration = 0
            compiled_successfully = []

            print(f"[INFO] Starting compilation of {len(pending)} files...")

            while pending and iteration < max_retries:
                iteration += 1
                curr = pending.pop(0)
                
                ok, err = compile_coq_code(curr)
                if ok:
                    compiled_successfully.append(curr)
                else:
                    if iteration < max_retries:
                        pending.append(curr)
                    else:
                        print(f"[WARN] Failed to compile {curr} finally.")
                        app.last_error = err

            print(f"[INFO] Generating graphs for {len(compiled_successfully)} compiled files...")
            
            for v_file in compiled_successfully:
                dpd_content = generate_dpd(v_file)
                if dpd_content:
                    parser = Parser.Parser()
                    parser.parse_dpd_content(dpd_content, v_file)
                    merge_graph_data(parser, v_file)
        
        app.node_types = create_node_types(all_files_content)
        
        return RedirectResponse(url="/visualize", status_code=303)

    except Exception as e:
        traceback.print_exc()
        app.last_error = str(e)
        return RedirectResponse(url="/error", status_code=303)


@app.get("/api/graph")
def get_graph():
    return JSONResponse({"graph_data": app.graph_data, "node_types": app.node_types})

@app.get("/visualize")
def get_visualize_page():
    return FileResponse(os.path.join(frontend_path, 'graph-page.html'))

@app.get("/error")
def show_error_page():
    return FileResponse(os.path.join(frontend_path, 'error-page.html'))

@app.get("/api/error")
def get_error():
    return JSONResponse({"error": app.last_error or "Unknown error"})


