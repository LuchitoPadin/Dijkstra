// API Client para comunicación con backend FastAPI
const API_BASE = (window.location.origin && window.location.origin.startsWith("http")) 
  ? `${window.location.origin}/api` 
  : "http://127.0.0.1:8000/api";

const ApiClient = {
  async getRandomDag(numNodes = 10) {
    const res = await fetch(`${API_BASE}/graph/random`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ num_nodes: numNodes })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error al generar grafo aleatorio");
    }
    return await res.json();
  },

  async getAdjacencyMatrix(numNodes = 10) {
    const res = await fetch(`${API_BASE}/graph/adjacency-matrix?num_nodes=${numNodes}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error al obtener matriz de adyacencia");
    }
    return await res.json();
  },

  async getMatrixFromGraph(graphData) {
    const res = await fetch(`${API_BASE}/graph/matrix/from-graph`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error al calcular matriz");
    }
    return await res.json();
  },

  async validateGraph(graphData) {
    const res = await fetch(`${API_BASE}/graph/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error al validar topología");
    }
    return await res.json();
  },

  async runDijkstra(graphData, source, target) {
    const res = await fetch(`${API_BASE}/dijkstra/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        graph: graphData,
        source: source,
        target: target
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error al calcular Dijkstra");
    }
    return await res.json();
  }
};

window.ApiClient = ApiClient;
