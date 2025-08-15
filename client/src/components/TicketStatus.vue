<script setup>
    // Import your existing functions (update the path as needed)
    // import { TicketStatusOptions, GetStatusName, GetStatusClass } from '@/composables/tickets'
    
    const props = defineProps(['status'])
    
    // Fixed status handling functions
    const GetStatusName = (status) => {
        switch(status) {
            case -2:
                return 'Cancelled'
            case -1:
                return 'Waiting Approval'
            case 0:
                return 'Submitted'
            case 1:
                return 'Approved'
            case 2:
                return 'Device Received'
            case 3:
                return 'Repairing'
            case 4:
                return 'Pending Payment'
            case 5:
                return 'Posted to Customer'
            case 6:
                return 'Completed'
            default:
                return 'Unknown'
        }
    }
    
    const GetStatusClass = (status) => {
        switch(status) {
            case -2:
                return 'cancelled'
            case -1:
                return 'waitapproval'
            case 0:
                return 'submitted'
            case 1:
                return 'approved'
            case 2:
                return 'receiveddevice'
            case 3:
                return 'repairing'
            case 4:
                return 'pendingpayment'
            case 5:
                return 'postedtocustomer'
            case 6:
                return 'completed'
            default:
                return 'unknown'
        }
    }
</script>

<template>
    <span :class="['ticket-status', GetStatusClass(props.status)]">{{ GetStatusName(props.status) }}</span>
</template>

<style>
    .ticket-status {
        border-radius: 5px;
        background-color: grey;
        color: white;
        font-size: 0.85em;
        padding: 5px 0.9em;
        text-align: center;
        font-weight: 900;
    }

    .ticket-status.cancelled {
        background-color: #666;
        color: white;
    }

    .ticket-status.waitapproval {
        background-color: rgba(var(--waitapproval), var(--alpha));
        color: rgb(var(--waitapproval));
    }

    .ticket-status.submitted {
        background-color: rgba(var(--submitted), var(--alpha));
        color: rgb(var(--submitted));
    }

    .ticket-status.approved {
        background-color: rgba(var(--approved), var(--alpha));
        color: rgb(var(--approved));
    }

    .ticket-status.receiveddevice {
        background-color: rgba(var(--receiveddevice), var(--alpha));
        color: rgb(var(--receiveddevice));
    }

    .ticket-status.repairing {
        background-color: rgba(var(--repairing), var(--alpha));
        color: rgb(var(--repairing));
    }

    .ticket-status.pendingpayment {
        background-color: rgba(var(--pendingpayment), var(--alpha));
        color: rgb(var(--pendingpayment));
    }

    .ticket-status.postedtocustomer {
        background-color: rgba(var(--postedtocustomer), var(--alpha));
        color: rgb(var(--postedtocustomer));
    }

    .ticket-status.completed {
        background-color: rgba(var(--completed), var(--alpha));
        color: rgb(var(--completed));
    }
</style>