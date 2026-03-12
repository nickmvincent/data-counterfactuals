---
type: paper_collection
title: Privacy, Memorization & Unlearning
slug: privacy-memorization
visibility: public
include_tags:
  - collection:privacy-memorization
sort_by: year
description: >
  Research on privacy risks from model memorization and differential privacy
  defenses. Covers training data extraction attacks, membership inference,
  and techniques for limiting individual data point influence.
tags:
  - ai-safety
  - ml-methods
  - data-governance
  - training-dynamics
---

Models can memorize training data—sometimes enough to extract it verbatim. Differential privacy limits how much any single point can affect the model (constraining movement in the grid). Shokri et al. is the canonical starting point for membership inference; Carlini et al. shows how memorization can escalate into direct extraction.
