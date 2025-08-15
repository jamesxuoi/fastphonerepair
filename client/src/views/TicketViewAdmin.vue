<script setup>
    import { computed, inject, onMounted, ref } from 'vue'
    const axios = inject('axios')
    import { flashMessage } from '@smartweb/vue-flash-message'
    import { useRouter } from 'vue-router'
    import repairReference from '@/assets/repairReference.json'

    import TicketStatus from '@/components/TicketStatus.vue'
    const router = useRouter()

    const props = defineProps(['ticket'])

    import { convertTimeToLocal, timeSince } from '../composables/time'

    const notes = ref([])
    const loading = ref(false)
    const error = ref(null)

    const comment = ref('')
    const statusChange = ref(0)
    const staffAssignChange = ref(0)
    const makeVisibleToCustomer = ref(0)

    onMounted(() => {
        console.log('=== TicketViewAdmin Debug ===')
        console.log('Props ticket:', props.ticket)
        
        // Safely handle notes
        if (props.ticket && props.ticket.notes) {
            console.log('Ticket notes:', props.ticket.notes)
            notes.value = Array.isArray(props.ticket.notes) ? props.ticket.notes : []
        } else {
            console.warn('No notes found in ticket props')
            notes.value = []
        }
        
        // Safely handle status
        if (props.ticket && props.ticket.status !== undefined) {
            statusChange.value = parseInt(props.ticket.status)
            console.log('Ticket status:', props.ticket.status)
        } else {
            console.warn('No status found in ticket props')
            statusChange.value = 0
        }
    })

    import { GetStatusClass, TicketStatusOptions } from '@/composables/tickets'

    const getStatusSelectClass = computed(() => {
        try {
            return GetStatusClass(statusChange.value)
        } catch (err) {
            console.error('Error getting status class:', err)
            return 'unknown'
        }
    })

    const toggleVisible = async (noteIndex, id) => {
        if (loading.value) return
        
        loading.value = true
        error.value = null
        
        try {
            const data = { noteid: id }
            const response = await axios.post('toggle-note-visibility', { data })
            
            if (response.status === 200) {
                flashMessage.show({
                    type: 'success',
                    title: 'Success',
                    text: 'Successfully updated note visibility!'
                })

                // Safely toggle visibility
                if (notes.value[noteIndex]) {
                    notes.value[noteIndex].staff_only = 1 - notes.value[noteIndex].staff_only
                }
            }
        } catch (err) {
            console.error('Toggle visibility error:', err)
            const errorMessage = err.response?.data?.error || 'Failed to update note visibility'
            
            flashMessage.show({
                type: 'error',
                title: 'Error',
                text: errorMessage
            })
        } finally {
            loading.value = false
        }
    }

    const submitUpdate = async () => {
        if (loading.value) return
        
        if (!comment.value.trim()) {
            flashMessage.show({
                type: 'error',
                title: 'Error',
                text: 'Please enter a comment'
            })
            return
        }
        
        loading.value = true
        error.value = null

        try {
            const data = {
                ticketid: props.ticket.id,
                comment: comment.value,
                status: statusChange.value,
                staffAssign: staffAssignChange.value,
                makeVisibleToCustomer: makeVisibleToCustomer.value
            }

            console.log('Submitting update:', data)

            const response = await axios.post('submit-ticket-comment', { data })
            
            if (response.status === 200) {
                flashMessage.show({
                    type: 'success',
                    title: 'Success',
                    text: 'Successfully updated ticket!'
                })

                // Clear form
                comment.value = ''
                staffAssignChange.value = 0

                // Refresh notes by fetching updated ticket
                try {
                    const ticketResponse = await axios.post('get-ticket', { 
                        data: { ticketid: props.ticket.id } 
                    })
                    
                    if (ticketResponse.data && ticketResponse.data.notes) {
                        notes.value = Array.isArray(ticketResponse.data.notes) ? ticketResponse.data.notes : []
                        console.log('Updated notes:', notes.value)
                    }
                } catch (refreshError) {
                    console.error('Error refreshing notes:', refreshError)
                    // Don't show error to user, just log it
                }
            }
        } catch (err) {
            console.error('Submit update error:', err)
            const errorMessage = err.response?.data?.error || 'Failed to update ticket'
            
            flashMessage.show({
                type: 'error',
                title: 'Error',
                text: errorMessage
            })
        } finally {
            loading.value = false
        }
    }

    const deleteTicketNote = async (index, noteID, ticketID) => {
        if (!confirm(`Are you sure you want to delete ticket note #${noteID}?`)) {
            return
        }

        if (loading.value) return
        
        loading.value = true
        error.value = null

        try {
            const response = await axios.delete(`delete-ticket-note/${noteID}/${ticketID}`)
            
            if (response.status === 200) {
                flashMessage.show({
                    type: 'success',
                    title: 'Success',
                    text: `Successfully deleted note #${noteID}`
                })
                
                // Remove note from local array
                if (notes.value[index]) {
                    notes.value.splice(index, 1)
                }
            }
        } catch (err) {
            console.error('Delete note error:', err)
            const errorMessage = err.response?.data?.error || 'Failed to delete note'
            
            flashMessage.show({
                type: 'error',
                title: 'Error',
                text: errorMessage
            })
        } finally {
            loading.value = false
        }
    }

    // Safe helper function for displaying note author
    const getNoteAuthor = (note) => {
        if (!note) return 'Unknown'
        return note.fullname || 'System User'
    }

    // Safe helper function for note visibility
    const getNoteVisibility = (note) => {
        if (!note) return 'Unknown'
        return note.staff_only ? 'Staff Only' : 'Public'
    }
</script>

<template>
    <main>
        <h1>Ticket information #{{ props.ticket?.id || 'Unknown' }}</h1>

        <div class="container">
            <div v-if="error" class="error-banner">
                {{ error }}
            </div>

            <br />
            <h2>Customer Details</h2>
            <hr />
            <br />

            <div class="ticket-details">
                <div id="device-info">
                    <p><b>Device: </b>{{ props.ticket?.brand }} {{ props.ticket?.displayName }}</p>
                    <p><b>Repair: </b>{{ repairReference[props.ticket?.repair_name] || 'Unknown' }}</p>
                    <p><b>Quoted Price: </b>${{ props.ticket?.price || '0' }}</p>
                    <p><b>Serial No: </b>{{ props.ticket?.phone_serial || 'N/A' }}</p>
                    <p><b>Phone Pin: </b>{{ props.ticket?.phone_pin || 'N/A' }}</p>
                </div>
                <div id="customer-info">
                    <p><b>Customer Name: </b>{{ props.ticket?.cust_name || 'Unknown' }}</p>
                    <p><b>Customer Email: </b>{{ props.ticket?.email || 'Unknown' }}</p>
                    <p><b>Contact No. </b>{{ props.ticket?.user_mobile || 'Unknown' }}</p>
                    <p><b>Return Address: </b></p>
                    <p v-if="props.ticket">
                        {{ props.ticket.address }} {{ props.ticket.address_apt }}
                        <br />
                        {{ props.ticket.address_city }}, {{ props.ticket.address_state }}, {{ props.ticket.address_post }}
                    </p>
                </div>
            </div>

            <h2>Ticket Details</h2>
            <hr />
            <br />
            <p><b>Assigned To: </b>{{ props.ticket?.staff_assigned || 'Unassigned' }}</p>
            <p>
                <b>Current Status:</b>
                <TicketStatus :status="props.ticket?.status || 0" />
            </p>
            <br />
            
            <h2>Comments</h2>
            <hr />
            <br />

            <!-- Loading indicator -->
            <div v-if="loading" class="loading">
                Updating ticket...
            </div>

            <!-- Use Transition Group to animate changes in the notes array -->
            <TransitionGroup name="tickets" class="ticket-notes" tag="div">
                <!-- Static ticket submission note -->
                <div class="ticket" key="autogen">
                    <div class="ticket-row">
                        <TicketStatus :status="0" />
                        <span class="note-time">{{ timeSince(props.ticket?.created_at) }} Ago</span>
                    </div>
                    <div class="comment"><i>Ticket submitted, waiting for approval.</i></div>
                    <span class="note-author"><i>(Auto Generated)</i></span>
                </div>

                <!-- Dynamic notes -->
                <div 
                    class="ticket" 
                    v-for="(note, index) in notes" 
                    :key="note?.id || index"
                >
                    <div class="ticket-row">
                        <TicketStatus :status="note?.status_change || 0" />
                        <span class="note-time">{{ timeSince(note?.created_at) }} Ago</span>
                    </div>
                    <div class="comment">"{{ note?.comment || 'No comment' }}"</div>
                    <span class="note-author">&#8212; {{ getNoteAuthor(note) }}</span>
                    <div class="ticket-row">
                        <div>
                            <button 
                                @click="deleteTicketNote(index, note?.id, props.ticket?.id)" 
                                class="ticket-btn delete"
                                :disabled="loading"
                            >
                                Delete
                            </button>
                        </div>
                        <div>
                            <span class="note-visibility">{{ getNoteVisibility(note) }}</span>
                            <button 
                                @click="toggleVisible(index, note?.id)" 
                                class="tgl-visible" 
                                v-if="note?.staff_only == 1"
                                :disabled="loading"
                            >
                                Make Public
                            </button>
                            <button 
                                @click="toggleVisible(index, note?.id)" 
                                class="tgl-visible" 
                                v-if="note?.staff_only == 0"
                                :disabled="loading"
                            >
                                Make Staff Only
                            </button>
                        </div>
                    </div>
                </div>
            </TransitionGroup>
            <br />

            <h2>Leave note:</h2>
            <hr />
            <br />
            <form @submit.prevent="submitUpdate">
                <label for="status">Change Status:</label>
                <select 
                    :class="[getStatusSelectClass, 'ticket-status']" 
                    name="status" 
                    id="status" 
                    v-model="statusChange"
                    :disabled="loading"
                >
                    <option v-for="(value, index) in TicketStatusOptions" :value="index" :key="index">
                        {{ value }}
                    </option>
                </select>

                <label for="staffAssign">Assign to staff:</label>
                <select 
                    name="staffAssign" 
                    id="staffAssign" 
                    v-model="staffAssignChange"
                    :disabled="loading"
                >
                    <option value="0">(No Change)</option>
                    <option value="11">Bob repairman</option>
                </select>

                <label for="makePublic">Make visible to customer?</label>
                <input 
                    id="makePublic" 
                    type="checkbox" 
                    v-model="makeVisibleToCustomer"
                    :disabled="loading"
                />

                <textarea 
                    v-model="comment" 
                    cols="30" 
                    rows="10" 
                    required
                    :disabled="loading"
                    placeholder="Enter your comment here..."
                ></textarea>
                
                <input 
                    type="submit" 
                    value="Submit" 
                    :disabled="loading || !comment.trim()"
                />
            </form>
        </div>
    </main>
</template>

<style scoped>
    /* Your existing styles remain the same */
    select.ticket-status {
        border: none;
        outline: 0;
    }

    .tickets-move,
    .tickets-enter-active,
    .tickets-leave-active {
        transition: all 0.5s cubic-bezier(0.77, 0, 0.175, 1);
    }

    .tickets-enter-from,
    .tickets-leave-to {
        opacity: 0;
        transform: scaleY(1) translate(100%, 0%);
    }

    .tickets-leave-active {
        position: absolute;
    }

    .ticket-notes {
        position: relative;
    }

    .ticket-btn {
        outline: none;
        border: none;
        background: white;
        padding: 5px 10px;
        border-radius: 4px;
        margin: 5px;
        cursor: pointer;
        color: white;
        transition: all 250ms ease-in-out;
        font-weight: 700;
    }

    .ticket-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .ticket-btn.delete {
        background-color: rgba(230, 40, 40);
        color: white;
    }

    .tgl-visible {
        outline: none;
        border: none;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        color: rgb(106, 106, 234);
        transition: all 250ms ease-in-out;
        font-weight: 500;
        text-decoration: underline;
        text-align: right;
        margin: 0;
        padding: 0;
    }

    .tgl-visible:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .ticket-btn:hover:not(:disabled) {
        box-shadow: 0px 7px 18px -3px rgba(0, 0, 0, 0.1);
        filter: brightness(80%);
    }

    .tgl-visible:hover:not(:disabled) {
        color: blue;
    }

    /* New styles for error handling and loading */
    .error-banner {
        background-color: #f8d7da;
        color: #721c24;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 20px;
        border: 1px solid #f5c6cb;
    }

    .loading {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 20px;
    }

    textarea:disabled,
    select:disabled,
    input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    textarea {
        text-align: left;
        padding: 15px;
    }

    select {
        margin-top: 5px;
        margin-bottom: 25px;
        display: block;
        height: 50px;
        width: 100%;
        max-width: 350px;
        border-radius: 5px;
        text-align: center;
        font-size: 18px;
    }

    .ticket-row {
        display: flex;
        justify-content: space-between;
    }

    .ticket {
        border-radius: 5px;
        width: 100%;
        padding: 25px;
        min-height: 150px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        margin: 15px 0;
        box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.2);
    }

    .ticket .comment {
        padding: 25px 0;
    }

    .note-time {
        font-size: 12px;
        color: rgb(198, 185, 185);
        text-align: right;
        display: block;
    }

    .note-author,
    .note-visibility {
        display: block;
        text-align: right;
        font-size: 14px;
    }

    h2 {
        text-align: left;
    }

    .ticket-details {
        display: flex;
        justify-content: space-between;
        padding: 50px;
    }

    @media only screen and (max-width: 1110px) {
        .ticket-details {
            padding: 0;
        }
    }

    p {
        margin: 5px;
    }

    p b {
        font-weight: bold;
    }

    .container {
        text-align: left;
        padding: 25px;
        max-width: 900px;
        margin: 0 auto;
    }
</style>