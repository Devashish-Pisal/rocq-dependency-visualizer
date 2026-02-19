import re
import sys
import tempfile
import subprocess
import os
import shutil
import json
import traceback


class Parser:
    def __init__(self):
        self.nodes = []
        self.edges = []
        self.current_filename = None
        # fast lookup
        self.node_ids = set()
        self.node_names = set()
        self.edge_pairs = set()

    def fetch_graph_data(self):
        return {"nodes": self.nodes, "edges": self.edges}

    # Optional: Hilft beim Debuggen
    def to_json(self):
        return json.dumps({"elements": {"nodes": self.nodes, "edges": self.edges}})

    def create_graph_from_dict(self, files: dict):
        #  gemeinsamen Ordner für alle Dateien erstellen
        with tempfile.TemporaryDirectory() as tmp_dir:
            v_files_to_process = []

            # alle Dateien erst mal auf die Festplatte schreiben
            for filename, content in files.items():
                file_path = os.path.join(tmp_dir, filename)
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)

                # Prüfen: Ist es .dpd (direkt parsen) oder .v (später kompilieren)?
                if filename.endswith(".dpd"):
                    print(f"Verarbeite .dpd Datei direkt: {filename}")
                    self.parse_dpd_content(content, filename)
                
                elif filename.endswith(".v"):
                    v_files_to_process.append(filename)

            # wenn .v Dateien da sind -> Intelligente Kompilierung starten
            if v_files_to_process:
                self.process_coq_files(tmp_dir, v_files_to_process)

    def process_coq_files(self, tmp_dir, v_files):
        pfad_zu_coqc = self.find_coqc()
        env = os.environ.copy()
        pending = v_files[:]

        for _ in range(10):
            if not pending:
                break

            still_pending = []
            progress_made = False

            for filename in pending:
                cmd = [pfad_zu_coqc, "-Q", ".", "", filename]
                res = subprocess.run(
                    cmd, cwd=tmp_dir, capture_output=True, text=True, env=env
                )

                if res.returncode == 0:
                    print(f"Erfolgreich kompiliert: {filename}")
                    progress_made = True
                else:
                    still_pending.append(filename)

            if not progress_made and still_pending:
                first_failed = still_pending[0]
                cmd = [pfad_zu_coqc, "-Q", ".", "", first_failed]
                res = subprocess.run(
                    cmd, cwd=tmp_dir, capture_output=True, text=True, env=env
                )
                raise ValueError(
                    f"Kompilierungsfehler in '{first_failed}':\n{res.stderr}"
                )

            pending = still_pending

        for filename in v_files:
            try:
                self.generate_and_parse_dpd(tmp_dir, filename, pfad_zu_coqc, env)
            except Exception as e:
                traceback.print_exc()
                print(f"Warnung: Konnte Graph für {filename} nicht erstellen: {e}")

    def generate_and_parse_dpd(self, tmp_dir, filename, coqc_path, env):
        module_name = os.path.splitext(filename)[0]
        driver_v = os.path.join(tmp_dir, f"Driver_{module_name}.v")
        
        # Driver schreiben
        with open(driver_v, "w", encoding="utf-8") as f:
            f.write("From dpdgraph Require Import dpdgraph.\n")
            f.write(f"Require Import {module_name}.\n") 
            f.write(f"Print FileDependGraph {module_name}.\n")

        # Driver ausführen
        cmd = [coqc_path, "-Q", ".", "", os.path.basename(driver_v)]
        res = subprocess.run(cmd, cwd=tmp_dir, capture_output=True, text=True, env=env)
        
        if res.returncode != 0:
             print(f"Graph-Driver gescheitert für {module_name}: {res.stderr}")
             return

        # Ergebnis suchen (.dpd Datei)
        dpd_file = os.path.join(tmp_dir, "graph.dpd")
        if os.path.exists(dpd_file):
            with open(dpd_file, "r", encoding="utf-8") as f:
                content = f.read()
            
            print(f"--- DEBUG: Verarbeite generierte DPD für {filename} ---")
            self.parse_dpd_content(content, filename)
            
            os.remove(dpd_file) # Aufräumen für die nächste Datei

    def find_coqc(self):
        candidates = [
            r"C:\Coq\bin\coqc.exe",
            r"C:\Program Files\Coq\bin\coqc.exe",
        ]
        found = shutil.which("coqc")
        if found:
            return found
        for path in candidates:
            if os.path.exists(path):
                return path
        raise FileNotFoundError(
            "coqc.exe not found. Please install Coq or add coqc to PATH."
        )


    def parse_dpd_content(self, content, filename):
        self.current_filename = filename
        for line in content.splitlines():
            line = line.strip()
            if not line:
                continue
            if self.validate_file_grammar(line):
                self.process_valid_grammar(line)
        self.current_filename = None

    def validate_file_grammar(self, line: str) -> bool:
        node = re.match(r'N:\s+\d+\s+"[^"]+"\s+\[.*\];', line)
        edge = re.match(r'E:\s+\d+\s+\d+\s+\[.*\];', line)
        return node is not None or edge is not None

    def process_valid_grammar(self, line: str):
        if line.startswith("N:"):
            self.process_node(line)
        elif line.startswith("E:"):
            self.process_edge(line)

    def process_node(self, line: str):
        try:
            pre = line.split("[", 1)[0]
            parts = pre.split()
            node_id = int(parts[1])
            name_match = re.search(r'"(.*)"', pre)
            name = name_match.group(1) if name_match else "Unknown"
            attrs = line[line.find("[") + 1 : line.rfind("]")]
            self.add_node(node_id, name, self.group_node_attributes(attrs))
        except Exception:
            raise

    def process_edge(self, line: str):
        try:
            pre = line.split("[", 1)[0]
            parts = pre.split()
            src = int(parts[1])
            tgt = int(parts[2])
            attrs = line[line.find("[") + 1 : line.rfind("]")]
            tokens = [
                x.strip()
                for x in attrs.replace(",", " ").split()
                if x.strip()
            ]
            self.add_edge(src, tgt, self.group_edge_attributes(tokens))
        except Exception:
            raise

    def group_node_attributes(self, attr_string):
        matches = re.findall(r'(\w+)=("[^"]*"|[^,\s]+)', attr_string)
        result = {"kind": [], "body": [], "prop": [], "path": []}
        for k, v in matches:
            v = v.strip('"')
            result.setdefault(k, []).append(v)
        return result

    def group_edge_attributes(self, tokens):
        weights = []
        for t in tokens:
            if t.startswith("weight="):
                weights.append(int(t.split("=")[1]))
        return {"weight": weights}


    def add_node(self, node_id, name, attrs):
        if node_id in self.node_ids:
            raise ValueError(f"Duplicate node id {node_id} in {self.current_filename}")
        if name in self.node_names:
            raise ValueError(f"Duplicate node name '{name}' in {self.current_filename}")
        self.nodes.append({
            "data": {
                "node_id": node_id,
                "node_name": name,
                "node_attributes": attrs,
                "filename": self.current_filename
            }
        })
        # record existence
        self.node_ids.add(node_id)
        self.node_names.add(name)


    def add_edge(self, src, tgt, attrs):
        edge_key = (src, tgt)
        if edge_key in self.edge_pairs:
            raise ValueError(
                f"Duplicate edge {src} -> {tgt} in {self.current_filename}"
            )
        self.edges.append({
            "data": {
                "source_node_id": src,
                "target_node_id": tgt,
                "edge_attributes": attrs,
                "filename": self.current_filename
            }
        })
        self.edge_pairs.add(edge_key)


# Helper
def print_error_msg(error_msg):
    print(f"\033[91m{error_msg}\033[00m", file=sys.stderr)
