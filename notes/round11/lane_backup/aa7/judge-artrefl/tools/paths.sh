# per-path references (sourced)
SP=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad; W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work7/artrefl
mask_of() { case $1 in slow|medium|reverse) echo $SP/work5/aa5b/caps/$1_bmask;; fast|diag) echo $SP/work5/aa5a/caps/$1_mask;; leave|rest) echo $SP/work6/refl/caps/$1_bmask;; esac; }
nmask_of() { echo $SP/work5/aa5a/caps/$1_mask; }
gt_of() { case $1 in slow|medium) echo $SP/work3/aa3/caps/$1_gt;; reverse) echo $SP/work5/aa5b/caps/reverse_gt;; fast|diag|leave) echo $SP/work6/refl/caps/$1_gt;; rest) echo $SP/work5/aa5b/caps/rest_gt;; esac; }
fix_of() { case $1 in medium) echo $SP/work6/integ/caps/medium_A6g0f0;; *) echo $SP/work6/refl/caps/$1_FIX1;; esac; }
base_of() { echo $SP/work3/aa3/caps/$1_base; }
