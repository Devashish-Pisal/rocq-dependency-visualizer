import json
import re
from pathlib import Path


class RocqParser:
    """
    This class finds the type (Definition, Lemma, Theorem, etc.)
    of the nodes from uploaded .v files and not the dependencies
    between the nodes. It automatically avoids duplicate entries.
    """

    IDENT = r"[A-Za-z_][A-Za-z0-9_']*"

    def __init__(self):
        # Use sets internally to avoid duplicates
        self.lemma_nodes = set()
        self.theorem_nodes = set()
        self.fact_nodes = set()
        self.corollary_nodes = set()
        self.definition_nodes = set()
        self.fixpoint_nodes = set()
        self.cofixpoint_nodes = set()
        self.inductive_nodes = set()
        self.record_nodes = set()
        self.class_nodes = set()
        self.instance_nodes = set()
        self.axiom_nodes = set()
        self.parameter_nodes = set()
        self.variable_nodes = set()
        self.module_nodes = set()
        self.section_nodes = set()

        self._compile_patterns()


    def parse_file(self, path: str | Path):
        text = Path(path).read_text(encoding="utf-8")
        self.parse_text(text)

    def parse_text(self, text: str):
        text = self._strip_comments(text)
        for line in text.splitlines():
            self._match_line(line)


    def _compile_patterns(self):
        self.patterns = {
            "lemma": re.compile(rf"^\s*Lemma\s+(?P<name>{self.IDENT})"),
            "theorem": re.compile(rf"^\s*Theorem\s+(?P<name>{self.IDENT})"),
            "fact": re.compile(rf"^\s*Fact\s+(?P<name>{self.IDENT})"),
            "corollary": re.compile(rf"^\s*Corollary\s+(?P<name>{self.IDENT})"),

            "definition": re.compile(rf"^\s*Definition\s+(?P<name>{self.IDENT})"),
            "fixpoint": re.compile(rf"^\s*Fixpoint\s+(?P<name>{self.IDENT})"),
            "cofixpoint": re.compile(rf"^\s*CoFixpoint\s+(?P<name>{self.IDENT})"),

            "inductive": re.compile(rf"^\s*Inductive\s+(?P<name>{self.IDENT})"),
            "record": re.compile(rf"^\s*Record\s+(?P<name>{self.IDENT})"),

            "class": re.compile(rf"^\s*Class\s+(?P<name>{self.IDENT})"),
            "instance": re.compile(rf"^\s*Instance\s+(?P<name>{self.IDENT})"),

            "axiom": re.compile(rf"^\s*Axiom\s+(?P<name>{self.IDENT})"),
            "parameter": re.compile(rf"^\s*Parameter\s+(?P<name>{self.IDENT})"),

            # Variables / Variable may declare multiple names
            "variable": re.compile(
                rf"^\s*Variables?\s+(?P<names>(?:{self.IDENT}\s*)+)"
            ),

            "module": re.compile(
                rf"^\s*Module(?:\s+Type)?\s+(?P<name>{self.IDENT})"
            ),
            "section": re.compile(rf"^\s*Section\s+(?P<name>{self.IDENT})"),
        }

    def _match_line(self, line: str):
        for key, pattern in self.patterns.items():
            m = pattern.match(line)
            if not m:
                continue

            if key == "variable":
                names = m.group("names").split()
                self.variable_nodes.update(names)
            else:
                name = m.group("name")
                getattr(self, f"{key}_nodes").add(name)

            # Only match one declaration per line
            break

    # Removes comments (including nested ones)
    def _strip_comments(self, text: str) -> str:
        result = []
        depth = 0
        i = 0
        while i < len(text):
            if text[i:i+2] == "(*":
                depth += 1
                i += 2
            elif text[i:i+2] == "*)" and depth > 0:
                depth -= 1
                i += 2
            else:
                if depth == 0:
                    result.append(text[i])
                i += 1
        return "".join(result)


    # Convert the node to into a dictionary
    def to_dict(self) -> dict:
        return {
            "lemma": sorted(self.lemma_nodes),
            "theorem": sorted(self.theorem_nodes),
            "fact": sorted(self.fact_nodes),
            "corollary": sorted(self.corollary_nodes),
            "definition": sorted(self.definition_nodes),
            "fixpoint": sorted(self.fixpoint_nodes),
            "cofixpoint": sorted(self.cofixpoint_nodes),
            "inductive": sorted(self.inductive_nodes),
            "record": sorted(self.record_nodes),
            "class": sorted(self.class_nodes),
            "instance": sorted(self.instance_nodes),
            "axiom": sorted(self.axiom_nodes),
            "parameter": sorted(self.parameter_nodes),
            "variable": sorted(self.variable_nodes),
            "module": sorted(self.module_nodes),
            "section": sorted(self.section_nodes),
        }

    # Convert the data into a JSON
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


# Demo
if __name__ == "__main__":
    parser = RocqParser()
    parser.parse_file("../rocq-files/Permutation.v")
    print(parser.to_json())
    print(parser.to_dict())
