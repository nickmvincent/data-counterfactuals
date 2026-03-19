---
title: Graph explorer
description: Interactive graph/network companion to the grid explorer.
---

## What are we simulating?

The same tiny toy universe as the grid view: possible training slices named `A`, `B`, `C`, `D`, and so on.

## How do I read the graph?

Fix one evaluation slice first. Then read each node as a possible training set and each edge as a one-step move in dataset space. Moving downward removes data, moving upward adds data, and longer paths let you trace a strike or coordinated ablation instead of only reading a single local comparison.

## How do I use this page?

Choose a graph lens, a score rule, a training world, and an evaluation slice. Then click nodes or use the quick actions to move through nearby training sets while the lens panel stays locked to the same selected node.

## What questions can I ask here?

Local ablations, coordinated data strikes, Shapley-style edge sweeps, and scaling layers across the subset lattice.
