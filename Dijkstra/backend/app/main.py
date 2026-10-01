import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .models import GraphData, DijkstraRequest, DijkstraResponse, AdjacencyMatrixResponse
from .graph_service import generate_random_dag, validate_dag, build_adjacency_matrix
from .dijkstra import run_dijkstra

app = FastAPI(
    title="NOC Packet Routing Engine - Dijkstra DAG Simulator",
    version="1.0.0",
    description="Backend para cálculo de camino mínimo con Dijkstra interactivo sobre topologías de red DAG."
)

# Permitir CORS para desarrollo y visualización local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RandomGraphRequest(BaseModel):
    num_nodes: int = Field(default=10, ge=7, le=16, description="Número de nodos del DAG (7 a 16)")


class ValidationResponse(BaseModel):
    is_dag: bool
    message: str


@app.get("/api/health")
def health_check():
    return {"status": "ONLINE", "service": "Packet Routing Engine", "algorithm": "Dijkstra"}


@app.post("/api/graph/random", response_model=GraphData)
def get_random_dag(req: RandomGraphRequest):
    """
    Genera un Grafo Dirigido Acíclico (DAG) garantizado matemáticamente con n en [7, 16] nodos.
    """
    if req.num_nodes < 7 or req.num_nodes > 16:
        raise HTTPException(status_code=400, detail="La cantidad de nodos debe estar entre 7 y 16.")
    
    dag = generate_random_dag(num_nodes=req.num_nodes)
    return dag


@app.get("/api/graph/adjacency-matrix", response_model=AdjacencyMatrixResponse)
def get_adjacency_matrix_get(num_nodes: int = 10):
    """
    Genera un DAG aleatorio simulando routers y enlaces de fibra óptica (n en [7, 16]),
    y retorna la matriz de adyacencia completa junto con la información del grafo.
    """
    if num_nodes < 7 or num_nodes > 16:
        raise HTTPException(status_code=400, detail="La cantidad de nodos 'num_nodes' debe estar entre 7 y 16.")

    dag = generate_random_dag(num_nodes=num_nodes)
    node_ids, node_labels, matrix = build_adjacency_matrix(dag)
    is_dag, _ = validate_dag(dag.nodes, dag.edges)

    return AdjacencyMatrixResponse(
        num_nodes=len(node_ids),
        node_ids=node_ids,
        node_labels=node_labels,
        matrix=matrix,
        is_dag=is_dag,
        graph=dag
    )


@app.post("/api/graph/adjacency-matrix", response_model=AdjacencyMatrixResponse)
def get_adjacency_matrix_post(req: RandomGraphRequest):
    """
    Genera un DAG aleatorio (n en [7, 16]) y retorna su matriz de adyacencia (método POST).
    """
    if req.num_nodes < 7 or req.num_nodes > 16:
        raise HTTPException(status_code=400, detail="La cantidad de nodos debe estar entre 7 y 16.")

    dag = generate_random_dag(num_nodes=req.num_nodes)
    node_ids, node_labels, matrix = build_adjacency_matrix(dag)
    is_dag, _ = validate_dag(dag.nodes, dag.edges)

    return AdjacencyMatrixResponse(
        num_nodes=len(node_ids),
        node_ids=node_ids,
        node_labels=node_labels,
        matrix=matrix,
        is_dag=is_dag,
        graph=dag
    )


@app.post("/api/graph/matrix/from-graph", response_model=AdjacencyMatrixResponse)
def get_matrix_from_existing_graph(graph: GraphData):
    """
    Calcula y retorna la matriz de adyacencia para cualquier grafo suministrado por el cliente.
    """
    node_ids, node_labels, matrix = build_adjacency_matrix(graph)
    is_dag, _ = validate_dag(graph.nodes, graph.edges)

    return AdjacencyMatrixResponse(
        num_nodes=len(node_ids),
        node_ids=node_ids,
        node_labels=node_labels,
        matrix=matrix,
        is_dag=is_dag,
        graph=graph
    )


@app.post("/api/graph/validate", response_model=ValidationResponse)
def validate_graph(graph: GraphData):
    """
    Valida mediante DFS si el grafo suministrado manualmente es estrictamente un DAG.
    """
    if len(graph.nodes) < 7 or len(graph.nodes) > 16:
        return ValidationResponse(
            is_dag=False,
            message=f"La cantidad actual de nodos es {len(graph.nodes)}. El grafo debe tener entre 7 y 16 nodos."
        )

    is_valid, err = validate_dag(graph.nodes, graph.edges)
    if not is_valid:
        return ValidationResponse(is_dag=False, message=err or "Ciclo detectado en la red.")

    return ValidationResponse(is_dag=True, message="Topología válida: La red es estrictamente un DAG sin ciclos.")


@app.post("/api/dijkstra/run", response_model=DijkstraResponse)
def execute_dijkstra(req: DijkstraRequest):
    """
    Ejecuta el algoritmo de Dijkstra paso a paso y genera todos los snapshots,
    así como el conteo y secuencia de todas las rutas mínimas posibles.
    """
    # Validar que los nodos existen en el grafo
    node_ids = {n.id for n in req.graph.nodes}
    if req.source not in node_ids:
        raise HTTPException(status_code=400, detail=f"Router origen '{req.source}' no existe en el grafo.")
    if req.target not in node_ids:
        raise HTTPException(status_code=400, detail=f"Router destino '{req.target}' no existe en el grafo.")

    # Validar que el grafo sea un DAG
    is_dag, err = validate_dag(req.graph.nodes, req.graph.edges)
    if not is_dag:
        raise HTTPException(status_code=400, detail=f"No se puede ejecutar Dijkstra: {err}")

    result = run_dijkstra(req.graph, req.source, req.target)
    return result


# Montar carpeta frontend como archivos estáticos
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
