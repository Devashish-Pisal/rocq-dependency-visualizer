(* Some properties about natural numbers and operations on them. *)

(* 1 plus 1 is equal to 2*)
Lemma one_plus_one : 1 + 1 = 2.
Proof.
  reflexivity.
Qed.

(* Addition is associative *)
Lemma add_assoc : forall m n o, (m + n) + o = m + (n + o).
Proof.
  induction m; intros; try reflexivity; simpl; now f_equal.
Qed.

(* Zero is the neutral element of addition *)
Lemma zero_neutral_right : forall n, n + 0 = n.
Proof.
  induction n; try reflexivity; now simpl; f_equal.
Qed.

(* The successor of n is n+1 *)
Lemma successor_plus_one : forall n, S n = n + 1.
Proof.
  induction n; simpl; auto.
Qed.

(* The successor of n+m is equal to n plus the successor of m *)
Lemma plus_n_Sm : forall n m : nat,
  S (n + m) = n + (S m).
Proof.
  induction n; intros.
  - reflexivity.
  - simpl; now f_equal.
Qed.

(* Addition is commutative *)
Lemma add_comm : forall n m, m + n = n + m.
Proof.
  induction n; intros.
  - simpl; apply zero_neutral_right.
  - simpl; rewrite <- plus_n_Sm; now f_equal.
Qed.
