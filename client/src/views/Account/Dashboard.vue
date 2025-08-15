<script setup>
    import { onMounted, ref, inject } from 'vue'
    import TicketStatus from '@/components/TicketStatus.vue'
    import { useRoute, useRouter } from 'vue-router'
    import repairReference from '@/assets/repairReference.json'

    const axios = inject('axios')

    import { timeSince } from '../../composables/time'

    const router = useRouter()
    const route = useRoute()

    const userInfo = ref({
        fullname: '',
        email: '',
        authLevel: 0
    })
    const tickets = ref([])

    // Cancel modal reactive variables
    const showCancelModal = ref(false)
    const cancelTicketId = ref(null)
    const cancelComment = ref('')

    const quickReasons = [
        'Found a better repair service',
        'Decided to buy a new phone instead',
        'Fixed the issue myself',
        'Changed my mind about the repair',
        'Price is too high',
        'Taking too long to get approved',
        'Need phone back urgently',
        'Going with insurance claim instead'
    ]

   const GetAccountData = () => {
    console.log('=== Dashboard Debug ===')
    
    // First get the current user's auth info
    axios.get('check-auth')
        .then((authResponse) => {
            console.log('Auth response:', authResponse.data)
            
            if (!authResponse.data.userData || !authResponse.data.userData.accountid) {
                console.error('No user data found, redirecting to login')
                router.push('/account/login')
                return
            }
            
            const accountId = authResponse.data.userData.accountid
            const authLevel = authResponse.data.userData.authLevel || 0
            console.log('Using account ID:', accountId)
            console.log('User auth level:', authLevel)
            
            // Set user info from auth response (including authLevel)
            userInfo.value.fullname = authResponse.data.userData.fullname
            userInfo.value.email = authResponse.data.userData.email
            userInfo.value.authLevel = authLevel  // Store auth level
            
            // For admin users (authLevel >= 1), get tickets differently
            if (authLevel >= 1) {
                console.log('🔧 Admin user detected - using admin recent bookings endpoint')
                return axios.get('admin-recent-bookings-detailed')
                    .then((ticketsResponse) => {
                        console.log('✅ Admin tickets loaded:', ticketsResponse.data)
                        // Transform admin ticket format to match user dashboard format
                        tickets.value = ticketsResponse.data.map(ticket => ({
                            id: ticket.id,
                            created_at: ticket.created_at,
                            price: ticket.price,
                            repair_name: ticket.repair_name,
                            status: ticket.status,
                            phone_serial: ticket.phone_serial,
                            brand: ticket.brand,
                            displayName: ticket.displayName,
                            // Admin-specific fields
                            customer_name: ticket.cust_name,
                            customer_email: ticket.email
                        }))
                        console.log('✅ Transformed tickets for admin dashboard:', tickets.value)
                    })
            } else {
                console.log('👤 Regular user detected - using user-data endpoint')
                // For regular users, use the existing endpoint
                return axios.get(`user-data/${accountId}`)
                    .then((response) => {
                        console.log('✅ User data API Success!')
                        console.log('Response data:', response.data)
                        
                        let data = response.data
                        
                        if (typeof data === 'string') {
                            console.log('⚠️ Data is a string, trying to parse...')
                            try {
                                data = JSON.parse(data)
                            } catch (parseError) {
                                console.error('❌ JSON parse failed:', parseError)
                                showNotification('error', 'Failed to parse response data')
                                return
                            }
                        }
                        
                        if (data && data.ticketData) {
                            tickets.value = data.ticketData
                            console.log('✅ User tickets loaded:', tickets.value)
                        } else {
                            console.log('⚠️ No ticketData in response, user has no tickets')
                            tickets.value = []
                        }
                    })
            }
        })
        .then(() => {
            console.log('✅ Dashboard data loading completed!')
            console.log('Final user info:', userInfo.value)
            console.log('Final tickets count:', tickets.value.length)
        })
        .catch((error) => {
            console.error('❌ Dashboard Error:', error)
            console.log('Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            })
            
            if (error.response && error.response.status === 401) {
                router.push('/account/login')
            } else {
                const errorMessage = error.response?.data?.error || error.message || 'Unknown error'
                showNotification('error', 'Failed to load account data: ' + errorMessage)
            }
        })
}

    const GetRecentBookings = () => {
        //
    }

    // Enhanced cancelTicket function with modal
    const cancelTicket = async (ticketId) => {
        cancelTicketId.value = ticketId
        cancelComment.value = ''
        showCancelModal.value = true
    }

    const selectQuickReason = (reason) => {
        cancelComment.value = reason
    }

    const closeCancelModal = () => {
        showCancelModal.value = false
        cancelTicketId.value = null
        cancelComment.value = ''
    }

    const confirmCancel = async () => {
        if (!cancelComment.value.trim()) {
            showNotification('error', 'Please provide a reason for canceling')
            return
        }

        try {
            const response = await axios.post('cancel-user-ticket', {
                data: { 
                    ticketid: cancelTicketId.value,
                    cancelReason: cancelComment.value.trim()
                }
            })

            if (response.status === 200) {
                showNotification('success', 'Ticket cancelled successfully. Thank you for your feedback!')
                closeCancelModal()
                GetAccountData() // Refresh the tickets list
            }
        } catch (error) {
            console.error('Cancel error:', error)
            const errorMessage = error.response?.data?.error || 'Failed to cancel ticket'
            showNotification('error', errorMessage)
        }
    }

    // Simple notification function
    const showNotification = (type, message) => {
        const notification = document.createElement('div')
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `
        notification.textContent = message
        document.body.appendChild(notification)
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification)
            }
        }, 3000)
    }

    //TODO: figure out how to re-use the admin's Ticket.vue

    onMounted(async () => {
        await router.isReady()
        GetAccountData()
    })
</script>

<template>
    <main>
        <div class="container">
            <h1>Account information</h1>
            <!-- Account details, name, address -->
            <!-- Table of their currently active bookings -->

            <div class="information">
                <div class="info-box">
                    <h3>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="22"
                            height="22"
                            fill="currentColor"
                            class="bi bi-person-circle"
                            viewBox="0 0 16 16"
                        >
                            <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                            <path
                                fill-rule="evenodd"
                                d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"
                            />
                        </svg>
                        Contact Information
                    </h3>
                    <div class="content">
                        <p>
                            <b>Name: </b><span>{{ userInfo.fullname }}</span>
                        </p>
                        <p>
                            <b>Email: </b><span>{{ userInfo.email }}</span>
                        </p>
                    </div>
                </div>

                <div class="info-box">
                    <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-key-fill" viewBox="0 0 16 16">
                            <path
                                d="M3.5 11.5a3.5 3.5 0 1 1 3.163-5H14L15.5 8 14 9.5l-1-1-1 1-1-1-1 1-1-1-1 1H6.663a3.5 3.5 0 0 1-3.163 2zM2.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
                            />
                        </svg>
                        Security
                    </h3>
                    <div class="content">
                        <p>
                            <a href="/account">Change Password</a>
                        </p>
                    </div>
                </div>
                <div class="info-box">
                    <h3>Recent Bookings</h3>
                    <div class="content" id="recent-tickets">
                        <table>
                            <thead>
                                <tr>
                                    <th class="small-col">ID</th>
                                    <th>Created At</th>
                                    <!-- <th>Last Updated</th> -->
                                    <th>Device</th>
                                    <th>Repair</th>
                                    <th>Status</th>
                                    <th class="small-col"></th>
                                </tr>
                            </thead>
                            
        <!-- In your Dashboard.vue template, replace the table row section -->
        <tr v-for="ticket in tickets" :key="ticket.id">
            <td class="small-col" data-label="Booking #">#{{ ticket.id }}</td>
            <td data-label="Submitted">{{ timeSince(ticket.created_at) }} Ago</td>
            <td data-label="Device">{{ ticket.displayName }}</td>
            <td data-label="Repair">{{ repairReference[ticket.repair_name] }} Replacement</td>
            <td data-label="Status"><TicketStatus :status="ticket.status" /></td>
            <td class="small-col">
                <!-- Conditional link based on user auth level -->
                <a 
                    :href="userInfo.authLevel >= 1 ? '/admin/tickets/' + ticket.id : '/account/ticket/' + ticket.id"
                    class="view-link"
                >
                    View
                </a>
                <!-- Add cancel button for waiting approval tickets (only for regular users) -->
                <button 
                    v-if="ticket.status === -1 && userInfo.authLevel < 1" 
                    @click="cancelTicket(ticket.id)"
                    class="cancel-btn"
                >
                    Cancel
                </button>
            </td>
        </tr>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cancel Modal -->
        <div v-if="showCancelModal" class="modal-overlay" @click="closeCancelModal">
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h3>Cancel Ticket #{{ cancelTicketId }}</h3>
                    <button class="close-btn" @click="closeCancelModal">&times;</button>
                </div>
                
                <div class="modal-body">
                    <p>Please help us understand why you're canceling this repair:</p>
                    
                    <!-- Quick reason buttons -->
                    <div class="quick-reasons">
                        <button 
                            v-for="reason in quickReasons" 
                            :key="reason"
                            @click="selectQuickReason(reason)"
                            class="reason-btn"
                            :class="{ active: cancelComment === reason }"
                        >
                            {{ reason }}
                        </button>
                    </div>
                    
                    <!-- Custom comment textarea -->
                    <textarea 
                        v-model="cancelComment"
                        placeholder="Or tell us your specific reason..."
                        rows="4"
                        maxlength="300"
                        class="comment-input"
                    ></textarea>
                    
                    <div class="char-count">
                        {{ cancelComment.length }}/300 characters
                    </div>
                    
                    <p class="note">
                        <strong>Note:</strong> Your reason will be shared with our team to help us improve our service.
                    </p>
                </div>
                
                <div class="modal-footer">
                    <button @click="closeCancelModal" class="btn-secondary">
                        Keep Ticket
                    </button>
                    <button 
                        @click="confirmCancel" 
                        class="btn-danger"
                        :disabled="!cancelComment.trim()"
                    >
                        Cancel Ticket
                    </button>
                </div>
            </div>
        </div>
    </main>
</template>

<style scoped>
    #recent-tickets {
        padding: 15px;
    }
    table thead th {
        background: none;
        color: #767676;
        border-bottom: 1px solid #ddd;
    }

    table {
        width: 100%;
        /* border: 1px solid lime; */
    }

    table tr {
        padding: 15px;
    }
    table td {
        padding: 8px;
    }

    * {
        /* border: 1px solid blue; */
    }

    h1 {
        margin-bottom: 50px;
    }
    .content a {
        color: #0083b5;
        /* text-decoration: underline; */
        text-underline-offset: 5px;
    }
    .information {
        display: flex;
        flex-basis: 50%;
        justify-content: center;
        flex-wrap: wrap;
        gap: 30px;
        /* row-gap: 25px; */
        /* column-gap: 25px; */
    }
    .container {
        min-height: 900px;
        max-width: 1200px;
        margin: 0 auto;
        padding: 25px;
        /* padding-top: 100px; */
    }
    .info-box {
        box-shadow: 0px 0px 5px -2px rgba(0, 0, 0, 0.4);
        /* max-width: 50%; */
        text-align: left;
        padding: 25px;
        border-radius: 10px;
        flex: calc(50% - 15px);
        min-width: 275px;
        font-size: 1em;
    }
    .info-box .content p b {
        font-weight: bold;
        margin-right: 4px;
    }
    h3 {
        display: flex;
        justify-content: flex-start;
        flex-direction: row;
        align-items: center;
        padding: 2px 0;
    }
    .info-box svg {
        margin-right: 5px;
        padding: 1px;
    }
    .info-box h3 {
        font-weight: bold;
        border-bottom: 1px solid #ddd;
        margin-bottom: 10px;
    }

    /* Enhanced cancel button styles */
    .cancel-btn {
        margin-left: 10px;
        color: red;
        background: none;
        border: 1px solid red;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 12px;
    }

    .cancel-btn:hover {
        background-color: red;
        color: white;
    }

    .status.cancelled {
        background-color: #666;
        color: white;
    }

    /* Modal styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-content {
        background: white;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .modal-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h3 {
        margin: 0;
        color: #333;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-btn:hover {
        color: #333;
    }

    .modal-body {
        padding: 20px;
    }

    .modal-body p {
        margin-bottom: 15px;
        color: #666;
    }

    .modal-body p.note {
        background: #f8f9fa;
        padding: 10px;
        border-radius: 4px;
        font-size: 14px;
        margin-top: 15px;
    }

    .quick-reasons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 15px;
    }

    .reason-btn {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        padding: 8px 12px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        text-align: center;
    }

    .reason-btn:hover {
        background: #e9ecef;
    }

    .reason-btn.active {
        background: #0083b5;
        color: white;
        border-color: #0083b5;
    }

    .comment-input {
        width: 100%;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 12px;
        font-family: inherit;
        resize: vertical;
        min-height: 100px;
        font-size: 14px;
    }

    .comment-input:focus {
        outline: none;
        border-color: #0083b5;
        box-shadow: 0 0 0 2px rgba(0, 131, 181, 0.1);
    }

    .char-count {
        text-align: right;
        font-size: 12px;
        color: #666;
        margin-top: 5px;
    }

    .modal-footer {
        padding: 20px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    .btn-secondary {
        background: #6c757d;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-secondary:hover {
        background: #5a6268;
    }

    .btn-danger {
        background: #dc3545;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-danger:hover:not(:disabled) {
        background: #c82333;
    }

    .btn-danger:disabled {
        background: #6c757d;
        cursor: not-allowed;
    }

    /* Responsive design for modal */
    @media (max-width: 600px) {
        .modal-content {
            width: 95%;
            margin: 10px;
        }
        
        .quick-reasons {
            justify-content: center;
        }
        
        .reason-btn {
            font-size: 12px;
            padding: 6px 10px;
        }
        
        .modal-footer {
            flex-direction: column;
        }
        
        .modal-footer button {
            width: 100%;
        }
    }
</style>