<script setup>
    import { onMounted, ref, inject } from 'vue'
    import Graph from '@/components/Graph.vue'
    import TicketStatus from '@/components/TicketStatus.vue'
    import { timeSince } from '@/composables/time'
    import repairReference from '@/assets/repairReference.json'

    const axios = inject('axios')

    const recentBookings = ref([])
    const bookingStats = ref({})
    const loading = ref(false)
    const error = ref(null)
    const refreshTrigger = ref(0) // Add this missing variable

    // Fetch recent bookings and stats
    const fetchDashboardData = async () => {
        loading.value = true
        error.value = null

        try {
            // Fetch recent bookings (last 24 hours)
            const bookingsResponse = await axios.get('admin-recent-bookings-detailed')
            recentBookings.value = bookingsResponse.data

            // Fetch booking statistics
            const statsResponse = await axios.get('admin-booking-stats')
            bookingStats.value = statsResponse.data

            console.log('✅ Admin dashboard data loaded successfully!')
            console.log('Recent bookings:', recentBookings.value)
            console.log('Stats:', bookingStats.value)

        } catch (err) {
            console.error('❌ Failed to load dashboard data:', err)
            error.value = 'Failed to load dashboard data'
        } finally {
            loading.value = false
        }
        
        // Trigger graph refresh AFTER data is loaded
        refreshTrigger.value += 1
    }

    // Refresh data every 5 minutes
    let refreshInterval = null
    const startAutoRefresh = () => {
        refreshInterval = setInterval(() => {
            fetchDashboardData()
        }, 5 * 60 * 1000) // 5 minutes
    }

    // Cleanup on unmount
    import { onUnmounted } from 'vue'
    onUnmounted(() => {
        if (refreshInterval) {
            clearInterval(refreshInterval)
        }
    })

    onMounted(() => {
        fetchDashboardData()
        startAutoRefresh()
    })
</script>

<template>
    <main>
        <div class="container">
            <h1>Admin Dashboard</h1>
            
            <!-- Error message -->
            <div v-if="error" class="error-banner">
                {{ error }}
                <button @click="fetchDashboardData" class="retry-btn">Retry</button>
            </div>

            <!-- Loading indicator -->
            <div v-if="loading" class="loading">
                Loading dashboard data...
            </div>

            <!-- Quick Stats -->
            <h2>Quick Statistics</h2>
            <hr />
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">{{ bookingStats.count_24h || 0 }}</div>
                    <div class="stat-label">Last 24 Hours</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{{ bookingStats.count_7d || 0 }}</div>
                    <div class="stat-label">Last 7 Days</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{{ bookingStats.pending_approval || 0 }}</div>
                    <div class="stat-label">Pending Approval</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{{ bookingStats.in_progress || 0 }}</div>
                    <div class="stat-label">In Progress</div>
                </div>
            </div>

            <!-- Overview Graph -->
            <h2>Overview</h2>
            <hr />
            <div class="content">
                <Graph :refresh="refreshTrigger" />
            </div>

            <!-- Recent Bookings (Last 24 Hours) -->
            <h2>Recent Bookings <span class="subtitle">(Last 24 Hours)</span></h2>
            <hr />
            <div class="recent-bookings">
                <div v-if="recentBookings.length === 0 && !loading" class="no-bookings">
                    <p>No bookings in the last 24 hours</p>
                </div>
                
                <div v-else class="bookings-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Customer</th>
                                <th>Device</th>
                                <th>Repair</th>
                                <th>Status</th>
                                <th>Price</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="booking in recentBookings" :key="booking.id">
                                <td>
                                    <a :href="`/admin/tickets/${booking.id}`" class="ticket-link">
                                        #{{ booking.id }}
                                    </a>
                                </td>
                                <td>
                                    <div class="customer-info">
                                        <div class="customer-name">{{ booking.cust_name }}</div>
                                        <div class="customer-email">{{ booking.email }}</div>
                                    </div>
                                </td>
                                <td>{{ booking.brand }} {{ booking.displayName }}</td>
                                <td>{{ repairReference[booking.repair_name] || booking.repair_name }}</td>
                                <td>
                                    <TicketStatus :status="booking.status" />
                                </td>
                                <td class="price">${{ booking.price }}</td>
                                <td class="time-ago">{{ timeSince(booking.created_at) }} ago</td>
                                <td>
                                    <a :href="`/admin/tickets/${booking.id}`" class="view-btn">
                                        View
                                    </a>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Actions -->
            <h2>Actions</h2>
            <hr />
            <div id="actions" class="content">
                <a class="admin-action" href="/admin/devices">
                    <svg width="32" height="32" fill="currentColor" class="bi bi-phone" viewBox="0 0 16 16">
                        <path
                            d="M11 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H5z"
                        />
                        <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
                    </svg>
                    Manage Devices
                </a>
                <a class="admin-action" href="/admin/tickets">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        fill="currentColor"
                        class="bi bi-ticket-detailed"
                        viewBox="0 0 16 16"
                    >
                        <path
                            d="M4 5.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm0 5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5ZM5 7a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H5Z"
                        />
                        <path
                            d="M0 4.5A1.5 1.5 0 0 1 1.5 3h13A1.5 1.5 0 0 1 16 4.5V6a.5.5 0 0 1-.5.5 1.5 1.5 0 0 0 0 3 .5.5 0 0 1 .5.5v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 11.5V10a.5.5 0 0 1 .5-.5 1.5 1.5 0 1 0 0-3A.5.5 0 0 1 0 6V4.5ZM1.5 4a.5.5 0 0 0-.5.5v1.05a2.5 2.5 0 0 1 0 4.9v1.05a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-1.05a2.5 2.5 0 0 1 0-4.9V4.5a.5.5 0 0 0-.5-.5h-13Z"
                        />
                    </svg>
                    View All Tickets
                </a>
            </div>
        </div>
    </main>
</template>

<style scoped>
    h2 {
        text-align: left;
        margin-bottom: 15px;
    }

    .subtitle {
        font-size: 14px;
        color: #666;
        font-weight: normal;
    }

    /* Error and Loading States */
    .error-banner {
        background-color: #f8d7da;
        color: #721c24;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 20px;
        border: 1px solid #f5c6cb;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .retry-btn {
        background: #dc3545;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }

    .loading {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 20px;
    }

    /* Quick Stats */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
    }

    .stat-card {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        text-align: center;
    }

    .stat-number {
        font-size: 2em;
        font-weight: bold;
        color: #0083b5;
        margin-bottom: 5px;
    }

    .stat-label {
        color: #666;
        font-size: 14px;
    }

    /* Recent Bookings */
    .recent-bookings {
        margin-bottom: 40px;
    }

    .no-bookings {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 40px;
        background: #f8f9fa;
        border-radius: 8px;
    }

    .bookings-table {
        overflow-x: auto;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #eee;
    }

    th {
        background-color: #f8f9fa;
        font-weight: 600;
        color: #333;
    }

    .ticket-link {
        color: #0083b5;
        text-decoration: none;
        font-weight: 600;
    }

    .ticket-link:hover {
        text-decoration: underline;
    }

    .customer-info {
        min-width: 150px;
    }

    .customer-name {
        font-weight: 500;
        margin-bottom: 2px;
    }

    .customer-email {
        font-size: 12px;
        color: #666;
    }

    .price {
        font-weight: 600;
        color: #28a745;
    }

    .time-ago {
        color: #666;
        font-size: 12px;
    }

    .view-btn {
        background: #0083b5;
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        text-decoration: none;
        font-size: 12px;
        transition: background-color 0.2s;
    }

    .view-btn:hover {
        background: #006691;
    }

    /* Actions */
    #actions {
        display: flex;
        justify-content: center;
        padding: 25px;
        gap: 25px;
    }

    .admin-action {
        width: 100%;
        display: flex;
        flex-direction: column;
        max-width: 250px;
        height: 10em;
        justify-content: center;
        align-items: center;
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 900;
        font-size: 1.1em;
        transition: all 250ms ease-in-out;
        padding: 10px;
        box-shadow: -1px 7px 21px -2px rgba(0, 0, 0, 0.2);
        text-decoration: none;
    }

    .admin-action:nth-child(1) {
        background-color: #0083b5;
    }

    .admin-action:nth-child(2) {
        background-color: #08b98a;
    }

    .admin-action:hover {
        background-color: #d0ebff;
        color: #333;
    }

    .container {
        padding: 10px 35px;
    }

    .content {
        margin-bottom: 50px;
    }

    hr {
        margin-bottom: 20px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .bookings-table {
            font-size: 14px;
        }

        th, td {
            padding: 8px;
        }

        .customer-info {
            min-width: 120px;
        }

        #actions {
            flex-direction: column;
            align-items: center;
        }

        .admin-action {
            max-width: 300px;
            max-height: 100px;
        }
    }

    @media (max-width: 500px) {
        .stats-grid {
            grid-template-columns: 1fr;
        }
    }
</style>