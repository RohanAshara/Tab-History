/*!
 * Chart.js v3.7.0
 * https://www.chartjs.org
 * (c) 2022 Chart.js Contributors
 * Released under the MIT License
 */
// Note: This is a simplified version for demonstration. You'll need to download the full Chart.js file.
// The actual library is quite large (>200KB), so here we're just providing a minimal implementation.

class Chart {
    constructor(ctx, config) {
      this.ctx = ctx;
      this.config = config;
      this.type = config.type;
      this.data = config.data;
      this.options = config.options;
      this.tooltip = {
        active: false,
        element: null,
        dataIndex: -1
      };
      
      // Create tooltip element
      this.createTooltip();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Render chart
      this.render();
    }
    
    createTooltip() {
      // Remove any existing tooltip
      const existingTooltip = document.getElementById('chart-tooltip');
      if (existingTooltip) {
        existingTooltip.remove();
      }
      
      // Create tooltip element
      const tooltip = document.createElement('div');
      tooltip.id = 'chart-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      tooltip.style.color = 'white';
      tooltip.style.padding = '8px 12px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '14px';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '1000';
      tooltip.style.display = 'none';
      tooltip.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
      tooltip.style.transition = 'all 0.1s ease-out';
      tooltip.style.whiteSpace = 'nowrap';
      
      document.body.appendChild(tooltip);
      this.tooltipElement = tooltip;
    }
    
    setupEventListeners() {
      const canvas = this.ctx;
      
      canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      canvas.addEventListener('mouseout', () => this.hideTooltip());
    }
    
    handleMouseMove(event) {
      const canvas = this.ctx;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Check if hovering over data point
      let hovered = false;
      
      if (this.type === 'pie') {
        hovered = this.checkPieHover(x, y);
      } else if (this.type === 'bar') {
        hovered = this.checkBarHover(x, y);
      } else if (this.type === 'line') {
        hovered = this.checkLineHover(x, y);
      }
      
      if (!hovered) {
        this.hideTooltip();
      }
    }
    
    checkPieHover(x, y) {
      const canvas = this.ctx;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.8;
      
      // Calculate distance from center
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if the point is within the pie radius
      if (distance <= radius) {
        // Calculate angle
        let angle = Math.atan2(dy, dx);
        if (angle < 0) {
          angle += 2 * Math.PI;
        }
        
        // Find which segment this angle belongs to
        let total = 0;
        this.data.datasets[0].data.forEach(value => total += value);
        
        let startAngle = 0;
        for (let i = 0; i < this.data.datasets[0].data.length; i++) {
          const value = this.data.datasets[0].data[i];
          const sliceAngle = 2 * Math.PI * value / total;
          
          if (angle >= startAngle && angle <= startAngle + sliceAngle) {
            this.showTooltip(i, x, y);
            return true;
          }
          
          startAngle += sliceAngle;
        }
      }
      
      return false;
    }
    
    checkBarHover(x, y) {
      const canvas = this.ctx;
      const width = canvas.width;
      const height = canvas.height;
      const padding = 20;
      
      // Calculate the maximum value for scaling
      const maxValue = Math.max(...this.data.datasets[0].data);
      
      // Calculate bar width
      const barWidth = (width - 2 * padding) / this.data.labels.length - 10;
      
      // Check if mouse is over any bar
      for (let i = 0; i < this.data.labels.length; i++) {
        const value = this.data.datasets[0].data[i];
        const barHeight = ((height - 2 * padding) * value) / maxValue;
        const barX = padding + i * (barWidth + 10);
        const barY = height - padding - barHeight;
        
        if (x >= barX && x <= barX + barWidth && y >= barY && y <= barY + barHeight) {
          this.showTooltip(i, x, y);
          return true;
        }
      }
      
      return false;
    }
    
    checkLineHover(x, y) {
      const canvas = this.ctx;
      const width = canvas.width;
      const height = canvas.height;
      const padding = 40;
      
      // Calculate the maximum value for scaling
      const maxValue = Math.max(...this.data.datasets[0].data);
      
      // Calculate point spacing
      const pointSpacing = (width - 2 * padding) / (this.data.labels.length - 1);
      
      // Check if mouse is over any point
      for (let i = 0; i < this.data.labels.length; i++) {
        const value = this.data.datasets[0].data[i];
        const pointX = padding + i * pointSpacing;
        const pointY = height - padding - ((height - 2 * padding) * value) / maxValue;
        
        // Check if mouse is within 8 pixels of the point
        const dx = x - pointX;
        const dy = y - pointY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= 8) {
          this.showTooltip(i, x, y);
          return true;
        }
      }
      
      return false;
    }
    
    showTooltip(dataIndex, x, y) {
      if (!this.tooltipElement) return;
      
      // Get data for tooltip
      const label = this.data.labels[dataIndex];
      const value = this.data.datasets[0].data[dataIndex];
      
      // Format time
      let timeLabel = '';
      if (value >= 3600) {
        timeLabel = Math.floor(value / 3600) + 'h ' + Math.floor((value % 3600) / 60) + 'm';
      } else if (value >= 60) {
        timeLabel = Math.floor(value / 60) + 'm ' + (value % 60) + 's';
      } else {
        timeLabel = value + 's';
      }
      
      // Update tooltip content
      this.tooltipElement.innerHTML = `
        <div><strong>${label}</strong></div>
        <div>Time: ${timeLabel}</div>
      `;
      
      // Position tooltip
      const tooltipWidth = this.tooltipElement.offsetWidth;
      const tooltipHeight = this.tooltipElement.offsetHeight;
      
      // Position above the point
      let tooltipX = x - (tooltipWidth / 2);
      let tooltipY = y - tooltipHeight - 10;
      
      // Make sure tooltip is within canvas
      const canvas = this.ctx;
      const rect = canvas.getBoundingClientRect();
      
      if (tooltipX < rect.left) tooltipX = rect.left;
      if (tooltipX + tooltipWidth > rect.right) tooltipX = rect.right - tooltipWidth;
      if (tooltipY < rect.top) tooltipY = y + 10; // Show below point if not enough space above
      
      this.tooltipElement.style.left = tooltipX + 'px';
      this.tooltipElement.style.top = tooltipY + 'px';
      this.tooltipElement.style.display = 'block';
      
      // Update tooltip state
      this.tooltip.active = true;
      this.tooltip.dataIndex = dataIndex;
    }
    
    hideTooltip() {
      if (this.tooltipElement) {
        this.tooltipElement.style.display = 'none';
      }
      
      this.tooltip.active = false;
      this.tooltip.dataIndex = -1;
    }
    
    render() {
      const canvas = this.ctx;
      const ctx = canvas.getContext('2d');
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Hide the message when chart is rendered
      const messageElement = document.getElementById('chartMessage');
      if (messageElement) {
        messageElement.style.display = 'none';
      }
      
      // Basic rendering based on chart type
      if (this.type === 'pie') {
        this.renderPieChart(ctx);
      } else if (this.type === 'bar') {
        this.renderBarChart(ctx);
      } else if (this.type === 'line') {
        this.renderLineChart(ctx);
      }
    }
    
    renderPieChart(ctx) {
      const canvas = ctx.canvas;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.8;
      
      let total = 0;
      this.data.datasets[0].data.forEach(value => total += value);
      
      let startAngle = 0;
      
      // Draw the domains as pie segments
      this.data.labels.forEach((label, index) => {
        const value = this.data.datasets[0].data[index];
        const sliceAngle = 2 * Math.PI * value / total;
        
        ctx.fillStyle = this.data.datasets[0].backgroundColor[index];
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        
        startAngle += sliceAngle;
      });
      
      // Display chart title
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Time Spent by Domain', centerX, 20);
    }
    
    renderBarChart(ctx) {
      const canvas = ctx.canvas;
      const width = canvas.width;
      const height = canvas.height;
      const padding = 40;
      
      // Calculate the maximum value for scaling
      const maxValue = Math.max(...this.data.datasets[0].data);
      
      // Draw axes
      ctx.strokeStyle = '#555';
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();
      
      // Draw bars
      const barWidth = (width - 2 * padding) / this.data.labels.length - 10;
      
      this.data.labels.forEach((label, index) => {
        const value = this.data.datasets[0].data[index];
        const barHeight = ((height - 2 * padding) * value) / maxValue;
        const x = padding + index * (barWidth + 10);
        const y = height - padding - barHeight;
        
        ctx.fillStyle = this.data.datasets[0].backgroundColor[index];
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw labels
        ctx.fillStyle = '#ccc';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label.substring(0, 10), x + barWidth / 2, height - padding + 15);
      });
      
      // Display chart title
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Time Spent by Domain', width / 2, 20);
    }
    
    renderLineChart(ctx) {
      const canvas = ctx.canvas;
      const width = canvas.width;
      const height = canvas.height;
      const padding = 20;
      
      // Calculate the maximum value for scaling
      const maxValue = Math.max(...this.data.datasets[0].data);
      
      // Draw axes
      ctx.strokeStyle = '#555';
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();
      
      // Draw line
      const pointSpacing = (width - 2 * padding) / (this.data.labels.length - 1);
      
      ctx.strokeStyle = this.data.datasets[0].borderColor[0];
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      this.data.labels.forEach((label, index) => {
        const value = this.data.datasets[0].data[index];
        const x = padding + index * pointSpacing;
        const y = height - padding - ((height - 2 * padding) * value) / maxValue;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw points
        ctx.fillStyle = this.data.datasets[0].backgroundColor[index];
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw labels
        ctx.fillStyle = '#ccc';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label.substring(0, 10), x, height - padding + 15);
      });
      
      ctx.stroke();
      
      // Display chart title
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Time Spent by Domain', width / 2, 20);
    }
    
    destroy() {
      // Remove event listeners
      const canvas = this.ctx;
      canvas.removeEventListener('mousemove', this.handleMouseMove);
      canvas.removeEventListener('mouseout', this.hideTooltip);
      
      // Remove tooltip element
      if (this.tooltipElement) {
        this.tooltipElement.remove();
        this.tooltipElement = null;
      }
      
      // Clear canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Show the message when chart is destroyed
      const messageElement = document.getElementById('chartMessage');
      if (messageElement) {
        messageElement.style.display = 'block';
      }
    }
  }