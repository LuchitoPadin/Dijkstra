// SVG Server / Router Icons as Data URIs for Vis.js
const SERVER_ICONS = {
  default: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
      <rect x="5" y="8" width="50" height="44" rx="6" fill="#131e30" stroke="#334e68" stroke-width="2.5"/>
      <line x1="12" y1="20" x2="38" y2="20" stroke="#486581" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="32" x2="38" y2="32" stroke="#486581" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="42" x2="38" y2="42" stroke="#486581" stroke-width="2" stroke-linecap="round"/>
      <circle cx="45" cy="20" r="2.5" fill="#00f0ff"/>
      <circle cx="45" cy="32" r="2.5" fill="#38bec9"/>
      <circle cx="45" cy="42" r="2.5" fill="#00f0ff"/>
    </svg>
  `)}`,

  evaluating: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 70 70">
      <defs>
        <filter id="glow-y" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#ffd700" flood-opacity="0.95"/>
        </filter>
      </defs>
      <rect x="10" y="13" width="50" height="44" rx="6" fill="#2d2505" stroke="#ffd700" stroke-width="3.5" filter="url(#glow-y)"/>
      <line x1="17" y1="25" x2="43" y2="25" stroke="#ffe066" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="17" y1="37" x2="43" y2="37" stroke="#ffe066" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="17" y1="47" x2="43" y2="47" stroke="#ffe066" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="3" fill="#ffeb3b"/>
      <circle cx="50" cy="37" r="3" fill="#ff9800"/>
      <circle cx="50" cy="47" r="3" fill="#ffeb3b"/>
    </svg>
  `)}`,

  visited: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
      <defs>
        <filter id="glow-g" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4.5" flood-color="#00ff9d" flood-opacity="0.85"/>
        </filter>
      </defs>
      <rect x="5" y="8" width="50" height="44" rx="6" fill="#04261b" stroke="#00ff9d" stroke-width="3" filter="url(#glow-g)"/>
      <line x1="12" y1="20" x2="38" y2="20" stroke="#25d366" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="32" x2="38" y2="32" stroke="#25d366" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="42" x2="38" y2="42" stroke="#25d366" stroke-width="2" stroke-linecap="round"/>
      <circle cx="45" cy="20" r="2.5" fill="#00ff9d"/>
      <circle cx="45" cy="32" r="2.5" fill="#5cffb1"/>
      <circle cx="45" cy="42" r="2.5" fill="#00ff9d"/>
    </svg>
  `)}`,

  target: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="65" height="65" viewBox="0 0 65 65">
      <defs>
        <filter id="glow-c" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="5.5" flood-color="#00f0ff" flood-opacity="0.95"/>
        </filter>
      </defs>
      <rect x="7" y="10" width="50" height="44" rx="6" fill="#032338" stroke="#00f0ff" stroke-width="3.5" filter="url(#glow-c)"/>
      <line x1="14" y1="22" x2="40" y2="22" stroke="#70e0ff" stroke-width="2" stroke-linecap="round"/>
      <line x1="14" y1="34" x2="40" y2="34" stroke="#70e0ff" stroke-width="2" stroke-linecap="round"/>
      <line x1="14" y1="44" x2="40" y2="44" stroke="#70e0ff" stroke-width="2" stroke-linecap="round"/>
      <circle cx="47" cy="22" r="3" fill="#00f0ff"/>
      <circle cx="47" cy="34" r="3" fill="#38bec9"/>
      <circle cx="47" cy="44" r="3" fill="#00f0ff"/>
    </svg>
  `)}`
};

class GraphRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.network = null;
    this.nodesDataset = new vis.DataSet([]);
    this.edgesDataset = new vis.DataSet([]);
    this.rawGraph = null;
    this.sourceNode = null;
    this.targetNode = null;

    // Sistema de simulación visual de paquetes de datos
    this.activePackets = [];
    this.animFrameId = null;
    this.currentDistances = {};
  }

  init(graphData, sourceId = null, targetId = null) {
    this.rawGraph = graphData;
    this.sourceNode = sourceId;
    this.targetNode = targetId;
    this.currentDistances = {};
    this.clearPackets();

    const nodesArray = graphData.nodes.map((node) => {
      let icon = SERVER_ICONS.default;
      if (node.id === this.targetNode) {
        icon = SERVER_ICONS.target;
      }
      return {
        id: node.id,
        label: `${node.label}\n[lat: ∞]`,
        shape: 'image',
        image: icon,
        font: {
          color: '#e2e8f0',
          size: 11,
          face: 'JetBrains Mono, Courier New, monospace',
          strokeWidth: 2,
          strokeColor: '#070b12'
        },
        size: 26
      };
    });

    const edgesArray = graphData.edges.map((edge) => {
      return {
        id: `${edge.source}->${edge.target}`,
        from: edge.source,
        to: edge.target,
        label: `${edge.weight} ms`,
        font: {
          color: '#849ab5',
          size: 11,
          face: 'JetBrains Mono, Courier New, monospace',
          background: '#0d1522',
          strokeWidth: 0,
          align: 'horizontal'
        },
        arrows: {
          to: { enabled: true, scaleFactor: 0.85, type: 'arrow' }
        },
        color: {
          color: '#1e314b',
          highlight: '#00f0ff',
          hover: '#00f0ff'
        },
        width: 2,
        smooth: {
          type: 'curvedCW',
          roundness: 0.15
        }
      };
    });

    this.nodesDataset.clear();
    this.nodesDataset.add(nodesArray);

    this.edgesDataset.clear();
    this.edgesDataset.add(edgesArray);

    const data = {
      nodes: this.nodesDataset,
      edges: this.edgesDataset
    };

    const options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'LR', // Left to Right DAG flow
          sortMethod: 'directed',
          levelSeparation: 160,
          nodeSpacing: 110,
          treeSpacing: 130
        }
      },
      physics: {
        enabled: false
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: true,
        keyboard: true
      }
    };

    if (this.network) {
      this.network.destroy();
    }
    this.network = new vis.Network(this.container, data, options);

    // Conectar el renderizado del paquete de datos sobre el canvas nativo de Vis.js
    this.setupPacketRendering();
  }

  /**
   * Configura el hook 'afterDrawing' de Vis.js para dibujar los paquetes de datos animados
   */
  setupPacketRendering() {
    if (!this.network) return;

    this.network.on("afterDrawing", (ctx) => {
      if (this.activePackets.length === 0) return;

      this.activePackets.forEach((packet) => {
        if (!packet.currentPos) return;

        // Dibujar estela luminosa
        if (packet.trail && packet.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(packet.trail[0].x, packet.trail[0].y);
          for (let i = 1; i < packet.trail.length; i++) {
            ctx.lineTo(packet.trail[i].x, packet.trail[i].y);
          }
          ctx.strokeStyle = packet.color || "#ffaa00";
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.35;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }

        // Dibujar brillo exterior del paquete
        ctx.save();
        ctx.beginPath();
        ctx.arc(packet.currentPos.x, packet.currentPos.y, 9, 0, 2 * Math.PI);
        ctx.fillStyle = packet.glowColor || "rgba(255, 170, 0, 0.4)";
        ctx.fill();

        // Paquete central (núcleo de datos)
        ctx.beginPath();
        ctx.arc(packet.currentPos.x, packet.currentPos.y, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = packet.color || "#ffea00";
        ctx.shadowColor = packet.color || "#ffaa00";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      });
    });

    this.startAnimationLoop();
  }

  startAnimationLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const updateLoop = () => {
      let needsRedraw = false;

      if (this.activePackets.length > 0 && this.network) {
        const packetsToRemove = [];

        this.activePackets.forEach((packet, idx) => {
          const uId = packet.path[packet.segmentIdx];
          const vId = packet.path[packet.segmentIdx + 1];

          if (!uId || !vId) {
            packetsToRemove.push(idx);
            return;
          }

          const posU = this.network.getPosition(uId);
          const posV = this.network.getPosition(vId);

          if (!posU || !posV) {
            packetsToRemove.push(idx);
            return;
          }

          packet.progress += packet.speed;

          if (packet.progress >= 1.0) {
            packet.progress = 0.0;
            packet.segmentIdx++;

            if (packet.segmentIdx >= packet.path.length - 1) {
              if (packet.loop) {
                packet.segmentIdx = 0;
                packet.trail = [];
              } else {
                packetsToRemove.push(idx);
                return;
              }
            }
          }

          // Interpolación lineal entre posiciones de routers
          const curX = posU.x + (posV.x - posU.x) * packet.progress;
          const curY = posU.y + (posV.y - posU.y) * packet.progress;
          packet.currentPos = { x: curX, y: curY };

          if (!packet.trail) packet.trail = [];
          packet.trail.push({ x: curX, y: curY });
          if (packet.trail.length > 8) packet.trail.shift();

          needsRedraw = true;
        });

        for (let i = packetsToRemove.length - 1; i >= 0; i--) {
          this.activePackets.splice(packetsToRemove[i], 1);
        }
      }

      if (needsRedraw && this.network) {
        this.network.redraw();
      }

      this.animFrameId = requestAnimationFrame(updateLoop);
    };

    this.animFrameId = requestAnimationFrame(updateLoop);
  }

  clearPackets() {
    this.activePackets = [];
    if (this.network) this.network.redraw();
  }

  /**
   * Lanza un paquete animado a través de una secuencia de nodos
   */
  launchPacket(pathNodes, options = {}) {
    if (!pathNodes || pathNodes.length < 2) return;

    const packet = {
      path: [...pathNodes],
      segmentIdx: 0,
      progress: 0.0,
      speed: options.speed || 0.045,
      color: options.color || "#ff7700",
      glowColor: options.glowColor || "rgba(255, 119, 0, 0.4)",
      loop: options.loop || false,
      trail: [],
      currentPos: null
    };

    this.activePackets.push(packet);
    if (this.network) this.network.redraw();
  }

  /**
   * Actualiza el estado visual del grafo para un snapshot de paso a paso
   */
  updateStep(snapshot) {
    if (!this.rawGraph) return;

    this.clearPackets();

    const evaluating = snapshot.evaluating_node;
    const visited = new Set(snapshot.visited || []);
    const distances = snapshot.distances || {};
    this.currentDistances = distances;

    const nodeUpdates = [];

    this.rawGraph.nodes.forEach((node) => {
      let icon = SERVER_ICONS.default;
      let fontColor = '#849ab5';
      let size = 25;

      const dist = distances[node.id];
      const distLabel = (dist !== null && dist !== undefined) ? `${dist} ms` : '∞';

      if (node.id === evaluating) {
        // En evaluación (amarillo)
        icon = SERVER_ICONS.evaluating;
        fontColor = '#ffd700';
        size = 32;
      } else if (visited.has(node.id)) {
        // Latencia definitiva confirmada (verde)
        icon = SERVER_ICONS.visited;
        fontColor = '#00ff9d';
        size = 26;
      } else if (node.id === this.targetNode) {
        icon = SERVER_ICONS.target;
        fontColor = '#00f0ff';
      }

      nodeUpdates.push({
        id: node.id,
        label: `${node.label}\n[lat: ${distLabel}]`,
        image: icon,
        size: size,
        font: {
          color: fontColor,
          size: node.id === evaluating ? 12 : 11,
          face: 'JetBrains Mono, monospace',
          strokeWidth: 2,
          strokeColor: '#070b12'
        }
      });
    });

    this.nodesDataset.update(nodeUpdates);

    // Resaltar arista relajada si viene en active_edge o si el log hace referencia a una arista
    const edgeUpdates = [];
    const log = snapshot.log_message || '';
    const match = log.match(/enlace\s+([A-Za-z0-9_-]+)\s*->\s*([A-Za-z0-9_-]+)/i);
    const activeSrc = (snapshot.active_edge && snapshot.active_edge[0]) || (match ? match[1] : null);
    const activeTgt = (snapshot.active_edge && snapshot.active_edge[1]) || (match ? match[2] : null);

    this.rawGraph.edges.forEach((edge) => {
      const edgeId = `${edge.source}->${edge.target}`;
      if (activeSrc === edge.source && activeTgt === edge.target) {
        // Enlace activo de relajación (amarillo)
        edgeUpdates.push({
          id: edgeId,
          width: 4,
          color: { color: '#ffd700', highlight: '#ffd700' },
          shadow: { enabled: true, color: '#ffd700', size: 14, x: 0, y: 0 }
        });

        // Lanzar paquete de prueba descubriendo la fibra óptica
        this.launchPacket([edge.source, edge.target], {
          color: '#ffbb00',
          glowColor: 'rgba(255, 187, 0, 0.45)',
          speed: 0.06
        });
      } else {
        edgeUpdates.push({
          id: edgeId,
          width: 2,
          color: { color: '#1e314b' },
          shadow: { enabled: false },
          font: { color: '#849ab5', background: '#0d1522' }
        });
      }
    });

    this.edgesDataset.update(edgeUpdates);
  }

  /**
   * Resalta una sola ruta óptima en particular (para inspeccionar redundancia)
   */
  highlightSinglePath(selectedPath, allPaths = []) {
    if (!selectedPath || selectedPath.length === 0) return;

    const pathEdgesSet = new Set();
    const pathNodesSet = new Set(selectedPath);

    for (let i = 0; i < selectedPath.length - 1; i++) {
      pathEdgesSet.add(`${selectedPath[i]}->${selectedPath[i + 1]}`);
    }

    // Actualizar aristas
    const edgeUpdates = this.rawGraph.edges.map((edge) => {
      const edgeId = `${edge.source}->${edge.target}`;
      if (pathEdgesSet.has(edgeId)) {
        return {
          id: edgeId,
          width: 6,
          color: { color: '#ffd700', highlight: '#ffd700' },
          shadow: { enabled: true, color: '#ffd700', size: 18, x: 0, y: 0 },
          font: { color: '#ffd700', background: '#241a04' }
        };
      }
      return {
        id: edgeId,
        width: 1.5,
        color: { color: '#111827' },
        shadow: { enabled: false }
      };
    });
    this.edgesDataset.update(edgeUpdates);

    // Actualizar nodos
    const nodeUpdates = this.rawGraph.nodes.map((node) => {
      const dist = this.currentDistances[node.id];
      const distLabel = (dist !== null && dist !== undefined) ? `${dist} ms` : '∞';

      if (pathNodesSet.has(node.id)) {
        return {
          id: node.id,
          label: `${node.label}\n[lat: ${distLabel}]`,
          image: SERVER_ICONS.evaluating,
          size: 30,
          font: { color: '#ffd700', strokeWidth: 2, strokeColor: '#05121e' }
        };
      }
      return {
        id: node.id,
        label: `${node.label}\n[lat: ${distLabel}]`,
        image: SERVER_ICONS.default,
        size: 22,
        font: { color: '#4b5563' }
      };
    });
    this.nodesDataset.update(nodeUpdates);

    // Lanzar paquete de datos a lo largo de este camino específico
    this.clearPackets();
    this.launchPacket(selectedPath, {
      color: '#ffd700',
      glowColor: 'rgba(255, 215, 0, 0.5)',
      speed: 0.04,
      loop: true
    });
  }

  /**
   * Resalta todas las rutas mínimas óptimas detectadas (ECMP)
   */
  highlightOptimalPaths(paths) {
    if (!paths || paths.length === 0) return;

    this.clearPackets();

    const pathEdgesSet = new Set();
    const pathNodesSet = new Set();

    paths.forEach((path) => {
      for (let i = 0; i < path.length; i++) {
        pathNodesSet.add(path[i]);
        if (i < path.length - 1) {
          pathEdgesSet.add(`${path[i]}->${path[i + 1]}`);
        }
      }
    });

    // Actualizar aristas óptimas con brillo cian grueso
    const edgeUpdates = this.rawGraph.edges.map((edge) => {
      const edgeId = `${edge.source}->${edge.target}`;
      if (pathEdgesSet.has(edgeId)) {
        return {
          id: edgeId,
          width: 5,
          color: { color: '#00f0ff', highlight: '#00f0ff' },
          shadow: { enabled: true, color: '#00f0ff', size: 16, x: 0, y: 0 },
          font: { color: '#00f0ff', background: '#041624' }
        };
      }
      return {
        id: edgeId,
        width: 1.5,
        color: { color: '#142033' },
        shadow: { enabled: false }
      };
    });
    this.edgesDataset.update(edgeUpdates);

    // Actualizar nodos en el camino
    const nodeUpdates = this.rawGraph.nodes.map((node) => {
      const dist = this.currentDistances[node.id];
      const distLabel = (dist !== null && dist !== undefined) ? `${dist} ms` : '∞';

      if (pathNodesSet.has(node.id)) {
        return {
          id: node.id,
          label: `${node.label}\n[lat: ${distLabel}]`,
          image: SERVER_ICONS.target,
          size: 30,
          font: { color: '#00f0ff', strokeWidth: 2, strokeColor: '#05121e' }
        };
      }
      return {
        id: node.id,
        label: `${node.label}\n[lat: ${distLabel}]`,
        image: SERVER_ICONS.visited,
        size: 24,
        font: { color: '#00ff9d' }
      };
    });
    this.nodesDataset.update(nodeUpdates);

    // Simular paquetes viajando por cada ruta mínima detectada en paralelo
    paths.forEach((path, idx) => {
      setTimeout(() => {
        this.launchPacket(path, {
          color: idx === 0 ? '#00f0ff' : '#00ff9d',
          glowColor: idx === 0 ? 'rgba(0, 240, 255, 0.5)' : 'rgba(0, 255, 157, 0.5)',
          speed: 0.038,
          loop: true
        });
      }, idx * 300);
    });
  }
}

window.GraphRenderer = GraphRenderer;
