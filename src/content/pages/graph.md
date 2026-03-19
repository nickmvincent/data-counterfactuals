---
title: The graph explorer
description: Interactive graph/network companion to the grid explorer.
eyebrow: Interactive lab
lede: This companion view fixes an evaluation slice and walks the graph of possible training sets directly. Nodes are training worlds, and edges are one-step edits like ablations, augmentations, or steps inside a data strike.
---

## How to read the graph

Fix one evaluation slice first. Then read each node as a possible training set and each edge as a one-step move in dataset space. Moving downward removes data, moving upward adds data, and longer paths let you trace a strike or coordinated ablation instead of only reading a single local comparison.
