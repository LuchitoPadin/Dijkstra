from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class Node(BaseModel):
    id: str
    label: str


class Edge(BaseModel):
    source: str
    target: str
    weight: int = Field(gt=0, description="Latencia del enlace en milisegundos (entero positivo)")


class GraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]


class StepSnapshot(BaseModel):
    step: int
    evaluating_node: Optional[str] = None
    active_edge: Optional[List[str]] = None
    visited: List[str] = Field(default_factory=list)
    distances: Dict[str, Optional[int]] = Field(default_factory=dict)
    predecessors: Dict[str, List[str]] = Field(default_factory=dict)
    log_message: str


class DijkstraRequest(BaseModel):
    graph: GraphData
    source: str
    target: str


class DijkstraResponse(BaseModel):
    source: str
    target: str
    is_reachable: bool
    min_distance: Optional[int] = None
    path_count: int = 0
    shortest_paths: List[List[str]] = Field(default_factory=list)
    steps: List[StepSnapshot] = Field(default_factory=list)


class AdjacencyMatrixResponse(BaseModel):
    num_nodes: int
    node_ids: List[str]
    node_labels: List[str]
    matrix: List[List[int]] = Field(description="Matriz de adyacencia donde matrix[i][j] es la latencia en ms del enlace de i a j (0 si no existe enlace)")
    is_dag: bool = Field(default=True, description="Verificación booleana de grafo dirigido acíclico")
    graph: GraphData = Field(description="Estructura completa de nodos y enlaces para renderizado")

