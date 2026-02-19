import json
from pathlib import Path
from Backend.RocqParser import RocqParser


def test_parse_basic_declarations():
    text = """
    Lemma L1.
    Theorem T1.
    Fact F1.
    Corollary C1.
    Definition D1.
    Fixpoint FP1.
    CoFixpoint CFP1.
    Inductive I1.
    Record R1.
    Class CL1.
    Instance INST1.
    Axiom AX1.
    Parameter P1.
    Module M1.
    Section S1.
    """

    parser = RocqParser()
    parser.parse_text(text)
    data = parser.to_dict()

    assert data["lemma"] == ["L1"]
    assert data["theorem"] == ["T1"]
    assert data["fact"] == ["F1"]
    assert data["corollary"] == ["C1"]
    assert data["definition"] == ["D1"]
    assert data["fixpoint"] == ["FP1"]
    assert data["cofixpoint"] == ["CFP1"]
    assert data["inductive"] == ["I1"]
    assert data["record"] == ["R1"]
    assert data["class"] == ["CL1"]
    assert data["instance"] == ["INST1"]
    assert data["axiom"] == ["AX1"]
    assert data["parameter"] == ["P1"]
    assert data["module"] == ["M1"]
    assert data["section"] == ["S1"]


def test_variable_declaration_multiple_names():
    text = """
    Variable x y z.
    Variables a b.
    """

    parser = RocqParser()
    parser.parse_text(text)

    assert sorted(parser.variable_nodes) == ["a", "b", "x", "y", "z"]


def test_duplicate_entries_are_ignored():
    text = """
    Lemma Dup.
    Lemma Dup.
    Theorem DupT.
    Theorem DupT.
    """

    parser = RocqParser()
    parser.parse_text(text)

    assert parser.lemma_nodes == {"Dup"}
    assert parser.theorem_nodes == {"DupT"}


def test_comments_are_stripped():
    text = """
    (* This is a comment *)
    Lemma Visible.
    (* Nested (* inner *) comment *)
    Theorem AlsoVisible.
    """

    parser = RocqParser()
    parser.parse_text(text)

    assert "Visible" in parser.lemma_nodes
    assert "AlsoVisible" in parser.theorem_nodes


def test_nested_comments_do_not_leak_code():
    text = """
    (* Outer comment
        (* Inner comment *)
        Lemma Hidden.
    *)
    Definition Shown.
    """

    parser = RocqParser()
    parser.parse_text(text)

    assert "Hidden" not in parser.lemma_nodes
    assert "Shown" in parser.definition_nodes


def test_parse_file(tmp_path: Path):
    file_content = """
    Lemma FileLemma.
    Variable v1 v2.
    """

    file_path = tmp_path / "test.v"
    file_path.write_text(file_content, encoding="utf-8")

    parser = RocqParser()
    parser.parse_file(file_path)

    assert parser.lemma_nodes == {"FileLemma"}
    assert parser.variable_nodes == {"v1", "v2"}


def test_to_json_output_is_valid_json():
    parser = RocqParser()
    parser.parse_text("Lemma Ljson.")

    json_output = parser.to_json()
    parsed = json.loads(json_output)

    assert parsed["lemma"] == ["Ljson"]
    assert isinstance(parsed, dict)
