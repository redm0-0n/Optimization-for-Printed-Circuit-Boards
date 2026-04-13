# ⚡️ PCB Routing Optimizer

An advanced research dashboard for visualizing and analyzing Printed Circuit Board (PCB) routing algorithms. This tool provides a professional interface to experiment with A*, Genetic Algorithms (GA), and Ant Colony Optimization (ACO).

## 🚀 Key Features

- **Interactive PCB Canvas**: Native HTML5 Canvas with support for high-density routing visualization, zooming, and panning.
- **Algorithm Analysis**: 
  - **A* Baseline**: Quick greedy routing reference.
  - **GA Explorer**: Experiment with mutation/crossover rates and population size.
  - **ACO Explorer**: Deep dive into pheromone weights, heuristics, and evaporation rates.
- **Visual Analytics**: Real-time fitness convergence charts, parameter sensitivity scatter plots, and multi-run comparison tools.
- **DEF Support**: Upload standard `.def` board definitions for instant routing experiments.

## 🛠 Tech Stack

- **Frontend**: React 18, Tailwind CSS
- **Visualization**: Recharts, HTML5 Canvas API
- **Icons**: Lucide React
- **Solver Connection**: REST API Client
