// Performance monitoring utility for event rendering
export interface PerformanceMetrics {
  totalEvents: number
  visibleEvents: number
  clusters: number
  renderTime: number
  memoryUsage?: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private startTime: number = 0

  startTimer() {
    this.startTime = performance.now()
  }

  endTimer(): number {
    const endTime = performance.now()
    return endTime - this.startTime
  }

  recordMetrics(metrics: PerformanceMetrics) {
    this.metrics.push(metrics)
    
    // Keep only last 10 measurements
    if (this.metrics.length > 10) {
      this.metrics.shift()
    }
  }

  getAverageRenderTime(): number {
    if (this.metrics.length === 0) return 0
    const totalTime = this.metrics.reduce((sum, m) => sum + m.renderTime, 0)
    return totalTime / this.metrics.length
  }

  getPerformanceSummary(): string {
    if (this.metrics.length === 0) return 'No performance data available'
    
    const latest = this.metrics[this.metrics.length - 1]
    const avgTime = this.getAverageRenderTime()
    
    return `Performance Summary:
📊 Total Events: ${latest.totalEvents}
👁️ Visible Events: ${latest.visibleEvents}
🎯 Clusters: ${latest.clusters}
⚡ Render Time: ${latest.renderTime.toFixed(2)}ms
📈 Avg Render Time: ${avgTime.toFixed(2)}ms
💾 Memory Optimized: ${latest.visibleEvents < latest.totalEvents ? 'Yes' : 'No'}`
  }

  clear() {
    this.metrics = []
  }
}

export const performanceMonitor = new PerformanceMonitor()
