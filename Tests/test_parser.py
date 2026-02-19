import pytest
from Backend.Parser import print_error_msg, Parser


class TestParser:

    def test_create_graph_from_dict_single_node_created(self):
        p = Parser()
        data = {
            "file1.dpd": 'N: 1 "A" [body=yes, kind=cnst, prop=no, path="foo.bar", ];\n'
        }
        p.create_graph_from_dict(data)
        graph = p.fetch_graph_data()
        assert len(graph["nodes"]) == 1
        node = graph["nodes"][0]["data"]
        assert node["node_id"] == 1
        assert node["node_name"] == "A"


    def test_create_graph_from_dict_node_body_and_kind_attributes(self):
        p = Parser()
        data = {
            "file1.dpd": 'N: 1 "A" [body=yes, kind=cnst, prop=no, path="foo.bar", ];\n'
        }
        p.create_graph_from_dict(data)
        graph = p.fetch_graph_data()
        node_attrs = graph["nodes"][0]["data"]["node_attributes"]
        assert node_attrs["body"] == ["yes"]
        assert node_attrs["kind"] == ["cnst"]


    def test_create_graph_from_dict_node_prop_attribute(self):
        p = Parser()
        data = {
            "file1.dpd": 'N: 1 "A" [body=yes, kind=cnst, prop=no, path="foo.bar", ];\n'
        }
        p.create_graph_from_dict(data)
        graph = p.fetch_graph_data()
        node_attrs = graph["nodes"][0]["data"]["node_attributes"]
        assert node_attrs["prop"] == ["no"]


    def test_create_graph_from_dict_single_edge_created(self):
        p = Parser()
        data = {
            "file1.dpd":
                'N: 1 "A" [body=yes, kind=cnst, prop=no, path="foo.bar", ];\n'
                'E: 1 2 [weight=5, ];\n'
        }
        p.create_graph_from_dict(data)
        graph = p.fetch_graph_data()
        assert len(graph["edges"]) == 1
        edge = graph["edges"][0]["data"]
        assert edge["source_node_id"] == 1
        assert edge["target_node_id"] == 2


    def test_create_graph_from_dict_edge_weight_attribute(self):
        p = Parser()
        data = {
            "file1.dpd":
                'N: 1 "A" [body=yes, kind=cnst, prop=no, path="foo.bar", ];\n'
                'E: 1 2 [weight=5, ];\n'
        }
        p.create_graph_from_dict(data)
        graph = p.fetch_graph_data()
        edge_attrs = graph["edges"][0]["data"]["edge_attributes"]
        assert edge_attrs["weight"] == [5]


    def test_create_graph_from_dict_invalid_line_is_ignored(self):
        p = Parser()
        bad_data = {"file1.dpd": "INVALID LINE\n"}
        p.create_graph_from_dict(bad_data)
        graph = p.fetch_graph_data()
        assert graph["nodes"] == []
        assert graph["edges"] == []


    def test_validate_file_grammar_valid_edge_line(self):
        p = Parser()
        assert p.validate_file_grammar(
            "E: 2 3 [weight=10,];"
        )


    def test_validate_file_grammar_invalid_node_line(self):
        p = Parser()
        assert not p.validate_file_grammar(
            "N: 2 B [];"
        )


    def test_print_error_msg_writes_to_stderr(self, monkeypatch):
        captured = []
        class FakeStderr:
            def write(self, x):
                captured.append(x)
        monkeypatch.setattr("sys.stderr", FakeStderr())
        print_error_msg("some error")
        assert captured


    def test_print_error_msg_includes_red_ansi_code(self, monkeypatch):
        captured = []
        class FakeStderr:
            def write(self, x):
                captured.append(x)
        monkeypatch.setattr("sys.stderr", FakeStderr())
        print_error_msg("some error")
        written = "".join(captured)
        assert "\033[91m" in written


    def test_group_node_attributes_ignores_empty_tokens(self):
        p = Parser()
        attr_string = " body=yes  prop=no "
        grouped = p.group_node_attributes(attr_string)
        assert grouped["body"] == ["yes"]
        assert grouped["prop"] == ["no"]


    def test_group_edge_attributes_ignores_empty_tokens(self):
        p = Parser()
        tokens = ["", "weight=3"]
        grouped = p.group_edge_attributes(tokens)
        assert grouped["weight"] == [3]
