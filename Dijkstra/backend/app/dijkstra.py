import copy
from typing import Generator, List, Dict, Optional, Any
from .models import GraphData, StepSnapshot, DijkstraResponse


def reconstruct_all_paths(
    predecessors: Dict[str, List[str]], 
    source: str, 
    target: str
) -> List[List[str]]:
    """
    Reconstruye todos los caminos mínimos posibles desde source hasta target
    utilizando búsqueda en profundidad (DFS) en retroceso sobre los predecesores.
    """
    if source == target:
        return [[source]]
    
    if target not in predecessors or not predecessors[target]:
        return []

    paths: List[List[str]] = []

    def backtrack(curr: str, current_path: List[str]):
        if curr == source:
            paths.append(list(reversed(current_path)))
            return
        
        for pred in predecessors.get(curr, []):
            if pred not in current_path:
                current_path.append(pred)
                backtrack(pred, current_path)
                current_path.pop()

    backtrack(target, [target])
    # Ordenar las rutas por cantidad de saltos (menor cantidad de routers intermedios primero)
    paths.sort(key=lambda p: (len(p), "->".join(p)))
    return paths


def dijkstra_generator(
    graph: GraphData, 
    source: str, 
    target: Optional[str] = None
) -> Generator[Dict[str, Any], None, None]:
    """
    Generador del algoritmo de Dijkstra como máquina de estados.
    Emite un 'snapshot' detallado en cada iteración y evento relevante:
      - Inicialización
      - Selección del nodo a evaluar
      - Relajación de enlaces vecinos (incluyendo detección de rutas alternativas de igual costo)
      - Finalización de visita del nodo
    """
    # Lista de nodos y mapa de adyacencia
    node_ids = [node.id for node in graph.nodes]
    adj: Dict[str, List[tuple[str, int]]] = {nid: [] for nid in node_ids}
    for edge in graph.edges:
        if edge.source in adj:
            adj[edge.source].append((edge.target, edge.weight))

    # Inicialización de distancias, predecesores y visitados
    distances: Dict[str, Optional[int]] = {nid: None for nid in node_ids}
    distances[source] = 0
    predecessors: Dict[str, List[str]] = {nid: [] for nid in node_ids}
    visited: List[str] = []
    unvisited = set(node_ids)

    step_counter = 1

    def create_snapshot(
        evaluating_node: Optional[str], 
        log_msg: str, 
        active_edge: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        return {
            "step": step_counter,
            "evaluating_node": evaluating_node,
            "active_edge": active_edge,
            "visited": list(visited),
            "distances": {k: v for k, v in distances.items()},
            "predecessors": {k: list(v) for k, v in predecessors.items() if v},
            "log_message": log_msg,
        }

    # Snapshot inicial
    yield create_snapshot(
        evaluating_node=None,
        log_msg=f"Inicialización de red: Router origen '{source}' con latencia 0ms. Demás routers con latencia infinita (∞).",
        active_edge=None
    )

    # Caso especial: origen es igual a destino
    if target and source == target:
        visited.append(source)
        step_counter += 1
        yield create_snapshot(
            evaluating_node=source,
            log_msg=f"Router origen '{source}' es el mismo router destino. Latencia mínima final: 0ms.",
            active_edge=None
        )
        return

    # Bucle principal de Dijkstra
    while unvisited:
        # Seleccionar el nodo no visitado con la menor distancia conocida
        candidates = [nid for nid in unvisited if distances[nid] is not None]
        if not candidates:
            # Los nodos restantes no son alcanzables
            remaining_unvisited = sorted(list(unvisited))
            step_counter += 1
            yield create_snapshot(
                evaluating_node=None,
                log_msg=f"No hay más rutas disponibles desde '{source}'. Routers inalcanzables: {', '.join(remaining_unvisited)}.",
                active_edge=None
            )
            break

        current_node = min(candidates, key=lambda nid: (distances[nid], nid))
        current_dist = distances[current_node]

        # En Dijkstra con pesos no negativos, al extraer el nodo con distancia mínima,
        # su distancia ya es definitiva y se marca como visitado.
        unvisited.remove(current_node)
        visited.append(current_node)

        # Snapshot de selección de nodo
        step_counter += 1
        is_dest = (target is not None and current_node == target)
        dest_tag = " [¡Router Destino Alcanzado!]" if is_dest else ""
        yield create_snapshot(
            evaluating_node=current_node,
            log_msg=f"Seleccionando router '{current_node}' por menor latencia acumulada ({current_dist}ms). Marcado como visitado.{dest_tag}",
            active_edge=None
        )

        # Relajación de aristas salientes del nodo actual
        neighbors = adj.get(current_node, [])
        for neighbor, weight in neighbors:
            if neighbor in unvisited:
                new_dist = current_dist + weight
                old_dist = distances[neighbor]

                if old_dist is None or new_dist < old_dist:
                    old_str = f"{old_dist}ms" if old_dist is not None else "∞"
                    distances[neighbor] = new_dist
                    predecessors[neighbor] = [current_node]
                    step_counter += 1
                    yield create_snapshot(
                        evaluating_node=neighbor,
                        log_msg=f"Relajando enlace {current_node} -> {neighbor}: Latencia hacia '{neighbor}' reducida a {new_dist}ms (anterior: {old_str}). Predecesor óptimo fijado en '{current_node}'.",
                        active_edge=[current_node, neighbor]
                    )
                elif new_dist == old_dist:
                    if current_node not in predecessors[neighbor]:
                        predecessors[neighbor].append(current_node)
                    step_counter += 1
                    yield create_snapshot(
                        evaluating_node=neighbor,
                        log_msg=f"Relajando enlace {current_node} -> {neighbor}: ¡Ruta alternativa óptima detectada! Misma latencia acumulada ({new_dist}ms). Se añade '{current_node}' como predecesor adicional.",
                        active_edge=[current_node, neighbor]
                    )

    # Snapshot final de cierre
    dest_dist = distances.get(target) if target else None
    step_counter += 1
    yield create_snapshot(
        evaluating_node=None,
        log_msg=f"Algoritmo finalizado. Latencia óptima a '{target}': {f'{dest_dist}ms' if dest_dist is not None else 'Inalcanzable'}.",
        active_edge=None
    )


def run_dijkstra(
    graph: GraphData, 
    source: str, 
    target: str
) -> DijkstraResponse:
    """
    Ejecuta el generador completo y construye la respuesta estructurada
    con todos los snapshots, distancia mínima, caminos múltiples y secuencia de vértices.
    """
    gen = dijkstra_generator(graph, source, target)
    steps_raw: List[Dict[str, Any]] = []

    last_snapshot = None
    for step in gen:
        steps_raw.append(step)
        last_snapshot = step

    final_distances = last_snapshot["distances"] if last_snapshot else {}
    final_predecessors = last_snapshot["predecessors"] if last_snapshot else {}

    target_dist = final_distances.get(target)
    is_reachable = target_dist is not None

    shortest_paths = []
    if is_reachable:
        shortest_paths = reconstruct_all_paths(final_predecessors, source, target)

    step_models = [StepSnapshot(**s) for s in steps_raw]

    return DijkstraResponse(
        source=source,
        target=target,
        is_reachable=is_reachable,
        min_distance=target_dist,
        path_count=len(shortest_paths),
        shortest_paths=shortest_paths,
        steps=step_models
    )
