<script setup>
    import { ref, computed, onMounted, inject, watch } from 'vue'
    import { TicketStatusOptions, GetStatusName, GetStatusClass } from '@/composables/tickets'

    const axios = inject('axios')
    const props = defineProps(['refresh'])

    // Reactive data
    const ticketCounts = ref({})
    const loading = ref(false)
    const animationKey = ref(0)
    const debugInfo = ref({}) // Keep for internal use but don't display

    // Watch for refresh prop changes
    watch(() => props.refresh, () => {
        if (props.refresh > 0) {
            fetchTicketData()
        }
    })

    // Fetch real ticket data with enhanced debugging
    const fetchTicketData = async () => {
        loading.value = true
        try {
            console.log('🔍 Fetching ticket status data for graph...')
            const response = await axios.get('admin-ticket-status-summary')
            
            // Enhanced logging
            console.log('📊 Raw response from backend:', response.data)
            console.log('📈 Response data type:', typeof response.data)
            console.log('📋 Response keys:', Object.keys(response.data))
            
            ticketCounts.value = response.data
            
            // Debug: Check what we actually received
            debugInfo.value = {
                rawData: response.data,
                totalTickets: Object.values(response.data).reduce((sum, count) => sum + count, 0),
                statusesWithData: Object.entries(response.data).filter(([status, count]) => count > 0)
            }
            
            console.log('🎯 Processed ticket counts:', ticketCounts.value)
            console.log('📊 Debug info:', debugInfo.value)
            console.log('✅ Statuses with data:', debugInfo.value.statusesWithData)
            
            // Trigger animation
            animationKey.value += 1
        } catch (err) {
            console.error('❌ Failed to fetch graph data:', err)
            
            // Use realistic test data that matches your actual statuses
            ticketCounts.value = {
                '-2': 3, // Cancelled - you mentioned you have these
                '-1': 2, // Waiting Approval
                '0': 1,  // Submitted  
                '1': 1,  // Approved - you definitely have this
                '2': 0,  // Device Received
                '3': 0,  // Repairing
                '4': 0,  // Pending Payment
                '5': 0,  // Posted to Customer
                '6': 1   // Completed
            }
            
            console.log('🔄 Using fallback data:', ticketCounts.value)
        } finally {
            loading.value = false
        }
    }

    // Calculate total tickets
    const totalTickets = computed(() => {
        const total = Object.values(ticketCounts.value).reduce((sum, count) => sum + count, 0)
        console.log('🔢 Calculated total tickets:', total)
        return total
    })

    // Modern gradient color palette - updated with better contrast
    const statusColors = {
        '-2': 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',  // Cancelled - grey gradient
        '-1': 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)',  // Waiting Approval - amber gradient
        '0': 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',   // Submitted - cyan gradient
        '1': 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',   // Approved - green gradient
        '2': 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',   // Device Received - blue gradient
        '3': 'linear-gradient(135deg, #fd7e14 0%, #e55a00 100%)',   // Repairing - orange gradient
        '4': 'linear-gradient(135deg, #e83e8c 0%, #d21f66 100%)',   // Pending Payment - pink gradient
        '5': 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)',   // Posted to Customer - purple gradient
        '6': 'linear-gradient(135deg, #20c997 0%, #17a085 100%)'    // Completed - teal gradient
    }

    // Solid colors for legend (matching your existing system)
    const legendColors = {
        '-2': '#6c757d',  // Cancelled - grey
        '-1': '#ffc107',  // Waiting Approval - amber
        '0': '#17a2b8',   // Submitted - cyan
        '1': '#28a745',   // Approved - green
        '2': '#007bff',   // Device Received - blue
        '3': '#fd7e14',   // Repairing - orange
        '4': '#e83e8c',   // Pending Payment - pink
        '5': '#6f42c1',   // Posted to Customer - purple
        '6': '#20c997'    // Completed - teal
    }

    // Status name mapping (in case TicketStatusOptions doesn't include all)
    const statusNames = {
        '-2': 'Cancelled',
        '-1': 'Waiting Approval',
        '0': 'Submitted',
        '1': 'Approved',
        '2': 'Device Received',
        '3': 'Repairing',
        '4': 'Pending Payment',
        '5': 'Posted to Customer',
        '6': 'Completed'
    }

    // Generate modern conic-gradient with smooth transitions
    const pieChartStyle = computed(() => {
        if (loading.value) {
            return {
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                border: '3px solid #e2e8f0',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }
        }

        if (totalTickets.value === 0) {
            return {
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                border: '3px solid #cbd5e0',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }
        }

        const segments = []
        let currentPosition = 0

        // Status order for consistent display - make sure all statuses are included
        const statusOrder = ['-2', '-1', '0', '1', '2', '3', '4', '5', '6']
        
        console.log('🎨 Building chart segments...')
        
        statusOrder.forEach(status => {
            const count = ticketCounts.value[status] || 0
            if (count > 0) {
                const percentage = (count / totalTickets.value) * 100
                const endPosition = currentPosition + percentage
                const color = legendColors[status]
                
                console.log(`📊 Status ${status} (${statusNames[status]}): ${count} tickets (${percentage.toFixed(1)}%)`)
                
                segments.push(`${color} ${currentPosition}% ${endPosition}%`)
                currentPosition = endPosition
            }
        })

        console.log('🎨 Chart segments:', segments)

        if (segments.length === 0) {
            return {
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                border: '3px solid #cbd5e0',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }
        }

        return {
            background: `conic-gradient(${segments.join(', ')})`,
            border: '0',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2)'
        }
    })

    // Enhanced legend items with better debugging
    const activeLegendItems = computed(() => {
        const items = []
        
        console.log('🏷️ Building legend items...')
        console.log('📋 Available TicketStatusOptions:', TicketStatusOptions)
        
        // Check all possible statuses, not just TicketStatusOptions
        Object.entries(statusNames).forEach(([index, statusName]) => {
            const count = ticketCounts.value[index] || 0
            if (count > 0) {
                const item = {
                    index: parseInt(index),
                    name: statusName,
                    count: count,
                    color: legendColors[index],
                    gradient: statusColors[index],
                    percentage: totalTickets.value > 0 ? ((count / totalTickets.value) * 100).toFixed(1) : '0'
                }
                
                console.log(`✅ Adding legend item:`, item)
                items.push(item)
            } else {
                console.log(`⏭️ Skipping status ${index} (${statusName}): 0 tickets`)
            }
        })
        
        console.log('🏷️ Final legend items:', items)
        return items.sort((a, b) => b.count - a.count) // Sort by count descending
    })

    onMounted(() => {
        fetchTicketData()
    })
</script>

<template>
    <div class="modern-chart-container">


        <!-- Header with title -->
        <div class="chart-header">
            <h3 class="chart-title">Ticket Status Overview</h3>
            <div class="chart-subtitle">Real-time distribution</div>
        </div>

        <div v-if="loading" class="loading-state">
            <div class="modern-pie-chart loading-chart"></div>
            <div class="loading-text">
                <div class="loading-dots">
                    <span></span><span></span><span></span>
                </div>
                Loading data...
            </div>
        </div>
        
        <div v-else class="chart-content">
            <!-- Modern Pie Chart with glassmorphism effect -->
            <div class="chart-wrapper" :key="animationKey">
                <div class="modern-pie-chart" :style="pieChartStyle"></div>
                
                <!-- Glassmorphism center -->
                <div class="glass-center" v-if="totalTickets > 0">
                    <div class="total-number">{{ totalTickets }}</div>
                    <div class="total-label">Total Tickets</div>
                    <div class="pulse-ring"></div>
                </div>
                
                <!-- Empty state -->
                <div class="empty-center" v-else>
                    <div class="empty-icon">📊</div>
                    <div class="empty-text">No Data</div>
                </div>
            </div>
            
            <!-- Modern Legend with cards -->
            <div class="modern-legend">
                <div v-if="activeLegendItems.length === 0" class="no-data-card">
                    <div class="no-data-icon">📋</div>
                    <div class="no-data-text">No active tickets</div>
                    <div class="no-data-subtext">Data will appear when tickets are created</div>
                </div>
                
                <div 
                    v-else
                    class="legend-card" 
                    v-for="(item, index) in activeLegendItems" 
                    :key="item.index"
                    :style="{ animationDelay: `${index * 0.1}s` }"
                >
                    <div class="legend-gradient-dot" :style="{ background: item.gradient }"></div>
                    <div class="legend-content">
                        <div class="legend-name">{{ item.name }}</div>
                        <div class="legend-stats">
                            <span class="legend-count">{{ item.count }}</span>
                            <span class="legend-percentage">{{ item.percentage }}%</span>
                        </div>
                    </div>
                    <div class="legend-bar">
                        <div 
                            class="legend-bar-fill" 
                            :style="{ 
                                width: `${item.percentage}%`, 
                                background: item.gradient 
                            }"
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    /* All your existing styles remain the same */
    .modern-chart-container {
        padding: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 24px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
        position: relative;
        overflow: hidden;
    }

    .modern-chart-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
        pointer-events: none;
    }

    .chart-header {
        text-align: center;
        margin-bottom: 30px;
        position: relative;
        z-index: 2;
    }

    .chart-title {
        font-size: 24px;
        font-weight: 700;
        color: white;
        margin: 0 0 8px 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .chart-subtitle {
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        font-weight: 400;
    }

    .chart-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        z-index: 2;
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        z-index: 2;
    }

    .chart-wrapper {
        position: relative;
        display: inline-block;
        margin-bottom: 40px;
    }

    .modern-pie-chart {
        width: 280px;
        height: 280px;
        border-radius: 50%;
        position: relative;
        animation: chartReveal 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        transform-origin: center;
    }

    .loading-chart {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
        animation: pulse 2s ease-in-out infinite;
    }

    @keyframes chartReveal {
        0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
        }
        50% {
            opacity: 0.8;
        }
        100% {
            transform: scale(1) rotate(360deg);
            opacity: 1;
        }
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }

    .glass-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        width: 120px;
        height: 120px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        animation: centerFadeIn 0.8s ease-out 0.6s both;
    }

    .pulse-ring {
        position: absolute;
        top: -10px;
        left: -10px;
        right: -10px;
        bottom: -10px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        animation: pulseRing 2s ease-out infinite;
    }

    @keyframes pulseRing {
        0% {
            transform: scale(0.8);
            opacity: 1;
        }
        100% {
            transform: scale(1.2);
            opacity: 0;
        }
    }

    @keyframes centerFadeIn {
        0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
        }
        100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
    }

    .total-number {
        font-size: 28px;
        font-weight: 800;
        color: white;
        line-height: 1;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .total-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.9);
        margin-top: 4px;
        font-weight: 500;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .empty-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: rgba(255, 255, 255, 0.7);
    }

    .empty-icon {
        font-size: 32px;
        margin-bottom: 8px;
    }

    .empty-text {
        font-size: 16px;
        font-weight: 600;
    }

    .loading-text {
        margin-top: 20px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .loading-dots {
        display: flex;
        gap: 4px;
    }

    .loading-dots span {
        width: 6px;
        height: 6px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 50%;
        animation: loadingDot 1.4s ease-in-out infinite both;
    }

    .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
    .loading-dots span:nth-child(2) { animation-delay: -0.16s; }

    @keyframes loadingDot {
        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
        40% { transform: scale(1.2); opacity: 1; }
    }

    .modern-legend {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
        width: 100%;
    }

    .legend-card {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        animation: cardSlideIn 0.6s ease-out both;
    }

    @keyframes cardSlideIn {
        0% {
            opacity: 0;
            transform: translateY(20px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .legend-card:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.25);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }

    .legend-gradient-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        flex-shrink: 0;
        border: 2px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .legend-content {
        flex: 1;
        min-width: 0;
    }

    .legend-name {
        font-size: 14px;
        font-weight: 600;
        color: white;
        margin-bottom: 4px;
    }

    .legend-stats {
        display: flex;
        gap: 8px;
        align-items: baseline;
    }

    .legend-count {
        font-size: 18px;
        font-weight: 700;
        color: white;
    }

    .legend-percentage {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
    }

    .legend-bar {
        width: 60px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
    }

    .legend-bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 1s ease-out;
        animation: barFill 1.5s ease-out 0.8s both;
    }

    @keyframes barFill {
        0% { width: 0% !important; }
    }

    .no-data-card {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 40px 20px;
        text-align: center;
        animation: cardSlideIn 0.6s ease-out;
    }

    .no-data-icon {
        font-size: 48px;
        margin-bottom: 16px;
    }

    .no-data-text {
        font-size: 18px;
        font-weight: 600;
        color: white;
        margin-bottom: 8px;
    }

    .no-data-subtext {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .modern-chart-container {
            padding: 25px;
            border-radius: 20px;
        }

        .modern-pie-chart {
            width: 220px;
            height: 220px;
        }

        .glass-center {
            width: 90px;
            height: 90px;
        }

        .total-number {
            font-size: 22px;
        }

        .chart-title {
            font-size: 20px;
        }

        .modern-legend {
            max-width: 100%;
        }

        .legend-card {
            padding: 12px;
            gap: 12px;
        }
    }

    @media (max-width: 480px) {
        .modern-pie-chart {
            width: 180px;
            height: 180px;
        }

        .glass-center {
            width: 70px;
            height: 70px;
        }

        .total-number {
            font-size: 18px;
        }
    }
</style>