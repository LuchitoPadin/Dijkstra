import random
from typing import List, Tuple, Optional, Dict
from .models import Node, Edge, GraphData


def validate_dag(nodes: List[Node], edges: List[Edge]) -> Tuple[bool, Optional[str]]:
    """
    Valida mediante Búsqueda en Profundidad (DFS) con coloreado de 3 estados
    que el grafo dirigido no contenga ciclos (estrictamente un DAG).
    0 = WHITE (No visitado)
    1 = GRAY (En pila de recursión activa)
    2 = BLACK (Completamente procesado)
    """
    node_ids = [n.id for n in nodes]
    adj: Dict[str, List[str]] = {nid: [] for nid in node_ids}
    for e in edges:
        if e.source in adj:
            adj[e.source].append(e.target)

    color: Dict[str, int] = {nid: 0 for nid in node_ids}
    cycle_nodes: List[str] = []

    def dfs(u: str) -> bool:
        color[u] = 1  # GRAY
        for v in adj.get(u, []):
            if v not in color:
                continue
            if color[v] == 1:
                cycle_nodes.append(v)
                cycle_nodes.append(u)
                return False  # Ciclo detectado
            if color[v] == 0:
                if not dfs(v):
                    return False
        color[u] = 2  # BLACK
        return True

    for nid in node_ids:
        if color[nid] == 0:
            if not dfs(nid):
                cycle_str = " -> ".join(reversed(cycle_nodes))
                return False, f"Ciclo detectado en la topología: {cycle_str}. La red debe ser estrictamente un DAG."

    return True, None


def generate_random_dag(
    num_nodes: int = 10,
    edge_probability: float = 0.35,
    min_weight: int = 2,
    max_weight: int = 20
) -> GraphData:
    """
    Genera un Grafo Dirigido Acíclico (DAG) garantizado matemáticamente.
    Restricción: num_nodes debe estar en [7, 16].
    Garantía de DAG: Los nodos se ordenan topológicamente [0..n-1]
    y solo se permiten aristas dirigidas hacia adelante (u -> v con u < v).
    """
    num_nodes = max(7, min(16, num_nodes))

    nodes: List[Node] = []
    for i in range(num_nodes):
        nid = f"R{i+1:02d}"
        label = f"Router-{i+1:02d}"
        nodes.append(Node(id=nid, label=label))

    edges: List[Edge] = []
    
    # 1. Asegurar conectividad progresiva (cada nodo i > 0 tiene al menos un enlace entrante)
    for i in range(1, num_nodes):
        # Elegir un predecesor aleatorio anterior para garantizar camino
        u_idx = random.randint(max(0, i - 3), i - 1)
        w = random.randint(min_weight, max_weight)
        edges.append(Edge(source=nodes[u_idx].id, target=nodes[i].id, weight=w))

    # 2. Agregar enlaces adicionales aleatorios (solo hacia adelante u < v)
    # y ocasionalmente sincronizar pesos para fomentar múltiples caminos mínimos
    for u in range(num_nodes):
        for v in range(u + 1, num_nodes):
            # Evitar duplicados
            if any(e.source == nodes[u].id and e.target == nodes[v].id for e in edges):
                continue
            
            # Probabilidad de conexión
            if random.random() < edge_probability:
                # 20% de probabilidad de copiar el peso de otro enlace entrante a 'v' para generar empates
                incoming = [e.weight for e in edges if e.target == nodes[v].id]
                if incoming and random.random() < 0.25:
                    w = random.choice(incoming)
                else:
                    w = random.randint(min_weight, max_weight)
                
                edges.append(Edge(source=nodes[u].id, target=nodes[v].id, weight=w))

    return GraphData(nodes=nodes, edges=edges)


def build_adjacency_matrix(graph: GraphData) -> Tuple[List[str], List[str], List[List[int]]]:
    """
    Construye la matriz de adyacencia N x N para el grafo de red dado.
    matrix[i][j] representa la latencia en ms del enlace de fibra óptica del router i al router j.
    Si no existe conexión directa, el valor es 0.
    Dado que el grafo es un DAG ordenado topológicamente, la matriz resultante
    es estrictamente triangular superior con ceros en la diagonal principal.
    """
    node_ids = [n.id for n in graph.nodes]
    node_labels = [n.label for n in graph.nodes]
    n = len(node_ids)
    id_to_idx = {nid: idx for idx, nid in enumerate(node_ids)}

    matrix = [[0 for _ in range(n)] for _ in range(n)]
    for edge in graph.edges:
        if edge.source in id_to_idx and edge.target in id_to_idx:
            u = id_to_idx[edge.source]
            v = id_to_idx[edge.target]
            matrix[u][v] = edge.weight

    return node_ids, node_labels, matrix

