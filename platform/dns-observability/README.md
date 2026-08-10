# DNS Observability Dashboard

This repository provides the necessary components and configuration files to set up a DNS observability dashboard using AdGuard, Unbound, Grafana, Loki, and Prometheus.

## Getting Started

### Prerequisites
- A running instance of AdGuard for DNS filtering.
- A running instance of Unbound for recursive resolution.
- Grafana for data visualization.
- Loki for logging.
- Prometheus for metrics collection.

### Directory Structure
The following files are included:
- `queries.md`: Contains LogQL and PromQL query templates to extract data from AdGuard and Unbound logs.
- `code.js`: JavaScript code used for transformations in the Grafana Sankey panel.
- `image.png`: Sample image of the Grafana dashboard for visualization reference.

### Setup Instructions
1. Clone this repository:
   ```bash
   git clone <repository-url>
   ```
2. Follow the instructions in `queries.md` to set up the necessary queries in Grafana and Prometheus.
3. Implement the JavaScript code from `code.js` in your Grafana dashboard.
4. Use the sample image in `image.png` as a visual reference while building your dashboard.

### Usage
Once set up, you can visualize your DNS queries through the Grafana dashboard by importing the dashboard JSON containing the configurations and visualizations.

## Contributing
If you want to contribute to this repository, feel free to create pull requests or open issues for enhancements.
