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
        email: ''
    })
    const tickets = ref([])

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
            console.log('Using account ID:', accountId)
            
            // Now get the user's detailed data
            return axios.get(`user-data/${accountId}`)
        })
        .then((response) => {
            console.log('✅ User data API Success!')
            console.log('Response data:', response.data)
            console.log('Response data type:', typeof response.data)
            
            // Handle the response
            let data = response.data
            if (typeof data === 'string') {
                console.log('⚠️ Data is a string, trying to parse...')
                try {
                    data = data.data
                } catch (parseError) {
                    console.error('❌ JSON parse failed:', parseError)
                    return
                }
            }
            
            console.log('Final data:', data)
            const { userData, ticketData } = data
            
            userInfo.value.fullname = userData.fullname
            userInfo.value.email = userData.email
            tickets.value = ticketData
            
            console.log('✅ Dashboard data loaded successfully!')
        })
        .catch((error) => {
            console.error('❌ Dashboard Error:', error)
            if (error.response && error.response.status === 401) {
                router.push('/account/login')
            }
        })
}

    const GetRecentBookings = () => {
        //
    }

    // Add this function to your Dashboard.vue script
    const cancelTicket = async (ticketId) => {
    if (!confirm('Are you sure you want to cancel this ticket? This action cannot be undone.')) {
        return
    }

    try {
        const response = await axios.post('cancel-user-ticket', {
            data: { ticketid: ticketId }
        })

        if (response.status === 200) {
            flashMessage.show({
                type: 'success',
                title: 'Success',
                text: 'Ticket cancelled successfully'
            })
            
            // Refresh the tickets list
            GetAccountData()
        }
    } catch (error) {
        console.error('Cancel error:', error)
        flashMessage.show({
            type: 'error',
            title: 'Error',
            text: error.response?.data?.error || 'Failed to cancel ticket'
        })
    }
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
                            
<!-- Update the tickets table, added cancel button -->
<tr v-for="ticket in tickets" :key="ticket.id">
    <td class="small-col" data-label="Booking #">#{{ ticket.id }}</td>
    <td data-label="Submitted">{{ timeSince(ticket.created_at) }} Ago</td>
    <td data-label="Device">{{ ticket.displayName }}</td>
    <td data-label="Repair">{{ repairReference[ticket.repair_name] }} Replacement</td>
    <td data-label="Status"><TicketStatus :status="ticket.status" /></td>
    <td class="small-col">
        <a :href="'/account/ticket/' + ticket.id">View</a>
        <!-- Add cancel button for waiting approval tickets -->
        <button 
            v-if="ticket.status === -1" 
            @click="cancelTicket(ticket.id)"
            class="cancel-btn"
            style="margin-left: 10px; color: red; background: none; border: 1px solid red; padding: 5px 10px; border-radius: 4px; cursor: pointer;"
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

    /* Add to cancel feature styles to Dashboard */
    .cancel-btn:hover {
        background-color: red;
        color: white;
    }

    .status.cancelled {
        background-color: #666;
        color: white;
    }

</style>
