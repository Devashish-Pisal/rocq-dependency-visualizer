import re

from Backend.Parser import Parser


class main:

    p = Parser()
    #p.create_graph("rocq-files/PermutationGraph.dpd")

    edge = "E: 206 207 [];"
    node = 'N: 209 "zero_neutral_right" [body=yes, kind=cnst, prop=yes, path="Drun", ];'
    node_1 = 'N: 47 "split_length_r" [body=yes, kind=cnst, prop=yes, ];'
    node_regex = re.compile(
        r"N:\s+\d+\s+\"[a-zA-Z0-9_]+\"\s+\[(body=(yes|no),\s*)?(kind=(cnst|inductive|construct),\s*)?(prop=(yes|no),\s*)?(path=\"[a-zA-Z0-9]+(.[a-zA-Z0-9]+)*\",\s*)?\];")
    edge_regex = re.compile(r"E:\s+\d+\s+\d+\s+\[(weight=\d+,\s*)?\];")


