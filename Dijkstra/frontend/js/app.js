document.addEventListener("DOMContentLoaded", () => {
  // Elementos DOM
  const nodeCountSelect = document.getElementById("node-count-select");
  const btnGenerateDag = document.getElementById("btn-generate-dag");
  const btnManualMode = document.getElementById("btn-manual-mode");
  const sourceSelect = document.getElementById("source-select");
  const targetSelect = document.getElementById("target-select");
  const btnRunDijkstra = document.getElementById("btn-run-dijkstra");

  // Controles de reproducción
  const btnPrev = document.getElementById("btn-prev");
  const btnPlay = document.getElementById("btn-play");
  const btnNext = document.getElementById("btn-next");
  const btnReset = document.getElementById("btn-reset");
  const stepDisplay = document.getElementById("step-display");
  const speedSlider = document.getElementById("speed-slider");

  // HUD Banner de Relajación en Vivo
  const relaxationHudBanner = document.getElementById("relaxation-hud-banner");
  const hudBannerText = document.getElementById("hud-banner-text");
  const btnLaunchPacket = document.getElementById("btn-launch-packet");
  const btnShowAllPaths = document.getElementById("btn-show-all-paths");

  // Paneles de Telemetría
  const metricDistance = document.getElementById("metric-distance");
  const metricPathsCount = document.getElementById("metric-paths-count");
  const metricStatus = document.getElementById("metric-status");
  const routesContainer = document.getElementById("routes-container");
  const routingTableBody = document.querySelector("#routing-table tbody");
  const terminalLogs = document.getElementById("terminal-logs");

  // Modal Manual
  const modalManual = document.getElementById("modal-manual");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnApplyManual = document.getElementById("btn-apply-manual");
  const manualNodesInput = document.getElementById("manual-nodes-input");
  const manualEdgesInput = document.getElementById("manual-edges-input");
  const manualValidationMsg = document.getElementById("manual-validation-msg");

  // Modal Matriz
  const btnShowMatrix = document.getElementById("btn-show-matrix");
  const modalMatrix = document.getElementById("modal-matrix");
  const btnCloseMatrix = document.getElementById("btn-close-matrix");
  const btnCloseMatrixFooter = document.getElementById("btn-close-matrix-footer");
  const btnCopyMatrixJson = document.getElementById("btn-copy-matrix-json");
  const matrixContainer = document.getElementById("matrix-container");

  // Modal Rúbrica & Justificación DAG
  const btnShowRubric = document.getElementById("btn-show-rubric");
  const modalRubric = document.getElementById("modal-rubric");
  const btnCloseRubric = document.getElementById("btn-close-rubric");
  const btnCloseRubricFooter = document.getElementById("btn-close-rubric-footer");

  // Instancias
  const renderer = new GraphRenderer("network-canvas");
  let currentGraph = null;
  let currentResult = null;
  let previousDistances = {};
  let lastMatrixData = null;

  // Logger en consola estilo terminal NOC
  function appendLog(message, type = "normal") {
    const entry = document.createElement("div");
    entry.className = "log-entry";

    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];

    entry.innerHTML = `
      <span class="log-time">[${timeStr}]</span>
      <span class="log-msg ${type}">${message}</span>
    `;

    terminalLogs.appendChild(entry);
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
  }

  // Actualizar tabla de ruteo mostrando la relajación de infinito (∞) a valor real frame por frame
  function updateRoutingTable(snapshot, idx = 0) {
    if (!currentGraph) return;

    routingTableBody.innerHTML = "";
    const distances = snapshot.distances || {};
    const predecessors = snapshot.predecessors || {};
    const visitedSet = new Set(snapshot.visited || []);
    const evaluating = snapshot.evaluating_node;

    // Obtener las distancias del snapshot anterior en la secuencia de ejecución
    const prevSnapshot = (idx > 0 && player.steps && player.steps[idx - 1]) ? player.steps[idx - 1] : null;
    const prevDistances = prevSnapshot ? (prevSnapshot.distances || {}) : {};

    currentGraph.nodes.forEach((node) => {
      const tr = document.createElement("tr");
      const dist = distances[node.id];
      const prevDist = prevDistances[node.id];

      let distDisplay = "∞";

      if (dist !== null && dist !== undefined) {
        if (prevDist === null || prevDist === undefined) {
          // Bajada de infinito a valor real en este frame
          if (idx > 0) {
            distDisplay = `<span class="latency-drop-badge">∞ ➔ ${dist} ms</span>`;
          } else {
            distDisplay = `${dist} ms`;
          }
        } else if (dist < prevDist) {
          // Reducción de latencia previa en este frame
          distDisplay = `<span class="latency-drop-badge">${prevDist} ➔ ${dist} ms</span>`;
        } else {
          distDisplay = `${dist} ms`;
        }
      }

      const preds = predecessors[node.id] ? predecessors[node.id].join(", ") : "-";

      let statusBadge = `<span style="color:#64748b;">Inexplorado (∞)</span>`;
      if (node.id === evaluating) {
        tr.className = "active-row";
        statusBadge = `<span style="color:#ffd700; font-weight:bold;">⚡ Inspeccionando</span>`;
      } else if (visitedSet.has(node.id)) {
        tr.className = "visited-row";
        statusBadge = `<span style="color:#00ff9d;">✓ Latencia Definitiva</span>`;
      } else if (dist !== null && dist !== undefined) {
        statusBadge = `<span style="color:#00f0ff;">En Cola (Descubierto)</span>`;
      }

      tr.innerHTML = `
        <td><strong>${node.id}</strong></td>
        <td class="latency-cell">${distDisplay}</td>
        <td>${preds}</td>
        <td>${statusBadge}</td>
      `;
      routingTableBody.appendChild(tr);
    });
  }

  // Actualizar el HUD Banner superior con información didáctica del paso
  function updateHudBanner(snapshot, idx, total) {
    if (!relaxationHudBanner || !hudBannerText) return;

    const log = snapshot.log_message || "";
    relaxationHudBanner.classList.remove("active-relaxation", "completed");

    if (log.includes("Relajando")) {
      relaxationHudBanner.classList.add("active-relaxation");
      const match = log.match(/enlace\s+([A-Za-z0-9_-]+)\s*->\s*([A-Za-z0-9_-]+)/i);
      const edgeStr = match ? `${match[1]} ➔ ${match[2]}` : "enlace";
      hudBannerText.innerHTML = `<span style="color:var(--yellow-eval); font-weight:bold;">⚡ RELAJACIÓN FIBRA:</span> ${edgeStr} | ${snapshot.log_message}`;
    } else if (log.includes("Seleccionando")) {
      hudBannerText.innerHTML = `<span style="color:var(--green-visited); font-weight:bold;">🔍 INSPECCIÓN:</span> Router ${snapshot.evaluating_node} | Latencia mínima fijada`;
    } else if (log.includes("finalizado")) {
      relaxationHudBanner.classList.add("completed");
      hudBannerText.innerHTML = `<span style="color:var(--cyan-primary); font-weight:bold;">✓ ENRUTAMIENTO CALCULADO:</span> Trazabilidad SPF completa`;
    } else {
      hudBannerText.textContent = snapshot.log_message;
    }
  }

  // Renderizar las rutas óptimas detectadas con soporte interactivo para enlaces redundantes (ECMP)
  function renderOptimalRoutes(finalResult) {
    routesContainer.innerHTML = "";

    if (!finalResult.is_reachable || !finalResult.shortest_paths || finalResult.shortest_paths.length === 0) {
      routesContainer.innerHTML = `<div style="color:#ff3366; font-size:0.8rem; padding:6px;">No existe conectividad física hacia el router destino.</div>`;
      btnShowAllPaths.style.display = "none";
      btnLaunchPacket.disabled = true;
      return;
    }

    const paths = finalResult.shortest_paths;
    const isEcmp = paths.length > 1;

    // Mostrar botón para resaltar todas las rutas simultáneas
    btnShowAllPaths.style.display = isEcmp ? "inline-block" : "none";
    btnLaunchPacket.disabled = false;

    // Header contextual si hay múltiples caminos de igual costo (ECMP)
    if (isEcmp) {
      const ecmpHeader = document.createElement("div");
      ecmpHeader.style.cssText = "font-size:0.7rem; color:var(--yellow-eval); font-family:var(--text-mono); margin-bottom:4px;";
      ecmpHeader.innerHTML = `★ <strong>TOLERANCIA A FALLOS (ECMP):</strong> ${paths.length} enlaces redundantes de latencia idéntica (${finalResult.min_distance}ms)`;
      routesContainer.appendChild(ecmpHeader);
    }

    paths.forEach((path, i) => {
      const card = document.createElement("div");
      card.className = "route-card-item";
      card.dataset.index = i;

      const hops = path.length - 1;

      card.innerHTML = `
        <div class="route-card-header">
          <span class="route-badge">Ruta Óptima #${i + 1} (${hops} saltos)</span>
          <span class="route-latency-badge">${finalResult.min_distance} ms</span>
        </div>
        <div class="route-sequence">
          ${path.map((nodeId, idx) => `
            <span>${nodeId}</span>${idx < path.length - 1 ? '<span class="route-arrow">➔</span>' : ''}
          `).join("")}
        </div>
        <div class="route-actions">
          <button class="route-btn view-path-btn" title="Resaltar esta ruta en el lienzo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
            Inspeccionar
          </button>
          <button class="route-btn packet-btn sim-packet-btn" title="Enviar paquete de datos por este camino">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            Simular Paquete
          </button>
        </div>
      `;

      // Evento Inspeccionar Ruta Individual
      card.querySelector(".view-path-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".route-card-item").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        renderer.highlightSinglePath(path, paths);
        appendLog(`Inspeccionando individualmente Ruta #${i + 1}: ${path.join(" ➔ ")} (${finalResult.min_distance}ms)`, "relax");
      });

      // Evento Simular Paquete en esta Ruta
      card.querySelector(".sim-packet-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        renderer.launchPacket(path, {
          color: "#ff7700",
          glowColor: "rgba(255, 119, 0, 0.5)",
          speed: 0.05,
          loop: false
        });
        appendLog(`Paquete de prueba transmitido a través de Ruta #${i + 1} (${path.join(" ➔ ")})`, "eval");
      });

      routesContainer.appendChild(card);
    });
  }

  // Instanciar Reproductor
  const player = new DijkstraPlayer(
    renderer,
    (snapshot, idx, total) => {
      // Callback en cambio de paso
      stepDisplay.textContent = `Paso ${idx + 1} / ${total}`;

      // Actualizar estados visuales de los botones Anterior y Siguiente
      btnPrev.disabled = idx === 0;
      btnNext.disabled = idx === total - 1;
      btnPrev.style.opacity = idx === 0 ? "0.4" : "1";
      btnNext.style.opacity = idx === total - 1 ? "0.4" : "1";

      if (idx < total - 1) {
        metricStatus.textContent = "EN PROCESO";
        metricStatus.style.color = "var(--yellow-eval)";
      }

      let logType = "normal";
      if (snapshot.log_message.includes("alternativa")) logType = "eval";
      else if (snapshot.log_message.includes("Relajando")) logType = "relax";
      else if (snapshot.log_message.includes("Seleccionando")) logType = "eval";
      else if (snapshot.log_message.includes("finalizado")) logType = "done";

      appendLog(snapshot.log_message, logType);
      updateRoutingTable(snapshot, idx);
      updateHudBanner(snapshot, idx, total);

      if (idx === total - 1 && currentResult) {
        btnPlay.innerHTML = `<span>▶</span> Auto`;
      }
    },
    (finalResult) => {
      // Callback de finalización
      if (finalResult.is_reachable) {
        metricDistance.textContent = `${finalResult.min_distance} ms`;
        metricPathsCount.textContent = `${finalResult.path_count} ruta(s)`;
        metricStatus.textContent = "OPTIMAL";
        metricStatus.style.color = "#00f0ff";

        renderOptimalRoutes(finalResult);
        appendLog(`Enrutamiento finalizado: ${finalResult.path_count} ruta(s) mínima(s) hallada(s) con latencia de ${finalResult.min_distance}ms.`, "done");
      } else {
        metricDistance.textContent = "Inalcanzable";
        metricPathsCount.textContent = "0";
        metricStatus.textContent = "UNREACHABLE";
        metricStatus.style.color = "#ff3366";
        renderOptimalRoutes(finalResult);
        appendLog(`El router destino es inalcanzable desde el origen seleccionado.`, "error");
      }
    }
  );

  // Poblar Selectores de Origen y Destino
  function populateNodeSelectors() {
    sourceSelect.innerHTML = "";
    targetSelect.innerHTML = "";

    if (!currentGraph || !currentGraph.nodes) return;

    currentGraph.nodes.forEach((node) => {
      const optSrc = document.createElement("option");
      optSrc.value = node.id;
      optSrc.textContent = `${node.label} (${node.id})`;

      const optTgt = document.createElement("option");
      optTgt.value = node.id;
      optTgt.textContent = `${node.label} (${node.id})`;

      sourceSelect.appendChild(optSrc);
      targetSelect.appendChild(optTgt);
    });

    // Seleccionar por defecto primero y último
    if (currentGraph.nodes.length >= 2) {
      sourceSelect.selectedIndex = 0;
      targetSelect.selectedIndex = currentGraph.nodes.length - 1;
    }
  }

  // Generar Red DAG Aleatoria (7-16 routers)
  async function loadRandomDAG() {
    try {
      const n = parseInt(nodeCountSelect.value, 10) || 10;
      appendLog(`Solicitando nueva topología de red DAG con ${n} routers al backend...`);

      const graph = await ApiClient.getRandomDag(n);
      currentGraph = graph;
      currentResult = null;

      populateNodeSelectors();
      renderer.init(currentGraph, sourceSelect.value, targetSelect.value);

      // Reset métricas y estado
      metricDistance.textContent = "--";
      metricPathsCount.textContent = "--";
      metricStatus.textContent = "STANDBY";
      metricStatus.style.color = "#849ab5";
      routesContainer.innerHTML = `<span style="color:#849ab5; font-size:0.78rem;">Ejecute Dijkstra o presione 'Siguiente ▶' para iniciar el cálculo.</span>`;
      stepDisplay.textContent = "Paso 0 / 0";
      routingTableBody.innerHTML = "";
      btnShowAllPaths.style.display = "none";
      btnLaunchPacket.disabled = true;

      btnPrev.disabled = true;
      btnNext.disabled = false;
      btnPrev.style.opacity = "0.4";
      btnNext.style.opacity = "1";

      if (hudBannerText) {
        hudBannerText.textContent = `Topología cargada (${n} routers). Presione 'Siguiente ▶' para avanzar frame a frame.`;
      }

      appendLog(`Topología DAG cargada exitosamente: ${graph.nodes.length} routers, ${graph.edges.length} enlaces ópticos. Políticas sin bucles activas.`, "done");
    } catch (err) {
      appendLog(`Error al generar red: ${err.message}`, "error");
    }
  }

  // Ejecutar Enrutamiento Dijkstra
  async function executeDijkstra() {
    const src = sourceSelect.value;
    const tgt = targetSelect.value;

    if (!src || !tgt) {
      alert("Seleccione tanto el router origen como el router destino.");
      return;
    }

    try {
      appendLog(`Iniciando algoritmo de Dijkstra SPF desde '${src}' hacia '${tgt}'...`);
      renderer.init(currentGraph, src, tgt);

      const result = await ApiClient.runDijkstra(currentGraph, src, tgt);
      currentResult = result;

      player.loadExecution(result);
      btnPlay.innerHTML = `<span>▶</span> Auto`;
      appendLog(`Trazabilidad completada: ${result.steps.length} snapshots listos para reproducción interactiva frame a frame.`, "relax");
    } catch (err) {
      appendLog(`Error al calcular Dijkstra: ${err.message}`, "error");
    }
  }

  // Event Listeners Principales
  btnGenerateDag.addEventListener("click", loadRandomDAG);
  btnRunDijkstra.addEventListener("click", executeDijkstra);

  sourceSelect.addEventListener("change", () => {
    if (currentGraph) {
      renderer.init(currentGraph, sourceSelect.value, targetSelect.value);
    }
  });

  targetSelect.addEventListener("change", () => {
    if (currentGraph) {
      renderer.init(currentGraph, sourceSelect.value, targetSelect.value);
    }
  });

  // Botón Siguiente: avanza un frame o calcula automáticamente si aún no se ha ejecutado
  btnNext.addEventListener("click", async () => {
    if (!currentResult) {
      await executeDijkstra();
      return;
    }
    player.next();
  });

  // Botón Anterior: retrocede un frame en la secuencia de snapshots
  btnPrev.addEventListener("click", () => {
    player.prev();
  });

  btnReset.addEventListener("click", () => {
    player.goToStart();
    btnPlay.innerHTML = `<span>▶</span> Auto`;
  });

  // Atajos de teclado: Flecha Derecha (Siguiente), Flecha Izquierda (Anterior), Espacio (Pausa/Play)
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      btnNext.click();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      btnPrev.click();
    } else if (e.key === " ") {
      e.preventDefault();
      btnPlay.click();
    }
  });

  btnPlay.addEventListener("click", () => {
    player.togglePlay();
    btnPlay.innerHTML = player.isPlaying ? `<span>⏸</span> Pausa` : `<span>▶</span> Auto`;
  });

  speedSlider.addEventListener("input", (e) => {
    const speed = parseInt(e.target.value, 10);
    player.setSpeed(speed);
  });

  // Botón Ver Todas las Rutas ECMP
  btnShowAllPaths.addEventListener("click", () => {
    if (currentResult && currentResult.shortest_paths) {
      document.querySelectorAll(".route-card-item").forEach(c => c.classList.remove("selected"));
      renderer.highlightOptimalPaths(currentResult.shortest_paths);
      appendLog(`Resaltando todas las rutas mínimas óptimas redundantes (ECMP)`, "relax");
    }
  });

  // Botón Inyectar Paquete de Prueba superior
  btnLaunchPacket.addEventListener("click", () => {
    if (currentResult && currentResult.shortest_paths && currentResult.shortest_paths.length > 0) {
      const primaryPath = currentResult.shortest_paths[0];
      renderer.launchPacket(primaryPath, {
        color: "#ff7700",
        glowColor: "rgba(255, 119, 0, 0.6)",
        speed: 0.05,
        loop: false
      });
      appendLog(`Inyección de paquete de prueba en ruta principal: ${primaryPath.join(" ➔ ")}`, "eval");
    }
  });

  // Modal para creación manual con validación DFS
  btnManualMode.addEventListener("click", () => {
    modalManual.classList.add("open");
    manualValidationMsg.textContent = "";
  });

  btnCloseModal.addEventListener("click", () => {
    modalManual.classList.remove("open");
  });

  btnApplyManual.addEventListener("click", async () => {
    try {
      const nodeLines = manualNodesInput.value.trim().split("\n").filter(l => l.trim().length > 0);
      const edgeLines = manualEdgesInput.value.trim().split("\n").filter(l => l.trim().length > 0);

      const nodes = nodeLines.map((id) => ({ id: id.trim(), label: `Router ${id.trim()}` }));
      const edges = [];

      edgeLines.forEach((line) => {
        const parts = line.split(",").map(p => p.trim());
        if (parts.length >= 3) {
          edges.push({
            source: parts[0],
            target: parts[1],
            weight: parseInt(parts[2], 10)
          });
        }
      });

      const manualGraph = { nodes, edges };

      manualValidationMsg.style.color = "#00f0ff";
      manualValidationMsg.textContent = "Certificando ausencia de ciclos mediante DFS en el backend...";

      const validation = await ApiClient.validateGraph(manualGraph);
      if (!validation.is_dag) {
        manualValidationMsg.style.color = "#ff3366";
        manualValidationMsg.textContent = `Error: ${validation.message}`;
        return;
      }

      currentGraph = manualGraph;
      previousDistances = {};
      populateNodeSelectors();
      renderer.init(currentGraph, sourceSelect.value, targetSelect.value);
      modalManual.classList.remove("open");
      appendLog(`Topología manual cargada y validada como DAG libre de ciclos: ${nodes.length} routers.`, "done");
    } catch (err) {
      manualValidationMsg.style.color = "#ff3366";
      manualValidationMsg.textContent = `Error: ${err.message}`;
    }
  });

  // Modal para Visualización de Matriz de Adyacencia
  async function openMatrixModal() {
    if (!currentGraph) return;
    try {
      modalMatrix.classList.add("open");
      matrixContainer.innerHTML = `<div style="color:var(--cyan-primary); font-family:var(--text-mono); padding:10px;">Calculando matriz de adyacencia en backend...</div>`;

      const matrixData = await ApiClient.getMatrixFromGraph(currentGraph);
      lastMatrixData = matrixData;

      // Generar tabla HTML de la matriz N x N
      let tableHtml = `<table class="routing-table" style="text-align: center; border: 1px solid var(--border-color);">`;
      tableHtml += `<thead><tr><th style="color:var(--cyan-primary); background:#080e18;">Router</th>`;
      matrixData.node_ids.forEach(id => {
        tableHtml += `<th style="color:var(--cyan-primary); padding:6px 10px; background:#080e18;">${id}</th>`;
      });
      tableHtml += `</tr></thead><tbody>`;

      matrixData.matrix.forEach((row, i) => {
        const rowId = matrixData.node_ids[i];
        tableHtml += `<tr>`;
        tableHtml += `<td style="font-weight:bold; color:var(--cyan-primary); background:#0c1726; padding:6px 10px;">${rowId}</td>`;
        row.forEach((val) => {
          if (val > 0) {
            tableHtml += `<td style="color:#00f0ff; font-weight:bold; background:rgba(0, 240, 255, 0.08); padding:6px 10px;">${val}ms</td>`;
          } else {
            tableHtml += `<td style="color:#334e68; padding:6px 10px;">0</td>`;
          }
        });
        tableHtml += `</tr>`;
      });
      tableHtml += `</tbody></table>`;

      matrixContainer.innerHTML = tableHtml;
      appendLog(`Matriz de adyacencia generada (${matrixData.num_nodes}x${matrixData.num_nodes}). Estructura: DAG triangular superior.`, "relax");
    } catch (err) {
      matrixContainer.innerHTML = `<div style="color:#ff3366; font-family:var(--text-mono);">Error: ${err.message}</div>`;
    }
  }

  btnShowMatrix.addEventListener("click", openMatrixModal);
  btnCloseMatrix.addEventListener("click", () => modalMatrix.classList.remove("open"));
  btnCloseMatrixFooter.addEventListener("click", () => modalMatrix.classList.remove("open"));

  btnCopyMatrixJson.addEventListener("click", () => {
    if (!lastMatrixData) return;
    navigator.clipboard.writeText(JSON.stringify(lastMatrixData, null, 2)).then(() => {
      btnCopyMatrixJson.textContent = "¡Copiado!";
      setTimeout(() => { btnCopyMatrixJson.textContent = "Copiar JSON"; }, 2000);
    });
  });

  // Modal para Justificación Académica y Rúbricas
  btnShowRubric.addEventListener("click", () => modalRubric.classList.add("open"));
  btnCloseRubric.addEventListener("click", () => modalRubric.classList.remove("open"));
  btnCloseRubricFooter.addEventListener("click", () => modalRubric.classList.remove("open"));

  // Carga inicial
  loadRandomDAG();
});
