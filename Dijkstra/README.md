# Simulador de Enrutamiento de Paquetes en Redes // Algoritmo de Dijkstra SPF (DAG)

Sistema interactivo cliente-servidor para la simulación y análisis del **Algoritmo de Dijkstra** aplicado al enrutamiento de paquetes en redes de computadoras con topologías de **Grafo Dirigido Acíclico (DAG)**. Desarrollado con **Python (FastAPI)** en el backend y **Vanilla JavaScript + Vis.js** en el frontend.

---

## 🎯 Fundamento Conceptual y Académico

1. **Topología de Redes y Justificación Matemática del DAG:**
   - La red modela routers/switches como vértices y enlaces de fibra óptica unidireccionales como aristas ponderadas con latencias positivas en milisegundos ($ms$).
   - La restricción de **Grafo Dirigido Acíclico (DAG)** con $n \in [7, 16]$ se justifica en redes reales por las **políticas de firewall** y protocolos de enrutamiento libre de bucles (*Loop-Free Routing*, STP, Split Horizon), que fuerzan que el tráfico fluya en un sentido jerárquico determinado, previniendo activamente *tormentas de difusión (broadcast storms)* y caídas del sistema.

2. **Estructuras de Datos y Procesamiento Backend:**
   - Representación mediante **matriz de adyacencia triangular superior** y listas de adyacencia.
   - El motor de Dijkstra opera como una **máquina de estados**, emitiendo un *snapshot* estructurado por cada iteración y evento de relajación.

3. **Caminos Múltiples de Costo Idéntico (ECMP):**
   - En infraestructuras de alta disponibilidad, la existencia de múltiples caminos con la misma latencia acumulada exacta justifica la configuración de rutas redundantes para balanceo de carga y tolerancia a fallos (**Equal-Cost Multi-Path - ECMP**).
   - El backend utiliza un registro de predecesores múltiple y *backtracking DFS* para reconstruir todas las rutas mínimas posibles.

4. **Visualización Interactiva Frame por Frame:**
   - El frontend visualiza el avance del paquete de datos paso a paso en el lienzo (Vis.js).
   - Los routers cambian dinámicamente de color (amarillo para inspección, verde para latencia definitiva fijada).
   - La tabla de ruteo destaca en vivo la relajación de distancias de infinito a valores reales finitos ($\infty \to d(v)$).

---

## 🛠️ Stack Tecnológico

- **Backend:** Python 3.10+, FastAPI, Uvicorn, Pydantic.
- **Frontend:** HTML5 semántico, CSS3 Vanilla (Dark Mode estilo Consola NOC / Cyberpunk), JavaScript ES6+.
- **Renderizado de Grafos:** Vis.js Network (Canvas nativo con animación de paquetes de datos).

---

## 📂 Estructura del Proyecto

```text
Dijkstra/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # Endpoints FastAPI y montaje de estáticos
│   │   ├── models.py            # Modelos Pydantic (GraphData, StepSnapshot, DijkstraResponse)
│   │   ├── graph_service.py     # Generación de DAG, validación DFS y matrices
│   │   └── dijkstra.py          # Máquina de estados de Dijkstra y backtracking de rutas
│   └── run.py                   # Script de arranque del servidor Uvicorn
├── frontend/
│   ├── index.html               # Interfaz de usuario (HUD, lienzo Vis.js, telemetría)
│   ├── css/
│   │   └── styles.css           # Sistema de diseño Cyberpunk NOC Dark Mode
│   └── js/
│       ├── api.js               # Cliente HTTP hacia la API REST
│       ├── controller.js        # Reproductor interactivo paso a paso (DijkstraPlayer)
│       ├── graphRenderer.js     # Motor de renderizado en Vis.js y animación de paquetes
│       └── app.js               # Lógica de interacción, eventos y atajos de teclado
├── requirements.txt             # Dependencias de Python
├── .gitignore                   # Exclusión de temporales y bytecode
└── README.md                    # Documentación del proyecto
```

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- Python 3.9 o superior instalado.

### 1. Clonar o descargar el repositorio
```bash
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd Dijkstra
```

### 2. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 3. Iniciar el servidor
```bash
python backend/run.py
```
El backend iniciará en `http://127.0.0.1:8000` y servirá automáticamente el frontend.

### 4. Abrir la aplicación
Abre tu navegador en:
```
http://127.0.0.1:8000/
```
*(También puedes abrir directamente el archivo `frontend/index.html` en el navegador).*

---

## 🎮 Controles y Uso

1. **Generación de Topología:**
   - **Generar Red DAG:** Crea un nuevo DAG aleatorio con la cantidad de routers seleccionada ($n \in [7, 16]$).
   - **Diseño Manual (DFS):** Permite ingresar routers y enlaces manualmente, certificando mediante DFS que no existan ciclos antes de renderizar.
   - **Matriz de Adyacencia:** Muestra la matriz $N \times N$ triangular superior con opción de exportar en JSON.
   - **Justificación DAG & Rúbrica:** Despliega el fundamento teórico para la evaluación académica.

2. **Cálculo y Reproducción Paso a Paso:**
   - Selecciona **Router Origen** y **Router Destino**.
   - Presiona **"Calcular Enrutamiento Óptimo"** o directamente **"Siguiente ▶"**.
   - Utiliza los controles de reproducción:
     - `◀ Anterior`: Retrocede un frame en el algoritmo.
     - `Siguiente ▶`: Avanza al siguiente snapshot.
     - `▶ Auto`: Reproduce automáticamente a la velocidad configurada.
     - `⏮ Inicio`: Reinicia al estado inicial.

3. **Atajos de Teclado:**
   - `➔` (Flecha Derecha): Siguiente paso.
   - `⬅` (Flecha Izquierda): Paso anterior.
   - `Espacio`: Reproducir / Pausar.

4. **Inspección de Enlaces Redundantes (ECMP):**
   - Cada ruta óptima encontrada se lista en el panel derecho.
   - Presiona **"Inspeccionar"** para aislar y resaltar ese camino sobre el grafo.
   - Presiona **"Simular Paquete"** para inyectar un paquete que viaja a través de la secuencia de routers.
   - Presiona **"Ver Todas"** para observar todos los caminos mínimos simultáneamente.

---

## 📄 Licencia

Proyecto desarrollado con fines académicos bajo estándares de ingeniería de software y matemática computacional.
