# Example Files

Sample inputs for trying the visualizer, on the [live demo](https://rocq-dependency-visualizer.onrender.com) or locally. Download a file and drop it on the upload page.

| File | Type | Contents |
|------|------|----------|
| `Naturals.v` | Rocq source | 6 short lemmas about natural numbers. The quickest way to see `.v` compilation in action. |
| `Permutation.v` | Rocq source | A list library of about 1,850 lines, adapted from the Coq standard library: 125 lemmas and theorems, 28 fixpoints, 16 sections. |
| `NaturalsGraph.dpd` | Pre-built graph | The graph of `Naturals.v`: 6 nodes, 2 edges. |
| `PermutationLemmaGraph.dpd` | Pre-built graph | Everything the theorem `Permutation_app_swap` depends on: 22 nodes, 73 edges. |
| `PermutationModuleGraph.dpd` | Pre-built graph | The whole `Permutation.v` module: 183 nodes, 917 edges. |

## Tips

- For a large graph right away, upload `PermutationModuleGraph.dpd`. `.dpd` files are parsed directly, without compilation.
- To see the full feature set, upload `Permutation.v`. Highlighting and coloring by declaration type (Lemma, Theorem, ...) only works with `.v` files, because the types are read from the source code.
- Every file has its own name, so any combination can be uploaded at once.

## How the `.dpd` files are produced

The graphs come from the [dpdgraph](https://github.com/rocq-community/coq-dpdgraph) plugin. For example:

```coq
From dpdgraph Require Import dpdgraph.
Require Import Permutation.

(* Whole module, written to graph.dpd *)
Print FileDependGraph Permutation.

(* One theorem and everything it depends on *)
Set DependGraph File "PermutationLemmaGraph.dpd".
Print DependGraph Permutation.Permutation_app_swap.
```

## License

`Permutation.v` is derived from the Coq standard library and is distributed under the GNU Lesser General Public License 2.1, as stated in its header.
