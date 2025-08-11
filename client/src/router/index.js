import { inject } from 'vue'
import { axiosInstance, VueAxios } from './axios'

const axios = axiosInstance

import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

import PhoneListView from '../views/Repairs/PhoneListView.vue'
import BookingView from '../views/BookingView.vue'
import ContactView from '../views/ContactView.vue'
import ConfirmationView from '../views/ConfirmationView.vue'

// Account
import AccountDashboard from '../views/Account/Dashboard.vue'
import Signup from '../views/Account/SignupView.vue'
import Login from '../views/Account/LoginView.vue'
import VerifyView from '../views/Account/VerifyView.vue'

// Admin
import AdminDashboard from '../views/Admin/Dashboard.vue'
import DeviceListView from '../views/Admin/DeviceListView.vue'
import TicketsView from '../views/Admin/TicketsView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/admin',
            redirect: '/admin/dashboard',
            // component: () => import('@/views/Admin/Dashboard.vue'),
            meta: { requiredAuthLevel: 1 },
            children: [
                {
                    path: '',
                    redirect: 'admin/dashboard'
                },
                {
                    path: 'dashboard',
                    name: 'AdminDashboard',
                    // component: () => import('@/views/Admin/Dashboard.vue'),
                    component: AdminDashboard
                },
                {
                    path: 'devices',
                    name: 'AdminDevices',
                    // component: () => import('@/views/Admin/DeviceListView.vue'),
                    component: DeviceListView
                },
                {
                    path: 'tickets',
                    name: 'AdminTickets',
                    // component: () => import('@/views/Admin/TicketsView.vue'),
                    component: TicketsView
                }
            ]
        },

        {
            path: '/',
            name: 'home',
            component: HomeView
        },
        {
            path: '/repairs',
            name: 'deviceList',
            component: PhoneListView,
            meta: {
                title: 'Select your device'
            }
        },
        {
            path: '/booking/:phoneName/:repairName',
            name: 'booking',
            component: BookingView,
            props: true,
            beforeEnter: (to, from, next) => {
                // call api in the router so that the phone id (eg. 'iphone7plus') can be validated prior to loading the page
                // i can then pass that same data as a prop instead of calling it again in the component
                axios
                    .get('getphone/' + to.params.phoneName)
                    .then((response) => {
                        const phone = response.data
                        // ensure valid phone and valid repair
                        // if a repair column is $0 it should also return false (meaning that repair is not offered for that device)
                        if (phone) {
                            if (phone[to.params.repairName]) {
                                to.params.phone = phone
                                document.title = `${phone.displayName} ${
                                    to.params.repairName[0].toUpperCase() + to.params.repairName.slice(1)
                                } Repair`
                                next()
                            } else {
                                next(`/repairs/${phone.phoneid}`)
                            }
                        } else {
                            throw 'Invalid phone/repair'
                        }
                    })
                    .catch((e) => {
                        console.log('error', e)
                        next('/repairs')
                    })
            }
        },
        {
            path: '/about',
            name: 'about',
            // route level code-splitting
            // this generates a separate chunk (About.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import('../views/AboutView.vue')
        },
        {
            path: '/contact',
            name: 'contact',
            component: ContactView
            // component: () => import('../views/ContactView.vue')
        },
        {
            path: '/confirmation',
            name: 'confirmation',
            component: ConfirmationView
            // component: () => import('../views/ContactView.vue')
        },
        {
            path: '/account/register',
            name: 'signup',
            component: Signup
        },
        {
            path: '/account/',
            redirect: '/account/dashboard'
        },
        {
            path: '/account/dashboard',
            name: 'accountdashboard',
            component: AccountDashboard,
            meta: { requiredAuthLevel: 0 }
        },
        {
            path: '/account/login',
            name: 'login',
            component: Login
        },
        {
            path: '/account/logout',
            name: 'logout',
            component: () => import('../components/Logout.vue')
            // beforeEnter: async (to, from, next) => {
            //     axios.post('/api/logout')
            //     to.meta.userData = null
            //     to.meta.authLevel = 0
            //     next('/account/login')
            // }
        },
        {
            path: '/account/verify/:authtoken',
            name: 'verify',
            component: VerifyView,
            props: true
        },
        {
            path: '/:catchAll(.*)', // Match any URL
            redirect: '/' // Redirect to the home page
            //TODO: redirect to 404 instead?
        }
    ]
})


router.beforeEach(async (to, from, next) => {
    // Check if route requires authentication
    if (to.matched.some((record) => record.meta.requiredAuthLevel)) {
        try {
            const response = await axiosInstance.get('check-auth')
            const authLevel = response.data.authLevel
            const userData = response.data.userData
            
            console.log('=== Route Guard Debug ===')
            console.log('Route:', to.path)
            console.log('Required auth level:', to.meta.requiredAuthLevel)
            console.log('User auth level:', authLevel)
            console.log('User data:', userData)
            
            // Set user data on route meta for components to use
            to.meta.userData = userData
            
            if (authLevel >= to.meta.requiredAuthLevel) {
                console.log('✅ Access granted')
                next()
            } else {
                console.log('❌ Access denied - redirecting to login')
                next('/account/login')
            }
        } catch (error) {
            console.error('Auth check failed:', error)
            console.log('❌ Auth error - redirecting to login')
            next('/account/login')
        }
    } else {
        // Public route, no auth required
        next()
    }
})

import TicketViewAdmin from '../views/TicketViewAdmin.vue'
import TicketViewUser from '../views/TicketViewUser.vue'

console.log(router)
router.addRoute({
    path: '/admin/tickets/:ticketid',
    name: 'AdminTicketView',
    props: true,
    meta: { requiredAuthLevel: 1 },
    component: TicketViewAdmin,
    beforeEnter: (to, from, next) => {
        const data = {
            ticketid: to.params.ticketid
        }

        axios
            .post('get-ticket', { data })
            .then((data) => {
                console.log('TICKET DATA', data.data)
                to.params.ticket = data.data
                next()
            })
            .catch((e) => {
                console.log('error', e)
                next('/admin/tickets')
            })
    }
})

router.addRoute({
    path: '/account/ticket/:ticketid',
    name: 'UserTicketView',
    props: true,
    meta: { requiredAuthLevel: 0 },
    component: TicketViewUser,
    beforeEnter: (to, from, next) => {
        const data = {
            ticketid: to.params.ticketid
        }

        axios
            .post('get-user-ticket', { data })
            .then((data) => {
                console.log('TICKET DATA', data.data)
                to.params.ticket = data.data
                next()
            })
            .catch((e) => {
                console.log('error', e)
                // next('/account/dashboard')
            })
    }
})

import RepairListView from '../views/Repairs/RepairListView.vue'

router.addRoute({
    path: '/repairs/:phoneName',
    name: 'repairList',
    component: RepairListView,
    props: true,
    beforeEnter: (to, from, next) => {
        // call api in the router so that the phone id (eg. 'iphone7plus') can be validated prior to loading the page
        // i can then pass that same data as a prop instead of calling it again in the component
        axios
            .get('getphone/' + to.params.phoneName)  // Changed from '/api/getphone/'
            .then((response) => {
                const phone = response.data
                if (phone) {
                    to.params.phone = phone
                    document.title = `${phone.displayName} Repairs`
                    next()
                } else {
                    throw 'Invalid phone'
                }
            })
            .catch((e) => {
                console.log('error', e)
                next('/repairs')
            })
    }
})

export default router
