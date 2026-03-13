---
order: 3
title: "Glossary"
summary: "Working definitions for the key terms used across the memo, explorer, and reading lists."
date: "2026-03-12T00:00:00.000Z"
visibility: public
type: glossary
---

Use this when you want a quick definition without leaving the thread of the argument. The entries are short on purpose: enough to keep the site legible without turning the glossary into a second, heavier memo.

These are working definitions for this project. They are meant to make the site easier to navigate, not to settle contested terminology across the entire literature.

## Terms

### Active learning

Choosing which data points to label next under a limited labeling budget. In grid language, it is a strategy for deciding which rows become available for training.

### Backdoor attack

A type of data poisoning where a trigger pattern causes the model to misclassify inputs containing that trigger, while behaving normally otherwise.

### Banzhaf value

Another rule for valuing data points by asking how much they help across many possible subsets. Compared with Shapley-style methods, it uses a simpler averaging rule over those subsets.

### Beta Shapley

A version of Data Shapley that puts more or less emphasis on different subset sizes. In grid terms, it changes which kinds of row comparisons matter most when you assign value to data.

### Coreset

A small subset of training data that approximates training on the full dataset. The goal is to find a much smaller row in the grid that lands in roughly the same performance region.

### Curriculum learning

Training on examples in a meaningful order, often from easy to hard. It changes how you move through the grid over time, not just which row you end on.

### Data augmentation

Creating synthetic variations of training data such as crops, rotations, or noise. It effectively adds nearby rows to the grid.

### Data cartography

Mapping examples by training dynamics such as confidence and variability. It helps surface easy, ambiguous, or potentially mislabeled regions of a dataset.

### Data counterfactual

A "what if" question about training data. What would happen to model performance if we trained on different data? The grid visualization is a teaching model for organizing those questions, not something we literally enumerate in real systems.

### Data leverage

The power that data creators have over AI systems by virtue of controlling training data. Leverage depends on how much performance drops when data is withheld or degraded.

### Data poisoning

Deliberately corrupting training data to cause targeted model failures. Expands the grid dramatically; every possible perturbation creates new rows with potentially different outcomes.

### Data Shapley

A method for assigning value to each training point based on its average marginal contribution across all possible subsets. Borrowed from cooperative game theory. Computationally expensive but theoretically principled.

### Data strike

Coordinated withholding of data by creators to reduce model performance and exert leverage over AI operators. A strategic move to a less favorable row in the grid.

### Dataset distillation

Learning a tiny synthetic training set that produces similar downstream behavior to a much larger real dataset. In grid terms, it tries to replace a large row neighborhood with a compact synthetic stand-in.

### Differential privacy

A mathematical framework for limiting how much any single data point can affect model outputs. It constrains how far the model can move in the grid when one point changes.

### Evaluation set

The data used to measure model performance. In the grid, each column represents one possible evaluation point or slice.

### Forgetting event

A moment during training when an example flips from correctly classified to incorrectly classified. Many forgetting events can signal hard, noisy, or atypical data points.

### Influence function

A technique for estimating how much a single training example affects a model's predictions, without retraining. Approximates what would happen if you removed or upweighted that point.

### Leave-one-out

The simplest data counterfactual: compare performance with and without a single data point. In the grid, this means comparing two rows that differ by exactly one point.

### Machine unlearning

Efficiently updating a model as if a data point was never in the training set, moving from one row to another without full retraining.

### Membership inference

Trying to determine whether a specific example was in a model's training set by exploiting differences between seen and unseen data.

### Memorization

When a model stores training data too literally rather than learning general patterns. That can enable extraction attacks that recover private examples from model outputs.

### Representer point

A training example flagged as especially helpful for explaining a prediction. It plays a role similar to influence functions, but comes from a different mathematical route.

### Reweighing

A fairness-oriented preprocessing method that changes how much different examples or groups count during training. In grid language, it changes the row before learning starts.

### Scaling law

An empirical relationship describing how model performance changes with data size, model size, or compute. In grid terms, a regression over average performance across rows grouped by size.

### Training set

The data used to train a model. In the grid, each row represents one possible training set.
