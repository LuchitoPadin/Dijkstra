class DijkstraPlayer {
  constructor(renderer, onStepChange, onFinish) {
    this.renderer = renderer;
    this.onStepChange = onStepChange;
    this.onFinish = onFinish;

    this.steps = [];
    this.currentStepIdx = -1;
    this.isPlaying = false;
    this.playbackInterval = null;
    this.playbackSpeed = 700; // ms
    this.finalResult = null;
  }

  loadExecution(dijkstraResult) {
    this.stopAutoPlay();
    this.finalResult = dijkstraResult;
    this.steps = dijkstraResult.steps || [];
    this.currentStepIdx = 0;

    if (this.steps.length > 0) {
      this.applyStep(0);
    }
  }

  getCurrentStep() {
    if (this.currentStepIdx >= 0 && this.currentStepIdx < this.steps.length) {
      return this.steps[this.currentStepIdx];
    }
    return null;
  }

  applyStep(idx) {
    if (idx < 0 || idx >= this.steps.length) return;
    this.currentStepIdx = idx;
    const snapshot = this.steps[idx];

    // Actualizar visualización en lienzo
    this.renderer.updateStep(snapshot);

    // Si es el último paso, además resaltar rutas óptimas finales
    if (idx === this.steps.length - 1 && this.finalResult && this.finalResult.shortest_paths) {
      this.renderer.highlightOptimalPaths(this.finalResult.shortest_paths);
      if (this.onFinish) this.onFinish(this.finalResult);
    }

    // Notificar UI (tabla de ruteo, logs, métricas)
    if (this.onStepChange) {
      this.onStepChange(snapshot, this.currentStepIdx, this.steps.length);
    }
  }

  next() {
    if (this.currentStepIdx < this.steps.length - 1) {
      this.applyStep(this.currentStepIdx + 1);
    } else {
      this.stopAutoPlay();
    }
  }

  prev() {
    if (this.currentStepIdx > 0) {
      this.applyStep(this.currentStepIdx - 1);
    }
  }

  goToStart() {
    if (this.steps.length > 0) {
      this.applyStep(0);
    }
  }

  goToEnd() {
    if (this.steps.length > 0) {
      this.applyStep(this.steps.length - 1);
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  startAutoPlay() {
    if (this.steps.length === 0) return;
    if (this.currentStepIdx >= this.steps.length - 1) {
      this.currentStepIdx = 0;
    }
    this.isPlaying = true;
    this.playbackInterval = setInterval(() => {
      if (this.currentStepIdx < this.steps.length - 1) {
        this.next();
      } else {
        this.stopAutoPlay();
      }
    }, this.playbackSpeed);
  }

  stopAutoPlay() {
    this.isPlaying = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  setSpeed(speedMs) {
    this.playbackSpeed = speedMs;
    if (this.isPlaying) {
      this.stopAutoPlay();
      this.startAutoPlay();
    }
  }
}

window.DijkstraPlayer = DijkstraPlayer;
