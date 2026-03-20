# Nature-Inspired PCB Routing Optimization

> Course project on automatic PCB routing using nature-inspired optimization algorithms.

## Team
- **Sabina Yamilova**
- **Artem Salakhutdinov**
- **Timur Kagarmanov**

---

## Project Overview

Printed Circuit Board (PCB) routing is the process of connecting pins and components on a board with conductive paths while respecting physical and design constraints.  
In this project, we study **automatic PCB routing** as an optimization problem and solve it using **nature-inspired algorithms**.

Our idea is to represent the board as a **grid-based environment** with:
- pins that must be connected,
- obstacles and blocked cells,
- multiple nets,
- optional multi-layer routing support.

Then we compare **evolutionary / swarm-based methods** with simpler baseline approaches.

---

## Problem Statement

The goal of the project is to automatically generate valid routes for PCB nets such that:

- the total path length is minimized,
- routing conflicts are reduced,
- congestion is minimized,
- the number of unnecessary vias / layer changes is reduced,
- the solution remains feasible under board constraints.

In other words, we want to build an algorithm that can find good routing solutions on benchmark PCB instances.

---

## Main Objectives

- Model PCB routing as a grid-based optimization problem
- Prepare benchmark datasets for experiments
- Implement baseline routing methods
- Implement nature-inspired optimization algorithms
- Design a fitness / evaluation function
- Compare solution quality and runtime
- Visualize routing results and summarize findings

---

## Methods

### Baseline Methods
We use simple routing strategies as reference methods:
- **Greedy routing**
- **A\*** search

These baselines help us evaluate whether nature-inspired methods provide improvements on more complex routing instances.

### Nature-Inspired Algorithms
The main focus of the project is on:
- **Genetic Algorithm (GA)**
- **Ant Colony Optimization (ACO)**

These methods are used to search for better routing solutions in large and constrained search spaces.

---

## Optimization Criteria

The quality of a routing solution is evaluated using a fitness / cost function that may include:

- total wire length,
- number of conflicts,
- congestion overflow,
- number of vias / layer changes,
- feasibility penalties for invalid routes.

A better solution should produce shorter, cleaner, and less congested routes.

---

## Datasets and Resources

We plan to use benchmark PCB / routing datasets such as:
- **ISPD-style routing benchmarks**
- **ISPD 2019 contest instances**
- **PCBench**
- optionally other publicly available PCB routing datasets

During preprocessing, all instances will be converted into a **unified internal format** suitable for our algorithms.

---

## Project Workflow

The project is divided into weekly sprints.

### Week 1 — Dataset Preparation
**Goal:** collect and prepare data for experiments.

Tasks:
- study available benchmark datasets,
- choose usable routing instances,
- define a unified input format,
- convert sample instances,
- document dataset structure.

Expected outcome:
- prepared raw and processed datasets,
- clear description of instance format,
- sample routing instances ready for loading.

---

### Week 2 — Problem Modeling and Initial Implementation
**Goal:** create the routing environment and initial infrastructure.

Tasks:
- represent PCB routing as a grid,
- define data structures for pins, nets, obstacles, and boards,
- implement parser / loader for processed instances,
- build validation logic,
- implement a basic baseline version.

Expected outcome:
- working environment model,
- ability to load and visualize a routing instance,
- first baseline-ready setup.

---

### Week 3 — Nature-Inspired Algorithms
**Goal:** implement the main optimization algorithms.

Tasks:
- implement Genetic Algorithm,
- implement Ant Colony Optimization,
- define fitness function,
- integrate algorithms with routing environment,
- run first small-scale experiments.

Expected outcome:
- working GA and ACO prototypes,
- first routing results on benchmark instances.

---

### Week 4 — Evaluation and Comparison
**Goal:** compare methods and analyze results.

Tasks:
- run experiments on selected datasets,
- compare GA / ACO with baseline methods,
- measure route quality and runtime,
- tune parameters,
- visualize results.

Expected outcome:
- tables, plots, and comparisons,
- discussion of strengths and limitations,
- reproducible experiment results.

---

### Week 5 — Finalization and Documentation
**Goal:** prepare the final project deliverables.

Tasks:
- clean the repository,
- finalize documentation,
- improve visualizations,
- summarize methodology and results,
- prepare final report / presentation.

Expected outcome:
- complete repository,
- final report,
- final presentation-ready materials.

---

## Team Responsibilities

### Artem Salakhutdinov
- environment modeling,
- grid and routing representation,
- baseline implementation.

### Timur Kagarmanov
- evolutionary optimization framework,
- implementation of GA / ACO,
- algorithm integration.

### Sabina Yamilova
- experimental evaluation,
- parameter tuning,
- visualization,
- documentation and reporting.

---

## Repository Structure

```text
.
├── data/
│   ├── raw/                # original benchmark datasets
│   └── processed/          # converted instances in project format
├── docs/                   # documentation, notes, reports
├── notebooks/              # experiments and exploratory analysis
├── src/
│   ├── environment/        # grid, pins, nets, obstacles, board model
│   ├── parsing/            # dataset loaders and converters
│   ├── baselines/          # greedy / A* routing
│   ├── optimization/       # GA, ACO, fitness functions
│   ├── visualization/      # plotting and route visualization
│   └── utils/              # helper functions
├── results/                # experiment outputs, plots, tables
├── README.md
└── requirements.txt
