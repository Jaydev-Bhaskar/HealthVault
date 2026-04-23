const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// GET /api/appointments/doctor/:id/slots
// Fetch available slots for a doctor on a specific date (Format query: ?date=YYYY-MM-DD)
router.get('/doctor/:id/slots', protect, async (req, res) => {
    try {
        const doctor = await User.findById(req.params.id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const dateStr = req.query.date; // e.g., '2026-05-15'
        if (!dateStr) return res.status(400).json({ message: 'Date is required' });

        const requestDate = new Date(dateStr);
        const dayOfWeek = requestDate.toLocaleDateString('en-US', { weekday: 'long' });

        // Check if doctor works on this day
        if (!doctor.availableDays.includes(dayOfWeek)) {
            return res.json([]);
        }

        // Generate slots
        const startHour = parseInt(doctor.availableTimeStart.split(':')[0]);
        const endHour = parseInt(doctor.availableTimeEnd.split(':')[0]);
        
        let allSlots = [];
        for (let h = startHour; h < endHour; h++) {
            const period = h >= 12 ? 'PM' : 'AM';
            const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            allSlots.push(`${displayH.toString().padStart(2, '0')}:00 ${period}`);
            allSlots.push(`${displayH.toString().padStart(2, '0')}:30 ${period}`);
        }

        // Fetch already booked slots for this date
        const bookedAppointments = await Appointment.find({ doctor: doctor._id, date: dateStr, status: 'scheduled' });
        const bookedSlots = bookedAppointments.map(a => a.timeSlot);

        // Filter available slots
        const availableSlots = allSlots.filter(s => !bookedSlots.includes(s));

        res.json({ slots: availableSlots });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/appointments/book
// Book an appointment and simulate payment
router.post('/book', protect, async (req, res) => {
    try {
        const { doctorId, date, timeSlot, type, amount, transactionId } = req.body;

        const doctor = await User.findById(doctorId);
        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

        // Create appointment
        const appointment = new Appointment({
            patient: req.user._id,
            doctor: doctorId,
            date,
            timeSlot,
            type,
            amountPaid: amount || doctor.consultationFee,
            paymentStatus: transactionId ? 'paid' : 'pending',
            transactionId: transactionId || 'MOCK_UPI_' + Date.now(),
            status: 'scheduled'
        });

        await appointment.save();
        res.status(201).json(appointment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/appointments/my-appointments
// Get upcoming appointments for the logged-in user (patient or doctor)
router.get('/my-appointments', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const query = user.role === 'doctor' ? { doctor: user._id } : { patient: user._id };

        const appointments = await Appointment.find(query)
            .populate('patient', 'name profilePhoto healthId')
            .populate('doctor', 'name specialty hospital doctorCode')
            .sort({ date: 1, timeSlot: 1 });

        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/appointments/mark-seen
// Doctor marks all their new appointments as seen (clears badge)
router.patch('/mark-seen', protect, async (req, res) => {
    try {
        await Appointment.updateMany(
            { doctor: req.user._id, isNewForDoctor: true },
            { $set: { isNewForDoctor: false } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/appointments/:id/cancel
// Cancel an appointment
router.post('/:id/cancel', protect, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        // Verify authorization: only the patient who booked it or the assigned doctor can cancel
        if (appointment.patient.toString() !== req.user._id.toString() && 
            appointment.doctor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
        }

        if (appointment.status === 'cancelled') {
            return res.status(400).json({ message: 'Appointment is already cancelled' });
        }

        if (appointment.status === 'completed') {
            return res.status(400).json({ message: 'Cannot cancel a completed appointment' });
        }

        appointment.status = 'cancelled';
        await appointment.save();

        res.json({ message: 'Appointment cancelled successfully', appointment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/appointments/:id/refund
// Refund an appointment payment (Doctor only)
router.post('/:id/refund', protect, async (req, res) => {
    try {
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can issue refunds' });
        }

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        if (appointment.doctor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to refund this appointment' });
        }

        if (appointment.paymentStatus === 'refunded') {
            return res.status(400).json({ message: 'Payment is already refunded' });
        }

        if (appointment.paymentStatus !== 'paid') {
            return res.status(400).json({ message: 'Only paid appointments can be refunded' });
        }

        appointment.paymentStatus = 'refunded';
        await appointment.save();

        res.json({ message: 'Refund processed successfully', appointment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;

