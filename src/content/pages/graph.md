---
title: Graph explorer
description: Interactive graph/network companion to the grid explorer.
---

## What are we simulating?

We imagine an AI operator is training some machine learning model on different slices of data. There is a small set of data objects to choose between, named `A`, `B`, `C`, `D`, and so on. The operator will train a model on some slice of training data (e.g., A, B, and C) and then evaluate on a set of data (e.g., just A and B).

## How do I read the graph?

Fix one evaluation slice first. Then read each node as a possible training set and each edge as a one-step move in dataset space. Moving downward removes data, moving upward adds data, and longer paths let you trace a strike or coordinated ablation instead of only reading a single local comparison.

## How do I use this page?

Choose a graph lens, a score rule, a training world, and an evaluation slice. Then click nodes or use the quick actions to move through nearby training sets while the lens panel stays locked to the same selected node.

## What questions can I ask here?

Local ablations, coordinated data strikes, Shapley-style edge sweeps, and scaling layers across the subset lattice.
