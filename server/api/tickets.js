const express = require('express')
const router = express.Router()
const connection = require('./db')

const Joi = require('joi')

router.post('/submitticket', async (req, res) => {
    const { data } = req.body

    const schema = Joi.object({
        phone_id: Joi.number().required(),
        repair_name: Joi.string().max(45).required(),
        phone_serial: Joi.string().min(1).max(45).required().label('Serial Number'),
        phone_pin: Joi.string().max(45).label('Pin Code').allow(null, ''),
        user_mobile: Joi.string()
            .min(8)
            .max(16)
            .pattern(/^[0-9+]+$/)
            .required()
            .label('Mobile Number'),
        address: Joi.string().min(1).max(128).required().label('Address Line 1'),
        address_apt: Joi.string().max(128).label('Address Suit/Apt').allow(null, ''),
        address_city: Joi.string().min(1).max(45).required().label('City/Suburb'),
        address_state: Joi.string().min(1).max(45).required().label('State'),
        address_post: Joi.number().max(9999).required().label('Postcode')
    })

    const { error, value } = schema.validate(data)
    if (error) {
        console.log(error)
        return res.status(400).json({ error: error.details[0].message })
    }

  
    if (!req.session.user || !req.session.user.accountid || req.session.user.accountid <= 0) {
    	return res.status(400).json({ error: 'Please sign in before submitting a ticket.' })
    }

    const accountId = req.session.user.accountid; // Use the real session data

    // * Find any existing bookings to prevent spam
    const [dupRows, dupFields] = await connection.promise().execute({
        sql: 'SELECT * FROM `tickets` WHERE account_id = ? AND status = -1',
        values: [accountId]
    })

    if (dupRows.length > 0) {
        return res.status(400).json({ error: 'Please wait for your previous booking to be accepted before submitting another.' })
    }

    console.log(data)

    // * Validate phone ID
    const [rows, fields] = await connection.promise().execute({
        sql: 'SELECT * FROM `devices` WHERE id = ? LIMIT 1',
        values: [data.phone_id],
        row: true
    })

    const phone = rows[0]
    if (phone) {
        // * Record current price of selected repair
        const price = phone[data.repair_name]
        data['price'] = price

        // * Insert new ticket
        const [result, errors] = await connection.promise().execute({
            sql: 'INSERT INTO `tickets` (account_id, phone_id, price, repair_name, phone_serial, phone_pin, user_mobile, address, address_apt, address_city, address_state, address_post) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            values: [
                accountId,
                data.phone_id,
                data.price,
                data.repair_name,
                data.phone_serial,
                data.phone_pin,
                data.user_mobile,
                data.address,
                data.address_apt,
                data.address_city,
                data.address_state,
                data.address_post
            ]
        })

        if (errors) {
            console.log('ERRORS', errors)
            return res.status(400).json({ error: 'sql error2' })
        }
        // * Confirm row was insertd
        if (result && result.affectedRows == 1) {
            return res.status(200).json({ success: 'good', ticket_id: result.insertId })
        }
    } else {
        return res.status(400).json({ error: 'Invalid phone was submitted. Please try again' })
    }

    return res.status(400).json({ error: 'Unknown' })
})



    router.get('/get-tickets', async (req, res) => {
    if (!req.session.user || req.session.user.authLevel < 1) {  // Should be < 1, not < 2
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const sql = `
    SELECT t.id, t.created_at, t.price, t.repair_name, t.phone_serial, t.phone_pin, t.user_mobile, 
    t.address, t.address_apt, t.address_city, t.address_state, t.address_post,
    t.assigned_to, t.status,
    cust.email, cust.fullname AS cust_name, d.brand, d.displayName, d.phoneid,
    staff.fullname AS staff_assigned, staff.id AS staff_assigned_id
    FROM tickets t
    INNER JOIN users cust ON t.account_id = cust.id 
    INNER JOIN users staff ON t.assigned_to = staff.id 
    INNER JOIN devices d ON t.phone_id = d.id ORDER BY t.created_at DESC`

    connection.query(sql, (error, results) => {
        if (error) {
            console.error(error)
            return
        }
        const tickets = JSON.stringify(results)
        res.status(200).json(tickets)
    })
})

//TODO: merge get-ticket and get-tickets in the same function, if /:ticketid provided use the WHERE clause
    router.post('/get-ticket', async (req, res) => {
    // Fix: Only one authorization check needed
    if (!req.session.user || req.session.user.authLevel < 1) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data } = req.body

    const schema = Joi.object({
        ticketid: Joi.number().required()
    })

    const { error, value } = schema.validate(data)
    if (error) {
        console.log(error)
        return res.status(400).json({ error: error.details[0].message })
    }

    let sql = `
        SELECT t.id, t.created_at, t.price, t.repair_name, t.phone_serial, t.phone_pin, t.user_mobile, 
        t.address, t.address_apt, t.address_city, t.address_state, t.address_post,
        t.assigned_to, t.status,
        cust.email, cust.fullname AS cust_name, d.brand, d.displayName, d.phoneid,
        staff.fullname AS staff_assigned, staff.id AS staff_assigned_id
        FROM tickets t 
        LEFT JOIN users cust ON t.account_id = cust.id 
        LEFT JOIN users staff ON t.assigned_to = staff.id 
        LEFT JOIN devices d ON t.phone_id = d.id 
    `

    if (data.ticketid > 0) {
        sql += '  WHERE t.id = ?'
        console.log('attached ticket id', data.ticketid)
    }
    sql += ' ORDER BY t.created_at DESC'

    const notesSQL = `SELECT tn.*, staff.fullname FROM ticket_notes tn INNER JOIN users staff ON tn.staff_id = staff.id  WHERE tn.deleted != 1`

    //* Fetch ticket data
    connection.query(
        {
            sql: sql,
            values: [data.ticketid]
        },
        (error, result) => {
            if (error) {
                console.error(error)
                return res.status(500).json({ error: 'Internal Server Error' })
            }

            if (result && result[0]) {
                let ticketData = result

                //* Fetch notes for ticket
                connection.query(
                    {
                        sql: notesSQL
                    },
                    (error, result) => {
                        if (error) {
                            console.error(error)
                            return res.status(500).json({ error: 'Internal Server Error' })
                        }

                        let ticketNotes = []
                        if (result && result[0]) {
                            ticketNotes = result
                        }

                        let tickets = []
                        for (let i = 0; i < ticketData.length; i++) {
                            let notes = []
                            for (const note of ticketNotes) {
                                if (note.ticket_id == ticketData[i].id) {
                                    notes.push(note)
                                }
                            }

                            ticketData[i]['notes'] = notes
                        }

                        if (data.ticketid > 0) {
                            res.status(200).json(ticketData[0])
                        } else {
                            res.status(200).json(ticketData)
                        }
                    }
                )
            } else {
                res.status(404).json({ error: 'Not Found' })
            }
        }
    )
})

// ------ GET TICKET FOR USER - NO ADMIN
router.post('/get-user-ticket', async (req, res) => {
    // Fix: Allow any authenticated user (authLevel 0+) to view their own tickets
    if (!req.session.user || req.session.user.authLevel < 0) {  // Changed from < 1 to < 0
        return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log('yep ur good to look at ticket')

    const { data } = req.body

    const schema = Joi.object({
        ticketid: Joi.number().required()
    })

    const { error, value } = schema.validate(data)
    if (error) {
        console.log(error)
        return res.status(400).json({ error: error.details[0].message })
    }

    let sql = `
        SELECT t.id, t.created_at, t.price, t.repair_name, t.phone_serial, t.phone_pin, t.user_mobile, 
        t.address, t.address_apt, t.address_city, t.address_state, t.address_post, t.status,
        cust.email, cust.fullname AS cust_name, d.brand, d.displayName, d.phoneid
        FROM tickets t
        INNER JOIN users cust ON t.account_id = cust.id 
        INNER JOIN devices d ON t.phone_id = d.id
        WHERE t.account_id = ? AND t.id = ?
    `

    // if (data.ticketid > 0) {
    //     sql += ' ` WHERE t.id = ?'
    // }

    const notesSQL = `
        SELECT tn.id, tn.ticket_id, tn.comment, tn.status_change, tn.created_at FROM ticket_notes tn 
        WHERE tn.deleted = 0 AND tn.staff_only = 0 AND tn.ticket_id = ? 
     `

    //* Fetch ticket data
    connection.execute(
        {
            sql: sql,
            values: [req.session.user.accountid, data.ticketid],
            row: true
        },
        (error, result) => {
            if (error) {
                console.error(error)
                return res.status(500).json({ error: 'Internal Server Error' })
            }

            if (result && result[0]) {
                let ticketData = result

                //* Fetch notes for ticket
                connection.execute(
                    {
                        sql: notesSQL,
                        values: [data.ticketid]
                    },
                    (error, result) => {
                        if (error) {
                            console.error(error)
                            return res.status(500).json({ error: 'Internal Server Error' })
                        }

                        let ticketNotes = []
                        // console.log('api:', result[0]);
                        if (result && result[0]) {
                            ticketNotes = result
                            // ticketData['notes'] = ticketNotes
                        }

                        let tickets = []
                        for (let i = 0; i < ticketData.length; i++) {
                            let notes = []
                            for (const note of ticketNotes) {
                                if (note.ticket_id == ticketData[i].id) {
                                    notes.push(note)
                                }
                            }

                            ticketData[i]['notes'] = notes
                        }

                        if (data.ticketid > 0) {
                            res.status(200).json(ticketData[0])
                        } else {
                            res.status(200).json(ticketData)
                        }
                    }
                )

                //   res.status(200).json(result[0]);
            } else {
                res.status(404).json({ error: 'Not Found' })
            }
        }
    )
})

    router.post('/toggle-note-visibility', async (req, res) => {
        if (!req.session.user || req.session.user.authLevel < 2 || !req.session.user.accountid) {
            return res.status(401).json({ error: 'Unauthorized' })
        }
        const { data } = req.body

        const schema = Joi.object({
            noteid: Joi.number().required()
        })
        const { error, value } = schema.validate(data)
        if (error) {
            console.log(error)
            return res.status(400).json({ error: error.details[0].message })
        }
        const [result, errors] = await connection.promise().execute({
            sql: 'UPDATE `ticket_notes` SET staff_only = 1 - staff_only WHERE id = ?',
            values: [data.noteid]
        })

        if (errors) {
            console.log('ERRORS', errors)
            return res.status(400).json({ error: 'sql error1' })
        }

        // * Confirm a row was updated
        if (result && result.affectedRows == 1) {
            return res.status(200).json({ success: 'Toggle note visibility' })
        }

        return res.status(400).json({ error: 'Error' })
    })

    router.post('/submit-ticket-comment', async (req, res) => {
        // Fix: Allow admin users (authLevel 1+) to submit comments
        if (!req.session.user || req.session.user.authLevel < 1 || !req.session.user.accountid) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        // Rest of your code stays exactly the same...
        const { data } = req.body

        if ('makeVisibleToCustomer' in data) {
            if (data.makeVisibleToCustomer == 1) {
                data.makeVisibleToCustomer = true
            } else {
                data.makeVisibleToCustomer = false
            }
        }


        const staff_only = data.makeVisibleToCustomer ? 0 : 1

        const schema = Joi.object({
            ticketid: Joi.number().required(),
            comment: Joi.string().max(300),
            status: Joi.number().required(),
            staffAssign: Joi.number().required(),
            makeVisibleToCustomer: Joi.bool()
        })

        const { error, value } = schema.validate(data)
        if (error) {
            console.log(error)
            return res.status(400).json({ error: error.details[0].message })
        }

        //TODO: Validate ticket using ticketid
        // const [dupRows, dupFields] = await connection.promise().execute({
        //     sql: 'SELECT * FROM `tickets` WHERE account_id = ? AND status = -1',
        //     values: [accountId],
        // })

        // if (dupRows.length > 0) {
        //     return res.status(400).json({ error: 'Please wait for your previous booking to be accepted before submitting another.' });
        // }

        console.log(data)

        // const phone = rows[0];
        // if (ticket) {

        // * Insert new ticket note
        const [result, errors] = await connection.promise().execute({
            sql: 'INSERT INTO `ticket_notes` (ticket_id, staff_id, comment, staff_only, status_change) VALUES (?,?,?,?,?)',
            values: [data.ticketid, req.session.user.accountid, data.comment, staff_only, data.status]
        })

        if (errors) {
            console.log('ERRORS', errors)
            return res.status(400).json({ error: 'sql error1' })
        }
        // * Confirm row was insertd
        if (result && result.affectedRows == 1) {
            let sqlUpdateTicket = ''
            let valuesUpdateTicket = []
            if (data.status > 0) {
                sqlUpdateTicket += `status=?`
                valuesUpdateTicket.push(data.status)
            }

            if (data.staffAsign > 0) {
                if (valuesUpdateTicket.length > 0) {
                    sqlUpdateTicket += ','
                }
                sqlUpdateTicket = 'assigned_to=? '
                valuesUpdateTicket.push(data.staffAsign)
            }

            if (valuesUpdateTicket.length > 0) {
                // * Update ticket with new status change and new staff assign
                const [result2, errors2] = await connection.promise().execute({
                    sql: 'UPDATE `tickets` SET ' + sqlUpdateTicket + ' WHERE id = ?',
                    values: [...valuesUpdateTicket, data.ticketid]
                })
                if (errors2) {
                    console.log('ERRORS', errors2)
                    return res.status(400).json({ error: 'sql error2' })
                }
            }

            return res.status(200).json({ success: 'good' })
        }

        return res.status(400).json({ error: 'Unknown' })
})

// Updated cancel-user-ticket endpoint that integrates with your existing admin notes system
    router.post('/cancel-user-ticket', async (req, res) => {
        if (!req.session.user || !req.session.user.accountid) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const { data } = req.body

        const schema = Joi.object({
            ticketid: Joi.number().required(),
            cancelReason: Joi.string().max(300).required().label('Cancel Reason')
        })

        const { error, value } = schema.validate(data)
        if (error) {
            console.log(error)
            return res.status(400).json({ error: error.details[0].message })
        }

        try {
            // First, verify this ticket belongs to the user and can be cancelled
            const [rows] = await connection.promise().execute({
                sql: 'SELECT * FROM tickets WHERE id = ? AND account_id = ? AND status = -1',
                values: [data.ticketid, req.session.user.accountid]
            })

            if (rows.length === 0) {
                return res.status(400).json({ 
                    error: 'Ticket not found or cannot be cancelled (may already be approved)' 
                })
            }

            // Start a transaction to ensure both operations succeed
            await connection.promise().beginTransaction()

            try {
                // 1. Cancel the ticket (set status to -2)
                const [result] = await connection.promise().execute({
                    sql: 'UPDATE tickets SET status = -2 WHERE id = ? AND account_id = ?',
                    values: [data.ticketid, req.session.user.accountid]
                })

                if (result.affectedRows !== 1) {
                    throw new Error('Failed to update ticket status')
                }

                // 2. Add a ticket note with the cancel reason
                // This integrates with your existing admin notes system
                const [noteResult] = await connection.promise().execute({
                    sql: `INSERT INTO ticket_notes (ticket_id, staff_id, comment, staff_only, status_change, created_at) 
                        VALUES (?, ?, ?, ?, ?, NOW())`,
                    values: [
                        data.ticketid,
                        req.session.user.accountid, // Use the customer's account ID
                        `🚫 Customer Cancellation: "${data.cancelReason}"`, // Clear formatting for admin view
                        0, // Make visible to both staff and customer (staff_only = 0)
                        -2 // Status change to cancelled
                    ]
                })

                if (noteResult.affectedRows !== 1) {
                    throw new Error('Failed to add cancel note')
                }

                // 3. Optional: Add a system note for admins only
                const [systemNoteResult] = await connection.promise().execute({
                    sql: `INSERT INTO ticket_notes (ticket_id, staff_id, comment, staff_only, status_change, created_at) 
                        VALUES (?, ?, ?, ?, ?, NOW())`,
                    values: [
                        data.ticketid,
                        req.session.user.accountid,
                        `📊 System: Ticket automatically cancelled by customer. No further action required unless customer contacts support.`,
                        1, // Staff only note
                        -2
                    ]
                })

                // Commit the transaction
                await connection.promise().commit()

                return res.status(200).json({ 
                    success: 'Ticket cancelled successfully',
                    message: 'Your cancellation reason has been recorded and our team has been notified.'
                })

            } catch (transactionError) {
                // Rollback the transaction if anything fails
                await connection.promise().rollback()
                throw transactionError
            }

        } catch (error) {
            console.error('Cancel ticket error:', error)
            return res.status(500).json({ error: 'Internal server error' })
        }
    })

    // Optional: Add endpoint to get cancellation analytics for admin
    router.get('/cancellation-analytics', async (req, res) => {
        if (!req.session.user || req.session.user.authLevel < 1) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        try {
            const [rows] = await connection.promise().execute({
                sql: `SELECT 
                        tn.comment,
                        tn.created_at,
                        t.id as ticket_id,
                        u.fullname,
                        u.email,
                        d.displayName as device_name,
                        t.repair_name
                    FROM ticket_notes tn
                    INNER JOIN tickets t ON tn.ticket_id = t.id
                    INNER JOIN users u ON t.account_id = u.id
                    INNER JOIN devices d ON t.phone_id = d.id
                    WHERE tn.comment LIKE '%Customer Cancellation:%'
                    AND t.status = -2
                    ORDER BY tn.created_at DESC
                    LIMIT 100`
            })

            // Extract just the reason from the comment
            const analytics = rows.map(row => ({
                ...row,
                cancelReason: row.comment.replace('🚫 Customer Cancellation: "', '').replace('"', '')
            }))

            res.status(200).json(analytics)
        } catch (error) {
            console.error('Get cancellation analytics error:', error)
            res.status(500).json({ error: 'Internal server error' })
        }
    })

    router.delete('/delete-ticket-note/:noteid/:ticketid', async (req, res) => {
        // Fix: Allow admin users (authLevel 1+) to delete notes
        if (!req.session.user || req.session.user.authLevel < 1 || !req.session.user.accountid) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        if (!req.params.noteid || !req.params.ticketid) {
            return res.status(400).json({ error: 'Could not delete: Invalid ticket ID' })
        }

        const data = {
            noteid: req.params.noteid,
            ticketid: req.params.ticketid
        }

        const schema = Joi.object({
            noteid: Joi.number().required(),
            ticketid: Joi.number().required()
        })

        const { error, value } = schema.validate(data)
        if (error) {
            console.log(error)
            return res.status(400).json({ error: error.details[0].message })
        }

        // * Update ticket row
        const [result, errors] = await connection.promise().execute({
            // Use ticket_id to be 100% sure
            sql: 'UPDATE `ticket_notes` SET deleted=1 WHERE id = ? AND ticket_id = ?',
            values: [data.noteid, data.ticketid]
        })

        if (errors) {
            console.log('ERRORS', errors)
            return res.status(400).json({ error: 'sql error1' })
        }

        // * Confirm a row was updated
        if (result && result.affectedRows == 1) {
            return res.status(200).json({ success: 'Deleted note' })
        }
    })


    // Get recent bookings for admin dashboard (last 24 hours)
    router.get('/admin-recent-bookings', async (req, res) => {
        if (!req.session.user || req.session.user.authLevel < 1) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        try {
            // SQL query to get bookings from last 24 hours
            const sql = `
                SELECT 
                    t.id,
                    t.created_at,
                    t.price,
                    t.repair_name,
                    t.phone_serial,
                    t.status,
                    cust.email,
                    cust.fullname AS cust_name,
                    d.brand,
                    d.displayName,
                    d.phoneid
                FROM tickets t
                INNER JOIN users cust ON t.account_id = cust.id 
                INNER JOIN devices d ON t.phone_id = d.id
                WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY t.created_at DESC
                LIMIT 10
            `

            const [rows] = await connection.promise().execute(sql)
            
            console.log(`Found ${rows.length} recent bookings in last 24 hours`)
            
            res.status(200).json(rows)
            
        } catch (error) {
            console.error('Get recent bookings error:', error)
            res.status(500).json({ error: 'Internal server error' })
        }
    })

    // Alternative: Get recent bookings with more detailed info including notes count
    router.get('/admin-recent-bookings-detailed', async (req, res) => {
        if (!req.session.user || req.session.user.authLevel < 1) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        try {
            const sql = `
                SELECT 
                    t.id,
                    t.created_at,
                    t.price,
                    t.repair_name,
                    t.phone_serial,
                    t.user_mobile,
                    t.status,
                    cust.email,
                    cust.fullname AS cust_name,
                    d.brand,
                    d.displayName,
                    d.phoneid,
                    COUNT(tn.id) as notes_count,
                    COALESCE(staff.fullname, 'Unassigned') as staff_assigned
                FROM tickets t
                INNER JOIN users cust ON t.account_id = cust.id 
                INNER JOIN devices d ON t.phone_id = d.id
                LEFT JOIN ticket_notes tn ON t.id = tn.ticket_id AND tn.deleted = 0
                LEFT JOIN users staff ON t.assigned_to = staff.id
                WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                GROUP BY t.id, t.created_at, t.price, t.repair_name, t.phone_serial, 
                        t.user_mobile, t.status, cust.email, cust.fullname, 
                        d.brand, d.displayName, d.phoneid, staff.fullname
                ORDER BY t.created_at DESC
                LIMIT 15
            `

            const [rows] = await connection.promise().execute(sql)
            
            console.log(`Found ${rows.length} detailed recent bookings in last 24 hours`)
            
            res.status(200).json(rows)
            
        } catch (error) {
            console.error('Get detailed recent bookings error:', error)
            res.status(500).json({ error: 'Internal server error' })
        }
    })

    // Get booking statistics for admin dashboard
    router.get('/admin-booking-stats', async (req, res) => {
        if (!req.session.user || req.session.user.authLevel < 1) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        try {
            const statsQueries = [
                // Last 24 hours count
                `SELECT COUNT(*) as count_24h FROM tickets WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
                
                // Last 7 days count
                `SELECT COUNT(*) as count_7d FROM tickets WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
                
                // Pending approval count
                `SELECT COUNT(*) as pending_approval FROM tickets WHERE status = -1`,
                
                // In progress count
                `SELECT COUNT(*) as in_progress FROM tickets WHERE status BETWEEN 1 AND 5`,
                
                // Completed today
                `SELECT COUNT(*) as completed_today FROM tickets WHERE status = 6 AND DATE(created_at) = CURDATE()`
            ]

            const stats = {}
            
            for (let i = 0; i < statsQueries.length; i++) {
                const [rows] = await connection.promise().execute(statsQueries[i])
                const key = Object.keys(rows[0])[0]
                stats[key] = rows[0][key]
            }

            res.status(200).json(stats)
            
        } catch (error) {
            console.error('Get booking stats error:', error)
            res.status(500).json({ error: 'Internal server error' })
        }
    })

    // Add this endpoint to your tickets.js file

// Get ticket status summary for pie chart
router.get('/admin-ticket-status-summary', async (req, res) => {
    if (!req.session.user || req.session.user.authLevel < 1) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
        // Get count of tickets by status
        const sql = `
            SELECT 
                status,
                COUNT(*) as count
            FROM tickets 
            GROUP BY status
            ORDER BY status
        `

        const [rows] = await connection.promise().execute(sql)
        
        // Initialize all possible statuses with 0
        const statusCounts = {
            '-2': 0, // Cancelled
            '-1': 0, // Waiting Approval
            '0': 0,  // Submitted
            '1': 0,  // Approved
            '2': 0,  // Device Received
            '3': 0,  // Repairing
            '4': 0,  // Pending Payment
            '5': 0,  // Posted to Customer
            '6': 0   // Completed
        }

        // Fill in actual counts
        rows.forEach(row => {
            statusCounts[row.status.toString()] = row.count
        })

        console.log('Ticket status summary:', statusCounts)
        
        res.status(200).json(statusCounts)
        
    } catch (error) {
        console.error('Get ticket status summary error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

    // Alternative endpoint with more detailed breakdown
    router.get('/admin-ticket-analytics', async (req, res) => {
        if (!req.session.user || req.session.user.authLevel < 1) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        try {
            // Multiple analytics queries
            const queries = {
                // Status breakdown
                statusBreakdown: `
                    SELECT 
                        status,
                        COUNT(*) as count,
                        AVG(price) as avg_price,
                        SUM(price) as total_value
                    FROM tickets 
                    GROUP BY status
                    ORDER BY status
                `,
                
                // Device type breakdown
                deviceBreakdown: `
                    SELECT 
                        d.brand,
                        d.displayName,
                        COUNT(t.id) as count,
                        AVG(t.price) as avg_price
                    FROM tickets t
                    INNER JOIN devices d ON t.phone_id = d.id
                    GROUP BY d.brand, d.displayName
                    ORDER BY count DESC
                    LIMIT 10
                `,
                
                // Repair type breakdown
                repairBreakdown: `
                    SELECT 
                        repair_name,
                        COUNT(*) as count,
                        AVG(price) as avg_price
                    FROM tickets 
                    GROUP BY repair_name
                    ORDER BY count DESC
                `,
                
                // Monthly trends (last 6 months)
                monthlyTrends: `
                    SELECT 
                        DATE_FORMAT(created_at, '%Y-%m') as month,
                        COUNT(*) as count,
                        SUM(price) as total_value
                    FROM tickets 
                    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                    ORDER BY month
                `
            }

            const analytics = {}

            // Execute all queries
            for (const [key, sql] of Object.entries(queries)) {
                const [rows] = await connection.promise().execute(sql)
                analytics[key] = rows
            }

            // Process status breakdown for chart
            const statusCounts = {
                '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0
            }
            
            analytics.statusBreakdown.forEach(row => {
                statusCounts[row.status.toString()] = row.count
            })
            
            analytics.statusCounts = statusCounts

            console.log('Full analytics data prepared')
            
            res.status(200).json(analytics)
            
        } catch (error) {
            console.error('Get ticket analytics error:', error)
            res.status(500).json({ error: 'Internal server error' })
        }
    })

    // Calling account dashboard recent bookingdata
    router.get('/user-data/:accountId', async (req, res) => {
        if (!req.session.user || !req.session.user.accountid) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        // Security: Users can only access their own data
        const requestedAccountId = parseInt(req.params.accountId)
        if (req.session.user.accountid !== requestedAccountId) {
            return res.status(403).json({ error: 'Forbidden - can only access your own data' })
        }

        try {
            console.log(`Fetching user data for account ID: ${requestedAccountId}`)

            // Get user information
            const [userRows] = await connection.promise().execute({
                sql: 'SELECT id, fullname, email FROM users WHERE id = ? LIMIT 1',
                values: [requestedAccountId]
            })

            if (userRows.length === 0) {
                return res.status(404).json({ error: 'User not found' })
            }

            const userData = userRows[0]

            // Get user's own tickets
            const [ticketRows] = await connection.promise().execute({
                sql: `
                    SELECT 
                        t.id,
                        t.created_at,
                        t.price,
                        t.repair_name,
                        t.status,
                        t.phone_serial,
                        d.brand,
                        d.displayName
                    FROM tickets t
                    INNER JOIN devices d ON t.phone_id = d.id
                    WHERE t.account_id = ?
                    ORDER BY t.created_at DESC
                `,
                values: [requestedAccountId]
            })

            console.log(`Found ${ticketRows.length} tickets for user ${requestedAccountId}`)

            // Return both user data and ticket data
            const response = {
                userData: userData,
                ticketData: ticketRows
            }

            res.status(200).json(response)
            
        } catch (error) {
            console.error('Get user data error:', error)
            res.status(500).json({ error: 'Internal server error' })
        }
    })

module.exports = router
