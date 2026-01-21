<script lang="ts">
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  
  export let title: string;
  export let value: string;
  export let change: string;
  export let trend: 'up' | 'down' | 'neutral';
  export let sparklineData:  number[];
  export let icon: string;
  
  const displayValue = tweened(0, {
    duration: 1500,
    easing: cubicOut
  });
  
  let canvas: HTMLCanvasElement;
  
  onMount(() => {
    drawSparkline();
    // Animate value
    const numValue = parseFloat(value. replace(/[^0-9.-]/g, ''));
    displayValue.set(numValue);
  });
  
  function drawSparkline() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate points
    const max = Math.max(...sparklineData);
    const min = Math. min(...sparklineData);
    const range = max - min;
    const step = (width - padding * 2) / (sparklineData.length - 1);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (trend === 'up') {
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    }
    
    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(padding, height);
    
    sparklineData.forEach((value, i) => {
      const x = padding + i * step;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.lineTo(width - padding, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    sparklineData.forEach((value, i) => {
      const x = padding + i * step;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.strokeStyle = trend === 'up' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
</script>

<div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 
            hover:border-gray-600/50 transition-all duration-300 group">
  <div class="flex justify-between items-start mb-4">
    <div>
      <p class="text-gray-400 text-sm">{title}</p>
      <p class="text-2xl font-bold text-white mt-1">
        {#if value.includes('$')}
          ${Math.floor($displayValue).toLocaleString()}
        {:else}
          {$displayValue.toFixed(1)}%
        {/if}
      </p>
    </div>
    <div class="text-3xl group-hover:scale-110 transition-transform">{icon}</div>
  </div>
  
  <div class="h-12 mb-3">
    <canvas 
      bind:this={canvas}
      width="200"
      height="48"
      class="w-full h-full"
    />
  </div>
  
  <div class="flex items-center justify-between">
    <span class="text-sm {trend === 'up' ? 'text-green-400' : 'text-red-400'}">
      {change}
    </span>
    <span class="text-xs text-gray-500">vs last period</span>
  </div>
</div>